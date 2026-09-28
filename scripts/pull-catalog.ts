// Supabase → src/catalog.ts. Runs before every Vercel build (see vercel.json);
// a validation issue fails the build so the previous deployment stays live.
import { buildCatalog } from "../src/data/build-catalog.ts";
import { fetchRows } from "../src/data/rows.ts";
import { failOnIssues, summary, writeCatalogFile } from "./catalog-file.ts";
import { serviceClient } from "./env.ts";

const { catalog, issues } = buildCatalog(await fetchRows(serviceClient()));
failOnIssues(issues);
await writeCatalogFile(catalog);
console.log(`src/catalog.ts 갱신: ${summary(catalog)}`);
