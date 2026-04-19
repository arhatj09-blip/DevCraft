import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
    middlewareMode: false,
  },
  appType: "spa",
  optimizeDeps: {
    include: ["react", "react-dom", "recharts", "react-is"],
  },
});
