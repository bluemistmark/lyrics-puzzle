-- 요청 수 제한 기록: 한 곳에서 새 플레이어를 잔뜩 만들어 업적 달성률을 왜곡하지 못하게 합니다(/api/achievements).
-- key는 접속 IP를 복원할 수 없게 변환한 값(서버 비밀값·날짜와 함께 SHA-256)이라 IP 자체는 남지 않고, 날짜가 바뀌면 같은 IP도 다른 값이 됩니다.
-- API가 기록할 때마다 하루 지난 행을 지웁니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261103000000_artist_english_name.sql 다음)
create table public.rate_hits (
  bucket text not null,
  key text not null check (key ~ '^[0-9a-f]{64}$'),
  at timestamptz not null default now()
);
create index rate_hits_key_idx on public.rate_hits (bucket, key, at desc);
create index rate_hits_at_idx on public.rate_hits (at);

alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;
grant all on public.rate_hits to service_role;
