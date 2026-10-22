import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import syntheticDemoLogin from "./tools/synthetic-demo-login.mjs";

export default defineConfig({
  plugins: [react(), syntheticDemoLogin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"]
        }
      }
    }
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001"
    }
  }
});
