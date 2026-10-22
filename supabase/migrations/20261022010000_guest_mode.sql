-- 로그인 없이 쓰기. 적용됨: Supabase 프로젝트 zyhlhkqyigyrubovkxjr
-- 여행은 로그인 없이도 만들 수 있다(owner_id 없음 = 링크를 가진 모두의 여행).
-- '내 여행' 목록은 기기에 기억한 공유 토큰으로 불러온다.

alter table public.trips alter column owner_id drop not null;

-- 로그인 없이도 여행을 만든다. 로그인했으면 소유자가 된다.
create function public.trip_create(p_trip jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_trip public.trips;
begin
  insert into public.trips (owner_id, title, destination, start_date, end_date, cover, source_url, summary, members)
  values (
    (select auth.uid()),
    left(coalesce(p_trip->>'title', ''), 300),
    left(coalesce(p_trip->>'destination', ''), 200),
    nullif(p_trip->>'start_date', '')::date,
    nullif(p_trip->>'end_date', '')::date,
    left(p_trip->>'cover', 2000),
    left(p_trip->>'source_url', 2000),
    left(coalesce(p_trip->>'summary', ''), 4000),
    coalesce((select array_agg(left(x, 40)) from (select jsonb_array_elements_text(coalesce(p_trip->'members', '[]'::jsonb)) x limit 20) s), '{}')
  )
  returning * into v_trip;
  return public.trip_json(v_trip);
end $$;

-- 이 기기에 기억된 공유 토큰들의 카드 요약 (로그인 없는 '내 여행' 목록)
create function public.trips_by_tokens(p_tokens text[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.trip_json(t) || jsonb_build_object(
      'check_total', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'check'),
      'check_done', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'check' and e.done),
      'plan_count', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'plan'),
      'note_count', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'note')
    ) order by t.start_date desc nulls first, t.created_at desc), '[]'::jsonb)
  from public.trips t
  where t.share_token = any(p_tokens[1:100]) and t.deleted_at is null
    and (t.share_enabled or t.owner_id = (select auth.uid())
         or exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id = (select auth.uid())))
$$;

grant execute on function public.trip_create(jsonb), public.trips_by_tokens(text[]) to anon, authenticated;
