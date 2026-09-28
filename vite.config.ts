import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages: the game (index.html) and the admin (admin.html, served at /admin on Vercel).
// The admin bundle carries supabase-js; the game bundle stays network-free.
export default defineConfig({
  plugins: [
    {
      name: "absolute-social-preview-urls",
      transformIndexHtml(html, context) {
        if (!context.filename.endsWith("index.html")) return html;

        const host =
          process.env.SITE_URL ||
          process.env.VERCEL_PROJECT_PRODUCTION_URL ||
          process.env.VERCEL_URL;
        if (!host) return html;

        const origin = new URL(
          /^https?:\/\//.test(host) ? host : `https://${host}`,
        ).origin;
        return html
          .replaceAll(
            'content="/og-image.png"',
            `content="${origin}/og-image.png"`,
          )
          .replace(
            "</head>",
            `    <meta property="og:url" content="${origin}/?today=1" />\n  </head>`,
          );
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        admin: fileURLToPath(new URL("admin.html", import.meta.url)),
      },
    },
  },
});
