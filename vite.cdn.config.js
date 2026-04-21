import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/index.js"),
      name: "JuvKsipSoftphone",
      fileName: () => "juv-ksip-softphone.cdn.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    assetsInlineLimit: 1024 * 1024 * 5,
    cssCodeSplit: false,
    outDir: "dist",
    emptyOutDir: false,
  },
});
