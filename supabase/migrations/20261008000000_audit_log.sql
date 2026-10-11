-- 변경 이력: 데이터 테이블(가수·곡·문제·영어 사전)의 추가·수정·삭제를 트리거로 남깁니다. 어드민 "이력" 탭에서 봅니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261007000000_artist_main.sql 다음)
-- 클라이언트는 쓰지 못하고 트리거만 씁니다. 어드민 로그인 이메일이 actor로 남고, service role·SQL Editor에서 바꾸면 actor가 비어 있습니다.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text,
  table_name text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  -- 바뀐 행의 키(가수명, 곡ID, 문제ID, 영어). 키가 바뀐 수정은 새 키입니다.
  row_key text not null,
  before jsonb,
  after jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_key, at desc);

-- tg_argv[0]: 키 컬럼 이름. updated_at만 바뀐 수정은 남기지 않습니다.
create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  old_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and (old_row - 'updated_at') = (new_row - 'updated_at') then
    return null;
  end if;
  insert into public.audit_log (actor, table_name, action, row_key, before, after)
  values (
    auth.jwt() ->> 'email',
    tg_table_name,
    lower(tg_op),
    coalesce(new_row, old_row) ->> tg_argv[0],
    old_row,
    new_row
  );
  return null;
end $$;

create trigger artists_audit after insert or update or delete on public.artists
  for each row execute function public.audit_row('name');
create trigger songs_audit after insert or update or delete on public.songs
  for each row execute function public.audit_row('id');
create trigger questions_audit after insert or update or delete on public.questions
  for each row execute function public.audit_row('id');
create trigger dictionary_audit after insert or update or delete on public.dictionary
  for each row execute function public.audit_row('english');

alter table public.audit_log enable row level security;
create policy "admins read audit log" on public.audit_log
  for select to authenticated using (public.is_admin());

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
