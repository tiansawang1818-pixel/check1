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
    // Monaco is intentionally loaded only when the advanced editor opens.
    chunkSizeWarningLimit: 2_400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
            return "editor";
          }
          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?react\//.test(id)
          ) {
            return "react";
          }
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("recharts") || id.includes("/d3-")) return "charts";
        },
      },
    },
  },
  server: { host: "127.0.0.1" },
});
