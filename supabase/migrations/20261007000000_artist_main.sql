-- NCT 유닛(메인) 여부: 게임의 기본 선택 범위, 데일리 퀴즈 출제 범위, "NCT 마스터" 업적 기준입니다.
-- 메인이 아닌 가수는 유닛 선택·도감에서 "다른 가수"로 따로 표시됩니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261006000000_member_stats.sql 다음)

alter table public.artists add column main boolean not null default false;

-- 기존 NCT 유닛을 메인으로 표시합니다. 실행 후 어드민 가수 탭에서 결과를 확인하세요.
update public.artists set main = true where name ilike 'NCT%';
