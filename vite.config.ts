import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig, loadEnv, ConfigEnv } from "vite";
import Pages from "vite-plugin-pages";

export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [
      react(),
      Pages({
        importMode: "async",
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: "/",
    server:
      env.VITE_MODE === "development"
        ? {
            proxy: {
              "/api": env.VITE_BACKEND_URL,
            },
            port: env.VITE_CLIENT_URL.split(":")[2],
          }
        : undefined,
  };
});
