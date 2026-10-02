import { Music, Sparkles } from "lucide-react";
import { news } from "../game";

const SONGS_SHOWN = 8;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

export function NewsPanel({ hidden }: { hidden: boolean }) {
  return (
    <section
      id="news-panel"
      aria-label="새 소식"
      hidden={hidden}
      className="news-panel"
    >
      <h1>새 소식</h1>
      {news.length ? (
        <ol className="news-list">
          {news.map((item) => (
            <li className="news-item" key={item.id}>
              <time dateTime={item.date}>{formatDate(item.date)}</time>
              {item.features.length > 0 && (
                <div className="news-block">
                  <b>
                    <Sparkles size={14} /> 새 기능
                  </b>
                  <ul>
                    {item.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item.addedSongs.length > 0 && (
                <div className="news-block">
                  <b>
                    <Music size={14} /> 새 곡 {item.addedSongs.length}곡
                  </b>
                  <ul>
                    {item.addedSongs.slice(0, SONGS_SHOWN).map((s, i) => (
                      <li key={i}>
                        {s.title} <span>{s.artist}</span>
                      </li>
                    ))}
                    {item.addedSongs.length > SONGS_SHOWN && (
                      <li>
                        <span>외 {item.addedSongs.length - SONGS_SHOWN}곡</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {(item.addedQuestions > 0 || item.removedQuestions > 0) && (
                <p className="news-stats">
                  {item.addedQuestions > 0 &&
                    `새 문제 ${item.addedQuestions}개`}
                  {item.addedQuestions > 0 &&
                    item.removedQuestions > 0 &&
                    " · "}
                  {item.removedQuestions > 0 &&
                    `문제 ${item.removedQuestions}개 정리`}
                </p>
              )}
              {item.note && <p className="news-note">{item.note}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="record-note">아직 소식이 없어요.</p>
      )}
    </section>
  );
}
