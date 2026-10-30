import { albumHead } from "../data/albums.ts";
import type { AlbumRow, SongRow } from "../data/build-catalog.ts";

/** What to check on an album in the 앨범 tab, in Korean; empty when it looks fine. An album
 *  of several artists or a compilation needs no title track. A probable duplicate is another
 *  album of the same name without subtitles and the same artist (e.g. one from Deezer and one
 *  from iTunes a few days apart). */
export function albumIssues(
  album: AlbumRow,
  tracks: readonly Pick<SongRow, "title_track">[],
  albums: readonly AlbumRow[],
): string[] {
  const issues: string[] = [];
  const titles = tracks.filter((s) => s.title_track).length;
  if (!titles && album.artist !== null && album.kind !== "compile")
    issues.push("타이틀곡 없음");
  if (titles > 1) issues.push(`타이틀곡 ${titles}곡`);
  if (!album.cover_url) issues.push("커버 없음");
  if (!album.released_on) issues.push("발매일 없음");
  const head = albumHead(album.title);
  if (
    albums.some(
      (a) =>
        a.id !== album.id &&
        a.artist === album.artist &&
        albumHead(a.title) === head,
    )
  )
    issues.push("중복 의심");
  return issues;
}
