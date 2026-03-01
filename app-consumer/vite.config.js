import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/auth": {
        target: process.env.VITE_AUTH_API_TARGET || "http://168.144.0.36:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/auth$/, "/auth"),
      },
    },
  },
});
