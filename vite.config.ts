import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages: the game (index.html) and the admin (admin.html, served at /admin on Vercel).
// The admin bundle carries supabase-js; the game bundle stays network-free.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        admin: fileURLToPath(new URL("admin.html", import.meta.url)),
      },
    },
  },
});
