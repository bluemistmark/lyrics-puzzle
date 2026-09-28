// One-time migration: data/*.csv (Google Sheet snapshot) → Supabase.
//   --dry-run    validate only, touch nothing
//   --overwrite  allow running against tables that already have data (upserts by id; never deletes)
import { buildCatalog } from "../src/data/build-catalog.ts";
import { failOnIssues, summary } from "./catalog-file.ts";
import { serviceClient } from "./env.ts";
import { sheetRows } from "./sheet-rows.ts";

const dryRun = process.argv.includes("--dry-run");
const overwrite = process.argv.includes("--overwrite");

const rows = await sheetRows();
const { catalog, issues } = buildCatalog(rows);
failOnIssues(issues);
console.log(
  `시트: 가수 ${rows.artists.length} · 곡 ${rows.songs.length} · 문제 ${rows.questions.length}(사용 ${catalog.questions.length}) · 영어 사전 ${rows.dictionary.length}`,
);
console.log(`게시될 데이터: ${summary(catalog)}`);
if (dryRun) process.exit(0);

const client = serviceClient();
const { count, error } = await client
  .from("songs")
  .select("id", { count: "exact", head: true });
if (error) throw Error(`songs 확인 실패: ${error.message}`);
if (count && !overwrite) {
  console.error(
    `songs 테이블에 이미 ${count}곡이 있습니다. 어드민에서 수정한 내용을 덮어쓸 수 있으니, 정말 다시 옮기려면 --overwrite를 붙이세요.`,
  );
  process.exit(1);
}

async function upsert(table: string, data: object[], onConflict: string) {
  for (let i = 0; i < data.length; i += 500) {
    const { error } = await client
      .from(table)
      .upsert(data.slice(i, i + 500), { onConflict });
    if (error) throw Error(`${table} 저장 실패: ${error.message}`);
  }
  console.log(`${table}: ${data.length}행 저장`);
}
await upsert("artists", rows.artists, "name");
await upsert("songs", rows.songs, "id");
await upsert("dictionary", rows.dictionary, "english");
await upsert("questions", rows.questions, "id");
