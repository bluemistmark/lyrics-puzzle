import { useMemo, useState } from "react";
import type { DictionaryRow } from "../data/build-catalog.ts";
import { englishKey, scanLine, sortDictionary } from "../data/english.ts";
import { CsvButton } from "./CsvButton";
import { FormDialog } from "./FormDialog";
import { joinList, splitList } from "./ids";
import { SortHeader, useSortParam } from "./SortHeader";
import { useAdmin } from "./store";
import { byCode, byText, matchesQuery, shortTime, sortRows } from "./table.ts";
import { useRoute, useRouteParam } from "./useRoute";

const SORT_KEYS = ["english", "pronunciation", "used", "updated"] as const;

export function DictionaryTab() {
  const dictionary = useAdmin((s) => s.dictionary);
  const questions = useAdmin((s) => s.questions);
  const removeEntry = useAdmin((s) => s.removeEntry);
  const clearParams = useRoute((s) => s.clearParams);
  const [query, setQuery] = useRouteParam("q");
  const [sort, setSort] = useSortParam(SORT_KEYS, {
    key: "english",
    desc: false,
  });
  const [editing, setEditing] = useState<DictionaryRow | "new" | null>(null);

  // Active questions whose lyrics currently resolve to each entry (by englishKey).
  const usage = useMemo(() => {
    const sorted = sortDictionary(dictionary);
    const counts = new Map<string, number>();
    for (const q of questions) {
      if (!q.active) continue;
      const keys = new Set(
        q.lines.flatMap((line) =>
          scanLine(line, sorted)
            .tokens.filter((t) => t.pronunciation !== undefined)
            .map((t) => englishKey(t.text)),
        ),
      );
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [dictionary, questions]);
  const usedBy = (entry: DictionaryRow) =>
    usage.get(englishKey(entry.english)) ?? 0;

  const visible = useMemo(() => {
    const rows = [...dictionary]
      .sort((a, b) =>
        englishKey(a.english).localeCompare(englishKey(b.english)),
      )
      .filter((d) =>
        matchesQuery([d.english, d.pronunciation, ...d.alternatives], query),
      );
    const used = (d: DictionaryRow) => usage.get(englishKey(d.english)) ?? 0;
    const compare = {
      // Rows already come in English order.
      english: () => 0,
      pronunciation: (a: DictionaryRow, b: DictionaryRow) =>
        byText(a.pronunciation, b.pronunciation),
      used: (a: DictionaryRow, b: DictionaryRow) => used(a) - used(b),
      updated: (a: DictionaryRow, b: DictionaryRow) =>
        byCode(a.updated_at, b.updated_at),
    }[sort.key];
    return sortRows(rows, compare, sort.desc);
  }, [dictionary, query, sort, usage]);

  const remove = async (entry: DictionaryRow) => {
    const used = usedBy(entry);
    const message = used
      ? `"${entry.english}"는 사용 중인 문제 ${used}개에 쓰이고 있어요. 삭제하면 다시 등록하기 전까지 게시할 수 없어요. 삭제할까요?`
      : `"${entry.english}"를 삭제할까요?`;
    if (!confirm(message)) return;
    try {
      await removeEntry(entry.english);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <section>
      <div className="toolbar">
        <input
          type="search"
          placeholder="영어, 발음, 초성 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => clearParams(["sort"])}>필터 초기화</button>
        )}
        <span className="admin-spacer" />
        <span className="muted">
          {query
            ? `${visible.length} / ${dictionary.length}개`
            : `${dictionary.length}개`}
        </span>
        <CsvButton
          kind="dictionary"
          rows={() => [
            ["영어", "표시발음", "추가 허용 발음"],
            ...visible.map((d) => [d.english, d.pronunciation, d.alternatives]),
          ]}
        />
        <button className="primary" onClick={() => setEditing("new")}>
          단어 추가
        </button>
      </div>
      <p className="muted">
        가사 속 영어는 이 사전의 표시발음 초성으로 문제에 나오고,
        원문·표시발음·추가 허용 발음 중 하나로 맞힐 수 있어요. 긴 구절이 먼저
        매칭돼요.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortHeader
                label="영어"
                sortKey="english"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="표시발음"
                sortKey="pronunciation"
                sort={sort}
                onSort={setSort}
              />
              <th>추가 허용 발음</th>
              <SortHeader
                label="사용 문제"
                sortKey="used"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="수정"
                sortKey="updated"
                sort={sort}
                onSort={setSort}
                firstDesc
              />
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.english}>
                <td className="mono">{d.english}</td>
                <td>{d.pronunciation}</td>
                <td>{joinList(d.alternatives)}</td>
                <td className={usedBy(d) ? undefined : "muted"}>{usedBy(d)}</td>
                <td className="muted nowrap">{shortTime(d.updated_at)}</td>
                <td className="row-actions">
                  <button onClick={() => setEditing(d)}>수정</button>
                  <button className="danger" onClick={() => remove(d)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <EntryForm
          entry={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function EntryForm({
  entry,
  onClose,
}: {
  entry: DictionaryRow | null;
  onClose: () => void;
}) {
  const dictionary = useAdmin((s) => s.dictionary);
  const saveEntry = useAdmin((s) => s.saveEntry);
  const isNew = !entry;
  const [english, setEnglish] = useState(entry?.english ?? "");
  const [pronunciation, setPronunciation] = useState(
    entry?.pronunciation ?? "",
  );
  const [alternatives, setAlternatives] = useState(
    joinList(entry?.alternatives ?? []),
  );
  return (
    <FormDialog
      title={isNew ? "단어 추가" : "단어 수정"}
      onClose={onClose}
      onSubmit={async () => {
        if (!english.trim() || !pronunciation.trim())
          throw Error("영어와 표시발음은 필수예요.");
        const key = englishKey(english.trim());
        if (isNew && dictionary.some((d) => englishKey(d.english) === key))
          throw Error("이미 등록된 단어예요. 목록에서 수정하세요.");
        await saveEntry(
          {
            english: english.trim(),
            pronunciation: pronunciation.trim(),
            alternatives: splitList(alternatives),
          },
          isNew,
        );
      }}
    >
      <label>
        영어 (단어 또는 구절)
        <input
          className="mono"
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          disabled={!isNew}
          required
        />
        <small>
          {isNew
            ? "대소문자와 ’/' 차이는 구분하지 않아요."
            : "영어는 바꿀 수 없어요. 삭제 후 새로 추가하세요."}
        </small>
      </label>
      <label>
        표시발음
        <input
          value={pronunciation}
          onChange={(e) => setPronunciation(e.target.value)}
          required
        />
        <small>문제에는 이 발음의 초성이 표시돼요.</small>
      </label>
      <label>
        추가 허용 발음
        <input
          value={alternatives}
          onChange={(e) => setAlternatives(e.target.value)}
        />
        <small>여러 개는 | 로 구분해요.</small>
      </label>
    </FormDialog>
  );
}
