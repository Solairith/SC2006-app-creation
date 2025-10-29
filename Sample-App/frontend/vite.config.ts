import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",    // 👈 force IPv4 (avoids ::1 issues)
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000", // 👈 backend
        changeOrigin: true,
      },
    },
  },
});
