import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        "countdown-timer": resolve(import.meta.dirname, "src/entries/countdown-timer.ts"),
        "exit-intent-popup": resolve(
          import.meta.dirname,
          "src/entries/exit-intent-popup.ts"
        ),
        "fortune-wheel": resolve(import.meta.dirname, "src/entries/fortune-wheel.ts")
      },
      fileName: (_format, entryName) => `${entryName}.es.js`,
      formats: ["es"]
    },
    outDir: "dist/widgets",
    rollupOptions: {
      output: {
        chunkFileNames: "chunks/[name]-[hash].js"
      }
    },
    sourcemap: true,
    target: "es2020"
  }
});
