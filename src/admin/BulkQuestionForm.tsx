import { useMemo, useState } from "react";
import { scanLine, sortDictionary } from "../data/english.ts";
import { lyricsKey, parseBulkQuestions } from "./bulk";
import { FormDialog } from "./FormDialog";
import { nextQuestionIds } from "./ids";
import { QuickAddWord } from "./QuickAddWord";
import { SongSelect } from "./SongSelect";
import { useAdmin } from "./store";

const PLACEHOLDER = `빈 줄로 문제를 구분해요. 한 문제는 2~3줄이에요.

태도 대충 거칠고
내가 걷는 City
꽤 넓은 Octagon

바랄 게 없을 때까지
멈추지를 못해`;

export function BulkQuestionForm({
  defaultSongId,
  onClose,
}: {
  defaultSongId: string;
  onClose: () => void;
}) {
  const questions = useAdmin((s) => s.questions);
  const dictionary = useAdmin((s) => s.dictionary);
  const addQuestions = useAdmin((s) => s.addQuestions);
  const [songId, setSongId] = useState(defaultSongId);
  const [text, setText] = useState("");
  const [active, setActive] = useState(true);

  const sorted = useMemo(() => sortDictionary(dictionary), [dictionary]);
  const preview = useMemo(() => {
    const blocks = parseBulkQuestions(text);
    const ids = nextQuestionIds(questions, blocks.length);
    const existing = new Set(
      questions
        .filter((q) => q.song_id === songId)
        .map((q) => lyricsKey(q.lines)),
    );
    const seen = new Set<string>();
    return blocks.map((block, i) => {
      const key = lyricsKey(block.lines);
      const duplicate = existing.has(key)
        ? "이 곡에 이미 있는 문제예요."
        : seen.has(key)
          ? "위에 같은 문제가 있어요."
          : undefined;
      seen.add(key);
      const missing = [
        ...new Set(block.lines.flatMap((l) => scanLine(l, sorted).missing)),
      ];
      return { ...block, id: ids[i], error: block.error ?? duplicate, missing };
    });
  }, [text, questions, songId, sorted]);
  const errors = preview.filter((p) => p.error).length;
  const missingWords = [...new Set(preview.flatMap((p) => p.missing))];

  return (
    <FormDialog
      title="여러 문제 추가"
      wide
      onClose={onClose}
      submitLabel={preview.length ? `${preview.length}개 저장` : "저장"}
      submitDisabled={!preview.length || errors > 0}
      onSubmit={async () => {
        if (!songId) throw Error("곡을 선택하세요.");
        await addQuestions(
          preview.map((p) => ({
            id: p.id,
            song_id: songId,
            lines: p.lines,
            active,
          })),
        );
      }}
    >
      <label>
        곡
        <SongSelect value={songId} onChange={setSongId} />
      </label>
      <label>
        가사
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
        />
        <small>
          엑셀·시트에서 가사1~3 칸을 행째 복사해 붙여 넣어도 돼요 (한 행 = 한
          문제).
        </small>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        모두 출제에 사용
      </label>

      {preview.length > 0 && (
        <>
          <p className="muted">
            미리보기 {preview.length}문제
            {errors > 0 && (
              <span className="warn-text">
                {" "}
                · 고쳐야 할 문제 {errors}개 (고치거나 지워야 저장할 수 있어요)
              </span>
            )}
          </p>
          <div className="table-wrap bulk-preview">
            <table>
              <thead>
                <tr>
                  <th>문제ID</th>
                  <th>가사</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.id}</td>
                    <td className="lyrics-cell">
                      {p.lines.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </td>
                    <td>
                      {p.error ? (
                        <span className="form-error">{p.error}</span>
                      ) : p.missing.length ? (
                        <span className="warn-text">
                          사전에 없음: {p.missing.join(", ")}
                        </span>
                      ) : (
                        <span className="ok-text">정상</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {missingWords.length > 0 && (
        <div className="notice">
          <b>영어 사전에 없는 단어 {missingWords.length}개</b>
          <p>발음을 등록해야 게시할 수 있어요. 저장은 먼저 해도 됩니다.</p>
          {missingWords.map((word) => (
            <QuickAddWord key={word} word={word} />
          ))}
        </div>
      )}
    </FormDialog>
  );
}
