import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

import manifest from "./manifest.config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    cors: {
      origin: [/^chrome-extension:\/\/.+$/, /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/]
    },
    hmr: {
      host: "localhost",
      port: 5173
    }
  },
  plugins: [react(), crx({ manifest })]
});
