-- 가수 영문 이름: Deezer·iTunes가 솔로 가수를 영문으로 올려 두어서(도영 → DOYOUNG) 한글 가수명으로는 앨범·앨범아트를 찾지 못합니다.
-- 검색어와 가수 비교에 이 이름도 씁니다. 비어 있으면 가수명만 씁니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261102000000_achievement_unlocks.sql 다음)
alter table public.artists add column english_name text not null default '';

update public.artists set english_name = v.english
from (values
  ('도영', 'DOYOUNG'),
  ('태용', 'TAEYONG'),
  ('해찬', 'HAECHAN'),
  ('재현', 'JAEHYUN'),
  ('정우', 'JUNGWOO'),
  ('NCT 도재정', 'NCT DOJAEJUNG')
) as v(name, english)
where public.artists.name = v.name;

-- 이 가수들의 곡 중 앨범아트를 못 찾은 행을 지워 다음 게시 때 영문 이름으로 다시 찾게 합니다(직접 넣은 주소는 그대로).
delete from public.song_artwork w
using public.songs s, public.artists a
where w.song_id = s.id and s.artist = a.name
  and a.english_name <> '' and w.url = '' and not w.manual;
