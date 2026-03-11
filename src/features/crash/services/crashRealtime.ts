import { Client, Versions, type IMessage, type StompSubscription } from "@stomp/stompjs";

export type CrashConnectionStatus = "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED";

export type CrashPayload = {
  roundId?: string;
  state?: string;
  multiplier?: number;
  type?: string;
  user?: string;
  amount?: number;
  [key: string]: unknown;
};

export type CrashBetRow = {
  name: string;
  betAmount: number;
  cashOut: number;
  cashouted: boolean;
  target: number;
  img: string;
};

export type CrashRoundEvent = {
  type: "BET" | "CASHOUT";
  row: CrashBetRow;
};

type TopicSource = "multiplier" | "round";

type CrashRealtimeConfig = {
  brokerUrl: string;
  multiplierTopic: string;
  roundTopicPrefix?: string;
};

type CrashRealtimeHandlers = {
  onConnectionStatusChange?: (status: CrashConnectionStatus) => void;
  onMultiplierPayload?: (payload: CrashPayload) => void;
  onRoundPayload?: (payload: CrashPayload) => void;
  onRawMessage?: (source: TopicSource, rawMessage: string) => void;
};

export type CrashRealtimeConnection = {
  connect: () => void;
  disconnect: () => void;
  subscribeToRound: (roundId?: string) => void;
};

export function extractRoundUsers(payload: any): CrashBetRow[] | null {
  const rawRows =
    (Array.isArray(payload?.users) && payload.users) ||
    (Array.isArray(payload?.bettedUsers) && payload.bettedUsers) ||
    (Array.isArray(payload?.players) && payload.players) ||
    (Array.isArray(payload?.data?.users) && payload.data.users) ||
    (Array.isArray(payload?.data?.bettedUsers) && payload.data.bettedUsers) ||
    (Array.isArray(payload?.data?.players) && payload.data.players) ||
    null;
  if (!rawRows) {
    return null;
  }

  return rawRows.map((item: any) => ({
    name: String(item?.name || item?.userName || item?.username || "Player"),
    betAmount: Number(item?.betAmount || item?.bet || 0),
    cashOut: Number(item?.cashOut || item?.cashout || item?.win || 0),
    cashouted: Boolean(
      item?.cashouted ??
        item?.cashedOut ??
        item?.isCashOut ??
        Number(item?.cashOut || item?.cashout || item?.win || 0) > 0
    ),
    target: Number(item?.target || item?.resultX || 0),
    img: String(item?.img || item?.avatar || ""),
  }));
}

export function mapRoundEvent(payload: any): CrashRoundEvent | null {
  const eventType = String(payload?.type || "").toUpperCase();
  if (eventType !== "BET" && eventType !== "CASHOUT") {
    return null;
  }

  const user = String(payload?.user || "").trim();
  const amount = Number(payload?.amount ?? 0);
  if (!user || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const base: CrashBetRow = {
    name: user,
    betAmount: 0,
    cashOut: 0,
    cashouted: false,
    target: 0,
    img: "",
  };

  if (eventType === "BET") {
    return {
      type: "BET",
      row: {
        ...base,
        betAmount: amount,
      },
    };
  }

  const multiplier = Number(payload?.multiplier ?? 0);
  return {
    type: "CASHOUT",
    row: {
      ...base,
      cashOut: amount,
      cashouted: true,
      target: Number.isFinite(multiplier) ? multiplier : 0,
    },
  };
}

export function mergeRoundEventRows(prevRows: any[], event: CrashRoundEvent): any[] {
  const rows = Array.isArray(prevRows) ? [...prevRows] : [];
  const eventUser = String(event.row.name || "").toLowerCase();
  const existingIndex = rows.findIndex(
    (item) => String(item?.name || "").toLowerCase() === eventUser
  );

  if (event.type === "BET") {
    if (existingIndex >= 0) {
      rows[existingIndex] = {
        ...rows[existingIndex],
        ...event.row,
      };
      return rows;
    }
    return [event.row, ...rows];
  }

  if (existingIndex >= 0) {
    rows[existingIndex] = {
      ...rows[existingIndex],
      cashOut: event.row.cashOut,
      cashouted: true,
      target: event.row.target,
    };
    return rows;
  }

  return [event.row, ...rows];
}

function parsePayload(msg: IMessage): CrashPayload | null {
  try {
    return JSON.parse(msg.body) as CrashPayload;
  } catch {
    return null;
  }
}

export function createCrashRealtimeConnection(
  config: CrashRealtimeConfig,
  handlers: CrashRealtimeHandlers
): CrashRealtimeConnection {
  const roundTopicPrefix = config.roundTopicPrefix || "/topic/round:";
  let client: Client | null = null;
  let multiplierSubscription: StompSubscription | null = null;
  let roundSubscription: StompSubscription | null = null;
  let subscribedRoundTopic = "";

  const onConnectionStatusChange = handlers.onConnectionStatusChange || (() => {});
  const onRawMessage = handlers.onRawMessage || (() => {});

  const subscribeToRound = (roundId?: string) => {
    if (!client || !client.connected) {
      return;
    }

    const normalizedRoundId = String(roundId || "").trim();
    const nextTopic = normalizedRoundId ? `${roundTopicPrefix}${normalizedRoundId}` : "";
    if (!nextTopic) {
      roundSubscription?.unsubscribe();
      roundSubscription = null;
      subscribedRoundTopic = "";
      return;
    }

    if (subscribedRoundTopic === nextTopic) {
      return;
    }

    roundSubscription?.unsubscribe();
    roundSubscription = client.subscribe(nextTopic, (msg) => {
      const payload = parsePayload(msg);
      if (!payload) {
        onRawMessage("round", msg.body);
        return;
      }
      handlers.onRoundPayload?.(payload);
    });
    subscribedRoundTopic = nextTopic;
  };

  const connect = () => {
    onConnectionStatusChange("CONNECTING");

    client = new Client({
      brokerURL: config.brokerUrl,
      stompVersions: new Versions([Versions.V1_1, Versions.V1_0]),
      reconnectDelay: 2500,
      debug: () => {},
      onConnect: () => {
        onConnectionStatusChange("CONNECTED");
        if (!client) return;
        multiplierSubscription = client.subscribe(config.multiplierTopic, (msg) => {
          const payload = parsePayload(msg);
          if (!payload) {
            onRawMessage("multiplier", msg.body);
            return;
          }
          handlers.onMultiplierPayload?.(payload);
        });
      },
      onWebSocketClose: () => {
        onConnectionStatusChange("RECONNECTING");
      },
      onWebSocketError: () => {
        onConnectionStatusChange("RECONNECTING");
      },
      onStompError: () => {
        onConnectionStatusChange("RECONNECTING");
      },
    });

    client.activate();
  };

  const disconnect = () => {
    onConnectionStatusChange("DISCONNECTED");
    multiplierSubscription?.unsubscribe();
    multiplierSubscription = null;
    roundSubscription?.unsubscribe();
    roundSubscription = null;
    subscribedRoundTopic = "";
    client?.deactivate();
    client = null;
  };

  return {
    connect,
    disconnect,
    subscribeToRound,
  };
}
