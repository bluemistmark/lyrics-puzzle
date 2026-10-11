import { useMemo, useState } from "react";
import type { QuestionRow } from "../data/build-catalog.ts";
import { scanLine, sortDictionary } from "../data/english.ts";
import { FormDialog } from "./FormDialog";
import { nextQuestionId } from "./ids";
import { LyricsPreview } from "./LyricsPreview";
import { findOverlaps } from "./overlap";
import { QuickAddWord } from "./QuickAddWord";
import { SongSelect } from "./SongSelect";
import { useAdmin } from "./store";

/** Add/edit form for one question. Also opened from the 제보 and 난이도 tabs. */
export function QuestionForm({
  question,
  defaultSongId = "",
  onClose,
  onSaved,
}: {
  question: QuestionRow | null;
  defaultSongId?: string;
  onClose: () => void;
  /** Runs after a successful save, before the dialog closes. */
  onSaved?: () => void;
}) {
  const questions = useAdmin((s) => s.questions);
  const dictionary = useAdmin((s) => s.dictionary);
  const songs = useAdmin((s) => s.songs);
  const saveQuestion = useAdmin((s) => s.saveQuestion);
  const isNew = !question;
  const [id, setId] = useState(() => question?.id ?? nextQuestionId(questions));
  const [songId, setSongId] = useState(question?.song_id ?? defaultSongId);
  const [lines, setLines] = useState(() =>
    [0, 1, 2].map((i) => question?.lines[i] ?? ""),
  );
  const [active, setActive] = useState(question?.active ?? true);
  const sorted = useMemo(() => sortDictionary(dictionary), [dictionary]);
  const missing = useMemo(
    () => [
      ...new Set(
        lines.flatMap((line) => scanLine(line.trim(), sorted).missing),
      ),
    ],
    [lines, sorted],
  );
  const overlaps = useMemo(
    () => findOverlaps(lines, questions, question?.id),
    [lines, questions, question],
  );
  const songTitle = (id: string) => songs.find((s) => s.id === id)?.title ?? id;
  return (
    <FormDialog
      title={isNew ? "문제 추가" : `문제 ${question.id} 수정`}
      onClose={onClose}
      onSubmit={async () => {
        const trimmed = lines.map((l) => l.trim());
        if (!id.trim() || !songId) throw Error("문제ID와 곡을 선택하세요.");
        if (!trimmed[0] || !trimmed[1]) throw Error("가사1·가사2는 필수예요.");
        await saveQuestion(
          {
            id: id.trim(),
            song_id: songId,
            lines: trimmed.filter(Boolean),
            active,
          },
          isNew,
        );
        onSaved?.();
      }}
    >
      <label>
        곡
        <SongSelect value={songId} onChange={setSongId} />
      </label>
      <label>
        문제ID
        <input
          className="mono"
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={!isNew}
          required
        />
        {!isNew && <small>문제ID는 바꿀 수 없어요.</small>}
      </label>
      {lines.map((line, i) => (
        <label key={i}>
          가사{i + 1}
          {i === 2 && <span className="muted"> (선택)</span>}
          <input
            value={line}
            onChange={(e) =>
              setLines(lines.map((l, j) => (j === i ? e.target.value : l)))
            }
            required={i < 2}
          />
        </label>
      ))}
      <LyricsPreview lines={lines} sorted={sorted} />
      <label className="check">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        출제에 사용
      </label>
      {overlaps.length > 0 && (
        <div className="notice">
          <b>다른 문제와 같은 가사 줄</b>
          <p>의도한 반복이 아니라면 문제가 겹치지 않는지 확인하세요.</p>
          <ul>
            {overlaps.map((o) => (
              <li key={`${o.questionId}:${o.line}`}>
                <span className="mono">{o.questionId}</span> (
                {songTitle(o.songId)}) · {o.line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {missing.length > 0 && (
        <div className="notice">
          <b>영어 사전에 없는 단어</b>
          <p>발음을 등록해야 게시할 수 있어요. 저장은 먼저 해도 됩니다.</p>
          {missing.map((word) => (
            <QuickAddWord key={word} word={word} />
          ))}
        </div>
      )}
    </FormDialog>
  );
}
