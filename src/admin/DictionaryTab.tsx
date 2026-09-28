import { useMemo, useState } from "react";
import type { DictionaryRow } from "../data/build-catalog.ts";
import { englishKey, scanLine, sortDictionary } from "../data/english.ts";
import { FormDialog } from "./FormDialog";
import { joinList, splitList } from "./ids";
import { useAdmin } from "./store";

export function DictionaryTab() {
  const dictionary = useAdmin((s) => s.dictionary);
  const questions = useAdmin((s) => s.questions);
  const removeEntry = useAdmin((s) => s.removeEntry);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<DictionaryRow | "new" | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...dictionary]
      .sort((a, b) =>
        englishKey(a.english).localeCompare(englishKey(b.english)),
      )
      .filter((d) =>
        [d.english, d.pronunciation, ...d.alternatives].some((v) =>
          v.toLowerCase().includes(q),
        ),
      );
  }, [dictionary, query]);

  const remove = async (entry: DictionaryRow) => {
    // Count active questions whose lyrics currently resolve to this entry.
    const sorted = sortDictionary(dictionary);
    const key = englishKey(entry.english);
    const used = questions.filter(
      (q) =>
        q.active &&
        q.lines.some((line) =>
          scanLine(line, sorted).tokens.some(
            (t) => t.pronunciation !== undefined && englishKey(t.text) === key,
          ),
        ),
    ).length;
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
          placeholder="영어, 발음 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="admin-spacer" />
        <span className="muted">{visible.length}개</span>
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
              <th>영어</th>
              <th>표시발음</th>
              <th>추가 허용 발음</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.english}>
                <td className="mono">{d.english}</td>
                <td>{d.pronunciation}</td>
                <td>{joinList(d.alternatives)}</td>
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
