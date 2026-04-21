import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/index.js"),
      name: "JuvKsipSoftphone",
      fileName: "juv-ksip-softphone",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    // Inline assets (mp3 ringtones) as base64 so they bundle correctly
    assetsInlineLimit: 1024 * 1024 * 5,
    cssCodeSplit: false,
  },
});
