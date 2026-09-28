// Supabase → src/catalog.ts. Runs before every Vercel build (see vercel.json);
// a validation issue fails the build so the previous deployment stays live.
import { buildCatalog } from "../src/data/build-catalog.ts";
import { NEWS_LIMIT, toNews } from "../src/data/releases.ts";
import { fetchReleases, fetchRows } from "../src/data/rows.ts";
import { failOnIssues, summary, writeCatalogFile } from "./catalog-file.ts";
import { serviceClient } from "./env.ts";

const client = serviceClient();
const { catalog, issues } = buildCatalog(await fetchRows(client));
failOnIssues(issues);
// Fetch extra rows: baseline releases without content are dropped by toNews.
const news = toNews(await fetchReleases(client, NEWS_LIMIT * 3));
await writeCatalogFile(catalog, news);
console.log(`src/catalog.ts 갱신: ${summary(catalog)} · 소식 ${news.length}`);
