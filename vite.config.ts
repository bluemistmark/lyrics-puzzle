import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { fetchAllowed, isAllowed } from "./api/lookup.ts";

// Two pages: the game (index.html) and the admin (admin.html, served at /admin on Vercel).
// The admin bundle carries supabase-js; the game bundle stays network-free.
export default defineConfig({
  plugins: [
    {
      // The admin's 앨범 자동 채우기 also works with `npm run dev` (127.0.0.1 only, so the
      // admin check of the real /api/lookup is skipped).
      name: "dev-lookup-api",
      configureServer(server) {
        server.middlewares.use("/api/lookup", async (req, res) => {
          let body = "";
          for await (const chunk of req) body += chunk;
          const urls = (JSON.parse(body || "{}") as { urls?: unknown }).urls;
          res.setHeader("content-type", "application/json; charset=utf-8");
          if (!Array.isArray(urls) || !urls.every(isAllowed)) {
            res.statusCode = 400;
            return res.end(
              JSON.stringify({ error: "검색 주소가 올바르지 않아요." }),
            );
          }
          res.end(JSON.stringify({ results: await fetchAllowed(urls) }));
        });
      },
    },
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
