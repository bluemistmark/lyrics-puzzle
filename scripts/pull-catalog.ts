// Supabase → src/catalog.ts. Runs before every Vercel build (see vercel.json);
// a validation issue fails the build so the previous deployment stays live.
import { buildCatalog } from "../src/data/build-catalog.ts";
import { NEWS_LIMIT, toNews } from "../src/data/releases.ts";
import { fetchReleases, fetchRows, fetchSettings } from "../src/data/rows.ts";
import { failOnIssues, summary, writeCatalogFile } from "./catalog-file.ts";
import { serviceClient } from "./env.ts";

const client = serviceClient();
const [rows, settings] = await Promise.all([
  fetchRows(client),
  fetchSettings(client),
]);
const { catalog, issues } = buildCatalog({ ...rows, settings });
failOnIssues(issues);
// Fetch extra rows: baseline releases without content are dropped by toNews.
const news = toNews(await fetchReleases(client, NEWS_LIMIT * 3));
await writeCatalogFile(catalog, news);
console.log(`src/catalog.ts 갱신: ${summary(catalog)} · 소식 ${news.length}`);
