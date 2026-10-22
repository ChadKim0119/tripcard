-- 여행 카드 삭제. 적용됨: Supabase 프로젝트 zyhlhkqyigyrubovkxjr
-- 로그인 없이 만든 여행도 지울 수 있도록, 만들 때 삭제 키를 만든 기기에만 돌려준다.
-- 링크로 들어온 사람은 삭제 키가 없으므로 '내 목록에서 빼기'만 된다.

alter table public.trips add column delete_key uuid not null default gen_random_uuid();

-- 공개 응답·브로드캐스트에는 삭제 키를 싣지 않는다
create or replace function public.trip_json(t public.trips) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (to_jsonb(t) - 'owner_id' - 'delete_key') || jsonb_build_object('is_owner', t.owner_id = (select auth.uid()))
$$;

create or replace function public.trip_create(p_trip jsonb) returns jsonb
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
  return public.trip_json(v_trip) || jsonb_build_object('delete_key', v_trip.delete_key);
end $$;

create or replace function public.trip_update(p_token text, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_trip public.trips;
begin
  v_id := public.trip_access(p_token);
  if v_id is null then raise exception 'trip_not_found'; end if;
  update public.trips set
    title = case when p_patch ? 'title' then left(coalesce(p_patch->>'title', ''), 300) else title end,
    destination = case when p_patch ? 'destination' then left(coalesce(p_patch->>'destination', ''), 200) else destination end,
    start_date = case when p_patch ? 'start_date' then nullif(p_patch->>'start_date', '')::date else start_date end,
    end_date = case when p_patch ? 'end_date' then nullif(p_patch->>'end_date', '')::date else end_date end,
    cover = case when p_patch ? 'cover' then left(p_patch->>'cover', 2000) else cover end,
    source_url = case when p_patch ? 'source_url' then left(p_patch->>'source_url', 2000) else source_url end,
    summary = case when p_patch ? 'summary' then left(coalesce(p_patch->>'summary', ''), 4000) else summary end,
    members = case when p_patch ? 'members' then (select coalesce(array_agg(left(x, 40)), '{}') from (select jsonb_array_elements_text(p_patch->'members') x limit 20) s) else members end
  where id = v_id
  returning * into v_trip;
  perform public.trip_notify(p_token, 'trip', to_jsonb(v_trip) - 'owner_id' - 'delete_key');
  return public.trip_json(v_trip);
end $$;

-- 여행 삭제(모두에게서 사라짐, 복구 가능): 로그인한 소유자, 또는 만든 기기가 가진 삭제 키
create function public.trip_remove(p_token text, p_key uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update public.trips set deleted_at = now()
  where share_token = p_token and deleted_at is null
    and ((owner_id is not null and owner_id = (select auth.uid())) or (p_key is not null and delete_key = p_key))
  returning id into v_id;
  if v_id is null then return false; end if;
  perform public.trip_notify(p_token, 'deleted', jsonb_build_object('id', v_id));
  return true;
end $$;

create function public.trip_restore(p_token text, p_key uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update public.trips set deleted_at = null
  where share_token = p_token and deleted_at is not null
    and ((owner_id is not null and owner_id = (select auth.uid())) or (p_key is not null and delete_key = p_key))
  returning id into v_id;
  return v_id is not null;
end $$;

grant execute on function public.trip_remove(text, uuid), public.trip_restore(text, uuid) to anon, authenticated;
