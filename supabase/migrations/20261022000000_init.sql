-- 트립카드 스키마 (새 Supabase 프로젝트에 이 파일 하나를 적용한다).
-- 공개 링크(share_token)를 가진 사람은 로그인 없이 보고 수정한다 → 항목 접근은 모두 security definer RPC 로만.
-- 변경은 realtime.send 로 공개 채널 'trip:<token>' 에 브로드캐스트해 모든 기기에 즉시 반영한다.

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  share_enabled boolean not null default true,
  title text not null default '' check (length(title) <= 300),
  destination text not null default '' check (length(destination) <= 200),
  start_date date,
  end_date date,
  cover text check (length(cover) <= 2000),
  source_url text check (length(source_url) <= 2000),
  summary text not null default '' check (length(summary) <= 4000),
  members text[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_owner_idx on public.trips (owner_id, created_at desc);

create table public.trip_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null check (kind in ('plan','check','note','link')),
  phase text not null default 'before' check (phase in ('before','during','after')),
  day integer check (day between 0 and 365),
  time text not null default '',
  title text not null default '',
  body text not null default '',
  url text,
  thumbnail text,
  site_name text,
  group_name text not null default '',
  done boolean not null default false,
  done_by text,
  author text not null default '',
  sort double precision not null default 0,
  -- 삭제는 표시만 한다: 실행 취소가 되고, 늦게 도착한 다른 기기의 수정도 되살릴 수 있다
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trip_entries_trip_idx on public.trip_entries (trip_id, kind, sort);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index trip_members_user_idx on public.trip_members (user_id);

alter table public.trips enable row level security;
alter table public.trip_entries enable row level security;
alter table public.trip_members enable row level security;

-- 소유자는 여행 정보·공유 설정을 직접 다룬다. 항목(trip_entries)은 정책 없음 = RPC 로만.
create policy "own trips select" on public.trips for select to authenticated using ((select auth.uid()) = owner_id);
create policy "own trips insert" on public.trips for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "own trips update" on public.trips for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "own trips delete" on public.trips for delete to authenticated using ((select auth.uid()) = owner_id);
create policy "own memberships" on public.trip_members for select to authenticated using ((select auth.uid()) = user_id);
create policy "leave trip" on public.trip_members for delete to authenticated using ((select auth.uid()) = user_id);

create trigger trips_touch before update on public.trips for each row execute function public.touch_updated_at();
create trigger trip_entries_touch before update on public.trip_entries for each row execute function public.touch_updated_at();

/* ---------------------------------------------------------------- helpers */

-- 토큰으로 접근 가능한 여행 id. 공유가 꺼져 있으면 소유자·참여자만.
create function public.trip_access(p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.trips t
  where t.share_token = p_token and t.deleted_at is null
    and (t.share_enabled or t.owner_id = (select auth.uid())
         or exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id = (select auth.uid())))
$$;

create function public.trip_json(t public.trips) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (to_jsonb(t) - 'owner_id') || jsonb_build_object('is_owner', t.owner_id = (select auth.uid()))
$$;

create function public.trip_notify(p_token text, p_event text, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(p_payload, p_event, 'trip:' || p_token, false);
exception when others then
  null; -- 브로드캐스트 실패가 저장을 막으면 안 된다 (클라이언트는 포커스 시 다시 읽는다)
end $$;

/* ---------------------------------------------------------------- RPC */

create function public.trip_get(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid; v_trip public.trips;
begin
  v_id := public.trip_access(p_token);
  if v_id is null then return null; end if;
  select * into v_trip from public.trips where id = v_id;
  return jsonb_build_object(
    'trip', public.trip_json(v_trip),
    'entries', coalesce((select jsonb_agg(to_jsonb(e) order by e.sort, e.created_at) from public.trip_entries e where e.trip_id = v_id and e.deleted_at is null), '[]'::jsonb)
  );
end $$;

create function public.trip_update(p_token text, p_patch jsonb) returns jsonb
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
  perform public.trip_notify(p_token, 'trip', to_jsonb(v_trip) - 'owner_id');
  return public.trip_json(v_trip);
end $$;

-- 항목 여러 개를 한 번에 추가·수정한다. 클라이언트가 id 를 만들어 보내므로 낙관적 갱신과 짝이 맞는다.
create function public.trip_entries_upsert(p_token text, p_entries jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_rows jsonb;
begin
  v_id := public.trip_access(p_token);
  if v_id is null then raise exception 'trip_not_found'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 300 then raise exception 'bad_entries'; end if;
  with src as (
    select * from jsonb_to_recordset(p_entries) as x(
      id uuid, kind text, phase text, day integer, time text, title text, body text, url text,
      thumbnail text, site_name text, group_name text, done boolean, done_by text, author text, sort double precision)
  ), up as (
    insert into public.trip_entries as e (id, trip_id, kind, phase, day, time, title, body, url, thumbnail, site_name, group_name, done, done_by, author, sort)
    select coalesce(s.id, gen_random_uuid()), v_id, s.kind, coalesce(s.phase, 'before'), s.day, left(coalesce(s.time, ''), 40),
           left(coalesce(s.title, ''), 500), left(coalesce(s.body, ''), 20000), left(s.url, 2000), left(s.thumbnail, 2000),
           left(s.site_name, 200), left(coalesce(s.group_name, ''), 60), coalesce(s.done, false), left(s.done_by, 40),
           left(coalesce(s.author, ''), 40), coalesce(s.sort, extract(epoch from now()))
    from src s
    on conflict (id) do update set
      kind = excluded.kind, phase = excluded.phase, day = excluded.day, time = excluded.time, title = excluded.title,
      body = excluded.body, url = excluded.url, thumbnail = excluded.thumbnail, site_name = excluded.site_name,
      group_name = excluded.group_name, done = excluded.done, done_by = excluded.done_by, sort = excluded.sort,
      deleted_at = null
    where e.trip_id = v_id
    returning e.*
  )
  select coalesce(jsonb_agg(to_jsonb(up)), '[]'::jsonb) into v_rows from up;
  perform public.trip_notify(p_token, 'entries', jsonb_build_object('rows', v_rows));
  return v_rows;
end $$;

create function public.trip_entries_remove(p_token text, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  v_id := public.trip_access(p_token);
  if v_id is null then raise exception 'trip_not_found'; end if;
  update public.trip_entries set deleted_at = now() where trip_id = v_id and id = any(p_ids);
  perform public.trip_notify(p_token, 'remove', jsonb_build_object('ids', to_jsonb(p_ids)));
end $$;

-- 로그인한 사람이 공유 링크로 들어오면 참여자로 등록 → 그 사람의 여행 목록(모든 기기)에 나타난다.
create function public.trip_join(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then return; end if;
  v_id := public.trip_access(p_token);
  if v_id is null then return; end if;
  if exists (select 1 from public.trips where id = v_id and owner_id = (select auth.uid())) then return; end if;
  insert into public.trip_members (trip_id) values (v_id) on conflict do nothing;
end $$;

-- 내 여행 + 참여한 여행, 카드에 필요한 요약 숫자 포함.
create function public.my_trips() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.trip_json(t) || jsonb_build_object(
      'check_total', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'check'),
      'check_done', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'check' and e.done),
      'plan_count', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'plan'),
      'note_count', (select count(*) from public.trip_entries e where e.trip_id = t.id and e.deleted_at is null and e.kind = 'note')
    ) order by t.start_date desc nulls first, t.created_at desc), '[]'::jsonb)
  from public.trips t
  where t.deleted_at is null and (select auth.uid()) is not null
    and (t.owner_id = (select auth.uid())
         or exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id = (select auth.uid())))
$$;

revoke execute on function public.trip_access(text), public.trip_json(public.trips), public.trip_notify(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.my_trips() from public, anon;
revoke execute on function public.trip_join(text) from public, anon;
grant execute on function public.trip_get(text), public.trip_update(text, jsonb), public.trip_entries_upsert(text, jsonb), public.trip_entries_remove(text, uuid[]) to anon, authenticated;
grant execute on function public.my_trips(), public.trip_join(text) to authenticated;
