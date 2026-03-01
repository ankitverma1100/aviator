import { appConfig } from "./shared/config/appConfig";

export const config = {
  development: appConfig.env.isDevelopment,
  debug: true,
  appKey: "crash-0.1.0",
  api: appConfig.realtime.apiBase,
  wss: appConfig.realtime.socketIoUrl,
};
