-- 어드민 대시보드용 가입 회원 수. auth.users는 어드민(anon 키 + 로그인 세션)이 직접 읽을 수 없으므로 숫자만 돌려주는 함수로 셉니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261005000000_daily_stats.sql 다음)
-- 게임 로그인(카카오·구글)으로 가입한 사용자만 셉니다. 어드민의 이메일·비밀번호 계정은 제외됩니다.
-- 관리자가 아니면 에러를 냅니다. 이메일 등 개인정보는 돌려주지 않습니다.

create function public.member_stats()
returns table (total bigint, new_week bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  return query
    select
      count(*),
      count(*) filter (where u.created_at >= now() - interval '7 days')
    from auth.users u
    where u.raw_app_meta_data ->> 'provider' in ('kakao', 'google');
end;
$$;

revoke all on function public.member_stats() from public, anon;
grant execute on function public.member_stats() to authenticated;
