import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  root: ".",
  publicDir: "public",
  css: {
    modules: {
      generateScopedName: "[name]__[local]",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
