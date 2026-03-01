/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo } from "react";
import { UnityContext } from "react-unity-webgl";

const GAME_SESSION_KEY = "game";
const AUTH_RESULT_SESSION_KEY = "authResult";
const GAME_URL_SESSION_KEY = "gameUrl";

function parseSessionJson(key: string) {
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseMaybeJson(value: any) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeBalance(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return undefined;
}

function extractBalanceCurrency(source: any) {
  const parsedSource = parseMaybeJson(source);
  const nestedAuthResult = parseMaybeJson(parsedSource?.authResult);
  const candidates = [
    parsedSource,
    parsedSource?.wallet,
    parsedSource?.data,
    parsedSource?.data?.wallet,
    parsedSource?.result,
    parsedSource?.result?.wallet,
    nestedAuthResult,
    nestedAuthResult?.wallet,
    nestedAuthResult?.data,
    nestedAuthResult?.data?.wallet,
    nestedAuthResult?.result,
    nestedAuthResult?.result?.wallet,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const currency =
      typeof candidate.currency === "string" && candidate.currency.trim()
        ? candidate.currency
        : undefined;
    const balance = normalizeBalance(candidate.balance);

    if (typeof currency === "string" || typeof balance === "number") {
      return { currency, balance };
    }
  }

  return null;
}

function getWalletFromSessionStorage() {
  const authResult = parseSessionJson(AUTH_RESULT_SESSION_KEY);
  if (authResult) {
    const extracted = extractBalanceCurrency(authResult);
    if (extracted) {
      return extracted;
    }
  }

  const game = parseSessionJson(GAME_SESSION_KEY);
  if (game) {
    return extractBalanceCurrency(game);
  }

  return null;
}

function hasLaunchSessionData() {
  return Boolean(
    sessionStorage.getItem(GAME_SESSION_KEY) ||
      sessionStorage.getItem(AUTH_RESULT_SESSION_KEY) ||
      sessionStorage.getItem(GAME_URL_SESSION_KEY)
  );
}

function isStandaloneLaunchAllowed() {
  const forced = process.env.REACT_APP_ALLOW_STANDALONE === "true";
  if (forced) {
    return true;
  }

  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function getTrustedParentOrigins() {
  const trusted = new Set<string>();
  const configured = (process.env.REACT_APP_PARENT_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  configured.forEach((origin) => trusted.add(origin));

  if (document.referrer) {
    try {
      trusted.add(new URL(document.referrer).origin);
    } catch {
      // Ignore invalid referrer URL.
    }
  }

  return trusted;
}

export interface BettedUserType {
  name: string;
  betAmount: number;
  cashOut: number;
  cashouted: boolean;
  target: number;
  img: string;
}

export interface UserType {
  balance: number;
  currency: string;
  userType: boolean;
  img: string;
  userName: string;
  f: {
    auto: boolean;
    betted: boolean;
    cashouted: boolean;
    betAmount: number;
    cashAmount: number;
    target: number;
  };
  s: {
    auto: boolean;
    betted: boolean;
    cashouted: boolean;
    betAmount: number;
    cashAmount: number;
    target: number;
  };
}

export interface PlayerType {
  auto: boolean;
  betted: boolean;
  cashouted: boolean;
  betAmount: number;
  cashAmount: number;
  target: number;
}

interface GameBetLimit {
  maxBet: number;
  minBet: number;
}

declare interface GameHistory {
  createdAt: string | number | Date;
  flyAway: any;
  flyDetailID: any;
  _id: number;
  name: string;
  betAmount: number;
  cashoutAt: number;
  cashouted: boolean;
  date: number;
}

interface UserStatusType {
  fbetState: boolean;
  fbetted: boolean;
  sbetState: boolean;
  sbetted: boolean;
}

interface ContextDataType {
  myBets: GameHistory[];
  width: number;
  userInfo: UserType;
  fautoCashoutState: boolean;
  fautoCound: number;
  finState: boolean;
  fdeState: boolean;
  fsingle: boolean;
  fincrease: number;
  fdecrease: number;
  fsingleAmount: number;
  fdefaultBetAmount: number;
  sautoCashoutState: boolean;
  sautoCound: number;
  sincrease: number;
  sdecrease: number;
  ssingleAmount: number;
  sinState: boolean;
  sdeState: boolean;
  ssingle: boolean;
  sdefaultBetAmount: number;
  myUnityContext: UnityContext;
}

const unityContext = new UnityContext({
  loaderUrl: "unity/AirCrash.loader.js",
  dataUrl: "unity/AirCrash.data",
  frameworkUrl: "unity/AirCrash.framework.js",
  codeUrl: "unity/AirCrash.wasm",
  companyName: "Metaversity",
  productName: "Aviator",
  productVersion: "1.0.0",
});

const init_state = {
  myBets: [],
  width: 1500,
  userInfo: {
    balance: 0,
    currency: "INR",
    userType: false,
    img: "",
    userName: "",
    f: {
      auto: false,
      betted: false,
      cashouted: false,
      cashAmount: 0,
      betAmount: 20,
      target: 2,
    },
    s: {
      auto: false,
      betted: false,
      cashouted: false,
      cashAmount: 0,
      betAmount: 20,
      target: 2,
    },
  },
  fautoCashoutState: false,
  fautoCound: 0,
  finState: false,
  fdeState: false,
  fsingle: false,
  fincrease: 0,
  fdecrease: 0,
  fsingleAmount: 0,
  fdefaultBetAmount: 20,
  sautoCashoutState: false,
  sautoCound: 0,
  sincrease: 0,
  sdecrease: 0,
  ssingleAmount: 0,
  sinState: false,
  sdeState: false,
  ssingle: false,
  sdefaultBetAmount: 20,
  myUnityContext: unityContext,
} as ContextDataType;

const Context = React.createContext<any>(null!);

export const callCashOut = (at: number, index: "f" | "s") => {
  void at;
  void index;
};

export const Provider = ({ children }: any) => {
  const embedded = window.parent !== window;
  const standaloneAllowed = !embedded && isStandaloneLaunchAllowed();
  const allowAnyParentOrigin = process.env.REACT_APP_ALLOW_ANY_PARENT_ORIGIN === "true";
  const initialHasLaunchData = hasLaunchSessionData();
  const [launchState, setLaunchState] = React.useState(() => ({
    checkComplete: !embedded || initialHasLaunchData || standaloneAllowed,
    allowed: (embedded && initialHasLaunchData) || standaloneAllowed,
  }));

  const [state, setState] = React.useState<ContextDataType>(() => {
    try {
      const wallet = getWalletFromSessionStorage();
      if (!wallet) {
        return init_state;
      }

      const balance = wallet.balance;
      const currency = wallet.currency;

      if (typeof balance !== "number" && typeof currency !== "string") {
        return init_state;
      }

      return {
        ...init_state,
        userInfo: {
          ...init_state.userInfo,
          ...(typeof currency === "string" ? { currency } : {}),
          ...(typeof balance === "number" ? { balance } : {}),
        },
      };
    } catch {
      return init_state;
    }
  });
  const [unity, setUnity] = React.useState({
    unityState: false,
    unityLoading: false,
    currentProgress: 0,
  });
  const [gameState, setGameState] = React.useState({
    roundId: "",
    multiplier: 1,
    currentNum: 1,
    currentSecondNum: 1,
    GameState: "BET",
    roundEvent: "BETTING",
    time: Date.now(),
  });
  const applyRoundTick = React.useCallback(
    (tick: { roundId?: string; state?: string; multiplier?: number }) => {
      setGameState((prev) => {
        const incomingRoundId = tick.roundId ?? prev.roundId;
        const normalizedState = typeof tick.state === "string" ? tick.state.toUpperCase() : "";
        const mappedState =
          normalizedState === "BETTING" || normalizedState === "BET"
            ? "BET"
            : normalizedState === "RUNNING" || normalizedState === "PLAYING"
              ? "PLAYING"
              : normalizedState === "CRASHED" || normalizedState === "CRASH"
                ? "GAMEEND"
                : prev.GameState;

        const safeMultiplier =
          typeof tick.multiplier === "number" && Number.isFinite(tick.multiplier)
            ? Math.max(1, tick.multiplier)
            : prev.multiplier;
        const resolvedRoundEvent =
          normalizedState === "BETTING" || normalizedState === "BET"
            ? "BETTING"
            : normalizedState === "RUNNING"
              ? "RUNNING"
              : normalizedState === "CRASHED" || normalizedState === "CRASH"
                ? "CRASHED"
                : prev.roundEvent;

        if (mappedState === "BET") {
          if (
            incomingRoundId === prev.roundId &&
            prev.GameState === "BET" &&
            prev.roundEvent === "BETTING" &&
            prev.multiplier === 1
          ) {
            return prev;
          }

          return {
            ...prev,
            roundId: incomingRoundId,
            multiplier: 1,
            currentNum: 1,
            currentSecondNum: 1,
            GameState: "BET",
            roundEvent: "BETTING",
            time: Date.now(),
          };
        }

        if (
          incomingRoundId === prev.roundId &&
          mappedState === prev.GameState &&
          safeMultiplier === prev.multiplier &&
          resolvedRoundEvent === prev.roundEvent
        ) {
          return prev;
        }

        return {
          ...prev,
          roundId: incomingRoundId,
          multiplier: safeMultiplier,
          currentNum: safeMultiplier,
          currentSecondNum: safeMultiplier,
          GameState: mappedState,
          roundEvent: resolvedRoundEvent,
        };
      });
    },
    []
  );

  const [bettedUsers] = React.useState<BettedUserType[]>([]);
  const update = (attrs: Partial<ContextDataType>) => {
    setState((prev) => ({ ...prev, ...attrs }));
  };
  const [previousHand] = React.useState<any[]>([]);
  const [history] = React.useState<number[]>([]);
  const [networkStatus] = React.useState<"CONNECTED" | "DISCONNECTED">("DISCONNECTED");
  const [userBetState, setUserBetState] = React.useState<UserStatusType>({
    fbetState: false,
    fbetted: false,
    sbetState: false,
    sbetted: false,
  });
  const rechargeState = false;
  const [currentTarget, setCurrentTarget] = React.useState(0);
  const updateUserBetState = (attrs: Partial<UserStatusType>) => {
    setUserBetState((prev) => ({ ...prev, ...attrs }));
  };

  const betLimit: GameBetLimit = {
    maxBet: 1000,
    minBet: 1,
  };
  React.useEffect(function () {
    unityContext.on("GameController", function (message) {
      if (message === "Ready") {
        setUnity((prev) => ({
          currentProgress: Math.max(prev.currentProgress, 100),
          unityLoading: true,
          unityState: true,
        }));
      }
    });
    unityContext.on("progress", (progression) => {
      const currentProgress = Math.min(100, progression * 100);
      const readyByProgress = progression >= 0.9 || currentProgress >= 90;
      setUnity((prev) => {
        const nextReady = prev.unityLoading || readyByProgress;
        return {
          currentProgress: Math.max(prev.currentProgress, currentProgress),
          unityLoading: nextReady,
          unityState: nextReady,
        };
      });
    });
    return () => unityContext.removeAllEventListeners();
  }, []);

  React.useEffect(() => {
    const trustedParentOrigins = getTrustedParentOrigins();
    const notifyParentReady = () => {
      if (!window.parent || window.parent === window) {
        return;
      }

      window.parent.postMessage({ type: "AVIATOR_IFRAME_READY" }, "*");
    };

    notifyParentReady();
    const retryTimer = window.setTimeout(notifyParentReady, 600);
    const launchCheckTimer = window.setTimeout(() => {
      setLaunchState((prev) => {
        if (prev.checkComplete) {
          return prev;
        }

        const present = hasLaunchSessionData();
        return {
          checkComplete: true,
          allowed: (embedded && present) || standaloneAllowed,
        };
      });
    }, 2500);

    const onMessage = (event: MessageEvent) => {
      if (embedded && event.source !== window.parent) return;
      if (!allowAnyParentOrigin && embedded && !trustedParentOrigins.has(event.origin)) return;

      const rawData = event.data;
      let data: any = rawData;
      if (typeof rawData === "string") {
        try {
          data = JSON.parse(rawData);
        } catch {
          return;
        }
      }

      const { type, payload } = data || {};
      if (type === "VALIDATION_DATA_SYNC") {
        if (!payload) {
          setLaunchState({
            checkComplete: true,
            allowed: (embedded && hasLaunchSessionData()) || standaloneAllowed,
          });
          return;
        }

        try {
          if (payload.game === undefined || payload.game === null) {
            sessionStorage.removeItem(GAME_SESSION_KEY);
          } else {
            sessionStorage.setItem(GAME_SESSION_KEY, JSON.stringify(payload.game));
          }

          if (payload.authResult === undefined || payload.authResult === null) {
            sessionStorage.removeItem(AUTH_RESULT_SESSION_KEY);
          } else {
            const authResultValue =
              typeof payload.authResult === "string"
                ? payload.authResult
                : JSON.stringify(payload.authResult);
            sessionStorage.setItem(AUTH_RESULT_SESSION_KEY, authResultValue);
          }

          if (payload.gameUrl === undefined || payload.gameUrl === null) {
            sessionStorage.removeItem(GAME_URL_SESSION_KEY);
          } else {
            sessionStorage.setItem(GAME_URL_SESSION_KEY, String(payload.gameUrl));
          }

          setLaunchState({
            checkComplete: true,
            allowed: embedded || standaloneAllowed,
          });

          const extracted = extractBalanceCurrency(payload.authResult);
          if (extracted) {
            setState((prev) => ({
              ...prev,
              userInfo: {
                ...prev.userInfo,
                ...(typeof extracted.currency === "string"
                  ? { currency: extracted.currency }
                  : {}),
                ...(typeof extracted.balance === "number"
                  ? { balance: extracted.balance }
                  : {}),
              },
            }));
          }
        } catch {
          // Ignore storage write errors.
        }
      }

      if (type !== "WALLET_OVERRIDE") return;

      const { currency, balance } = payload || {};
      if (typeof currency !== "string" && typeof balance !== "number") return;

      setState((prev) => ({
        ...prev,
        userInfo: {
          ...prev.userInfo,
          ...(typeof currency === "string" ? { currency } : {}),
          ...(typeof balance === "number" ? { balance } : {}),
        },
      }));
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(retryTimer);
      window.clearTimeout(launchCheckTimer);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const getMyBets = async () => {
    return [];
  };

  const handleGetSeedOfRound = async (roundId: number) => {
    void roundId;
    return null;
  };

  const handleChangeUserSeed = () => {
    // Seed change integration is pending backend contract.
  };
  
  const updateUserInfo = (attrs: Partial<UserType>) => {
    setState((prevState) => ({
      ...prevState,
      userInfo: { ...prevState.userInfo, ...attrs },
    }));
  };
  
  const handleGetSeed = async (roundId: number) => {
    void roundId;
    return null;
  };
  
  const toggleMsgTab = () => {
    // Not connected in multiplier-only mode.
  };
  
  const [msgReceived, setMsgReceived] = React.useState(false);

  const roundStats = useMemo(() => {
    const players = bettedUsers.length;
    const totalBet = bettedUsers.reduce((sum, item) => sum + Number(item.betAmount || 0), 0);
    const totalCashOut = bettedUsers.reduce((sum, item) => sum + Number(item.cashOut || 0), 0);
    return { players, totalBet, totalCashOut };
  }, [bettedUsers]);

  return (
    <Context.Provider
      value={{
        state: state,
        ...betLimit,
        ...userBetState,
        ...unity,
        ...gameState,
        launchCheckComplete: launchState.checkComplete,
        launchAllowed: launchState.allowed,
        currentTarget,
        rechargeState,
        myUnityContext: unityContext,
        bettedUsers: [...bettedUsers],
        previousHand: [...previousHand],
        history: [...history],
        networkStatus,
        roundStats,
        setCurrentTarget,
        update,
        getMyBets,
        updateUserBetState,handleGetSeedOfRound,
        handleChangeUserSeed,  
        updateUserInfo,  
        handleGetSeed, 
        toggleMsgTab,  
        applyRoundTick,
        msgReceived,
        setMsgReceived, 
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default Context;
