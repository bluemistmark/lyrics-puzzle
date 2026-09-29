-- 어드민 대시보드용 오늘의 문제 날짜별 집계. daily_scores 행을 그대로 읽으면 1000행 제한에 걸리므로 뷰로 합칩니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261004000000_reports.sql 다음 — daily_scores 테이블 필요)
-- security_invoker라 daily_scores의 RLS(관리자만 읽기)가 그대로 적용됩니다.

create view public.daily_stats with (security_invoker = true) as
select
  date,
  count(*) as participants,
  count(*) filter (where solved) as solved,
  -- 정답자 기준 평균 (포기한 기록은 힌트·입력 수가 의미 없으므로 제외)
  round(avg(hints) filter (where solved), 2) as avg_hints,
  round(avg(guesses) filter (where solved), 2) as avg_guesses
from public.daily_scores
group by date;

revoke all on public.daily_stats from anon, authenticated;
grant select on public.daily_stats to authenticated;
grant select on public.daily_stats to service_role;
