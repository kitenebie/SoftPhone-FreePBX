import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import commonjs from "@rollup/plugin-commonjs";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/index.js"),
      name: "JuvKsipSoftphone",
      fileName: (format) => format === "umd"
        ? "juv-ksip-softphone.umd.js"
        : "juv-ksip-softphone.js",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      plugins: [
        commonjs({
          include: /node_modules/,
          transformMixedEsModules: true,
          requireReturnsDefault: "auto",
        }),
      ],
      external: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-draggable",
      ],
      output: [
        {
          format: "es",
          entryFileNames: "juv-ksip-softphone.js",
        },
        {
          format: "umd",
          name: "JuvKsipSoftphone",
          entryFileNames: "juv-ksip-softphone.umd.js",
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            "react-dom/client": "ReactDOM",
            "react/jsx-runtime": "React",
            "react/jsx-dev-runtime": "React",
            "react-draggable": "ReactDraggable",
          },
        },
      ],
    },
    assetsInlineLimit: 1024 * 1024 * 5,
    cssCodeSplit: false,
  },
});
