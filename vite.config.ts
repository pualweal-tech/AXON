import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  server: {
    port: 5173,
    fs: {
      deny: [
        "**/data/**",
        "**/.git/**",
        "**/.env*",
        "**/*.{db,sqlite,crt,pem,key,p12,pfx,cer,der}",
        "**/.npmrc",
        "**/.yarnrc.yml",
      ],
    },
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: false,
      },
    },
  },
});
