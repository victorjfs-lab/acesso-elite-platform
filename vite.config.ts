import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_APP_BASE_PATH || "/";

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return;
            }

            if (
              id.includes("react") ||
              id.includes("scheduler") ||
              id.includes("react-router")
            ) {
              return "react-vendor";
            }

            if (id.includes("@tanstack")) {
              return "query-vendor";
            }

            if (id.includes("@supabase")) {
              return "supabase-vendor";
            }

            if (id.includes("@radix-ui")) {
              return "radix-vendor";
            }

            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }

            return "vendor";
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
