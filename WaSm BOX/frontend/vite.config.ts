import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwind()],
  envDir: "..",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    // Monaco is intentionally isolated behind a lazy route. The build budget
    // script below still rejects oversized eager or ordinary route chunks.
    chunkSizeWarningLimit: 2400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll("\\", "/");
          if (!path.includes("/node_modules/")) return;
          if (
            path.includes("/node_modules/react/") ||
            path.includes("/node_modules/react-dom/") ||
            path.includes("/node_modules/react-router/") ||
            path.includes("/node_modules/react-router-dom/") ||
            path.includes("/node_modules/scheduler/")
          ) return "react-vendor";
          if (path.includes("/node_modules/@supabase/")) {
            return "supabase-vendor";
          }
          if (
            path.includes("/node_modules/recharts/") ||
            path.includes("/node_modules/d3-") ||
            path.includes("/node_modules/victory-vendor/")
          ) return "charts-vendor";
        },
      },
    },
  },
  server: { host: "127.0.0.1" },
});
