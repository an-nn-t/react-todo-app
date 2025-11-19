import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite";
import * as path from "path";  // ← 追加：path を使うため
                                
const repositoryName = "react-todo-app"; // ← 追加：GitHub Pages のリポジトリ名に合わせて変更

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // ▼▼ GitHub Pages 用の設定 ▼▼
  base: process.env.NODE_ENV === "production" ? `/${repositoryName}/` : "/",

  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        404: path.resolve(__dirname, "404.html"),
      },
    },
  },

  server: {
    port: 3000,
    strictPort: false,
    open: true,
  },
});
