import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";
import Pages from "vite-plugin-pages";

const r = (p: string) => path.resolve(__dirname, p);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      Pages({
        importMode: "async",
      }),
    ],
    resolve: {
      alias: [
        { find: "@", replacement: r("./src") },

        /**
         * SANDBOX: wallet / payment SDKs are swapped for local stubs so the real
         * checkout and exchange components render without a chain, wallet or
         * Stripe account. Exact-match patterns only, so sibling entrypoints
         * (`wagmi/chains`, `wagmi/connectors`) still resolve to the real
         * packages — they are pure data/helpers and need no provider.
         */
        { find: /^wagmi$/, replacement: r("./src/sandbox/stubs/wagmi.ts") },
        {
          find: /^@reown\/appkit\/react$/,
          replacement: r("./src/sandbox/stubs/appkit-react.ts"),
        },
        {
          find: /^@stripe\/react-stripe-js$/,
          replacement: r("./src/sandbox/stubs/stripe-react.tsx"),
        },
        {
          find: /^@stripe\/stripe-js$/,
          replacement: r("./src/sandbox/stubs/stripe-js.ts"),
        },
        {
          find: /^@mysten\/dapp-kit$/,
          replacement: r("./src/sandbox/stubs/mysten-dapp-kit.ts"),
        },
      ],
    },
    base: "/",
  };
});
