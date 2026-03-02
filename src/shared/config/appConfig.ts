import legacyConfig from "../../config.json";

const trimSlash = (value: string) => value.replace(/\/+$/, "");
const withPath = (base: string, path: string) =>
  `${trimSlash(base)}${path.startsWith("/") ? path : `/${path}`}`;
const toWsProtocol = (url: string) => {
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
  return url;
};

const runtimeMode = process.env.REACT_APP_DEVELOPMENT;
const isDevelopment = runtimeMode === "true" || process.env.NODE_ENV === "development";

const fallbackRealtimeBase = isDevelopment
  ? legacyConfig.development_wss
  : legacyConfig.production_wss;
const fallbackPlatformApi = isDevelopment
  ? legacyConfig.development_api
  : legacyConfig.production_api;

const realtimeBase = trimSlash(process.env.REACT_APP_API_URL || fallbackRealtimeBase);
const gameServiceBase = trimSlash(process.env.REACT_APP_GAME_API_BASE || "https://games.rolex247.net");
const multiplierSocketUrl = trimSlash(
  process.env.REACT_APP_MULTIPLIER_SOCKET_URL || withPath(gameServiceBase, "/ws-game")
);
const multiplierWsUrl = trimSlash(
  process.env.REACT_APP_MULTIPLIER_WS_URL || withPath(toWsProtocol(gameServiceBase), "/ws-game")
);
const multiplierTopic = process.env.REACT_APP_MULTIPLIER_TOPIC || "/topic/multiplier";
const enableLegacySocketIo = false;
const enableLegacyApi = false;
const enableHistoryRestFallback = false;

export const appConfig = {
  env: {
    isDevelopment,
    mode: isDevelopment ? "development" : "production",
  },
  realtime: {
    socketIoUrl: realtimeBase,
    apiBase: withPath(realtimeBase, "/api"),
  },
  platform: {
    apiBase: trimSlash(process.env.REACT_APP_PLATFORM_API_BASE || fallbackPlatformApi),
  },
  game: {
    serviceBase: gameServiceBase,
    historyUrl: withPath(gameServiceBase, "/api/game/history"),
    multiplierSocketUrl,
    multiplierWsUrl,
    multiplierTopic,
  },
  features: {
    enableLegacySocketIo,
    enableLegacyApi,
    enableHistoryRestFallback,
  },
} as const;

export type AppConfig = typeof appConfig;
