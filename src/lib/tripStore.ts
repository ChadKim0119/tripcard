import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { Trip, TripEntry, TripPatch } from './trip';

export type SyncState = 'loading' | 'synced' | 'offline' | 'error';

/**
 * 여행 하나(공유 토큰)의 실시간 동기화.
 * 로그인 여부와 상관없이 토큰만으로 읽고 쓴다 — 서버 RPC 가 토큰을 확인한다.
 * 저장할 때마다 서버가 공개 채널 'trip:<token>' 으로 바뀐 행을 보내므로
 * 같은 링크를 연 모든 기기(두 가족, 여러 멤버)가 즉시 같은 화면을 본다.
 */
const CACHE_KEY = (token: string) => `ma.trip.${token}`;

function readCache(token: string): { trip: Trip; entries: TripEntry[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(token));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(token: string, trip: Trip | null, entries: TripEntry[]) {
  try {
    if (trip) localStorage.setItem(CACHE_KEY(token), JSON.stringify({ trip, entries }));
  } catch {
    /* 캐시는 첫 화면 속도용 */
  }
}

function sortEntries(list: TripEntry[]) {
  return list.slice().sort((a, b) => a.sort - b.sort);
}

function mergeRows(prev: TripEntry[], rows: TripEntry[]) {
  const map = new Map(prev.map((e) => [e.id, e]));
  for (const r of rows) map.set(r.id, r);
  return sortEntries([...map.values()]);
}

export type TripSync = SyncState | 'missing';

export function useTrip(token: string) {
  const cached = useRef(readCache(token));
  const [trip, setTrip] = useState<Trip | null>(cached.current?.trip ?? null);
  const [entries, setEntries] = useState<TripEntry[]>(cached.current?.entries ?? []);
  const [sync, setSync] = useState<TripSync>('loading');
  const tripRef = useRef(trip);
  const entriesRef = useRef(entries);
  tripRef.current = trip;
  entriesRef.current = entries;

  useEffect(() => writeCache(token, trip, entries), [token, trip, entries]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('trip_get', { p_token: token });
    if (error) {
      setSync(navigator.onLine ? 'error' : 'offline');
      return;
    }
    if (!data) {
      setSync('missing');
      return;
    }
    const d = data as { trip: Trip; entries: TripEntry[] };
    setTrip(d.trip);
    setEntries(sortEntries(d.entries));
    setSync('synced');
  }, [token]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`trip:${token}`)
      .on('broadcast', { event: 'entries' }, ({ payload }) => {
        const rows = (payload as { rows?: TripEntry[] }).rows ?? [];
        setEntries((prev) => mergeRows(prev, rows));
      })
      .on('broadcast', { event: 'remove' }, ({ payload }) => {
        const ids = new Set((payload as { ids?: string[] }).ids ?? []);
        setEntries((prev) => prev.filter((e) => !ids.has(e.id)));
      })
      .on('broadcast', { event: 'trip' }, ({ payload }) => {
        // 공유 설정(share_enabled 등)은 소유자 화면에서만 바뀌므로 is_owner 는 내 값을 유지한다
        setTrip((prev) => (prev ? { ...prev, ...(payload as Partial<Trip>), is_owner: prev.is_owner } : prev));
      })
      .subscribe((status) => {
        // 끊겼다 다시 붙으면 놓친 변경이 있을 수 있다
        if (status === 'SUBSCRIBED') void refresh();
      });

    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onOnline = () => void refresh();
    const onOffline = () => setSync('offline');
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      void supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [token, refresh]);

  /** 낙관적 갱신 → 서버. 실패하면 되돌린다. */
  const upsert = useCallback(
    async (rows: TripEntry[]) => {
      if (!rows.length) return;
      const before = entriesRef.current;
      setEntries((prev) => mergeRows(prev, rows));
      const payload = rows.map(({ trip_id: _t, created_at: _c, updated_at: _u, ...rest }) => rest);
      const { data, error } = await supabase.rpc('trip_entries_upsert', { p_token: token, p_entries: payload });
      if (error) {
        setEntries(before);
        throw new Error(error.message);
      }
      setEntries((prev) => mergeRows(prev, (data as TripEntry[]) ?? []));
    },
    [token],
  );

  const patchEntry = useCallback(
    (id: string, changes: Partial<TripEntry>) => {
      const cur = entriesRef.current.find((e) => e.id === id);
      return cur ? upsert([{ ...cur, ...changes }]) : Promise.resolve();
    },
    [upsert],
  );

  const remove = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const before = entriesRef.current;
      setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
      const { error } = await supabase.rpc('trip_entries_remove', { p_token: token, p_ids: ids });
      if (error) {
        setEntries(before);
        throw new Error(error.message);
      }
    },
    [token],
  );

  const update = useCallback(
    async (patch: TripPatch) => {
      const before = tripRef.current;
      setTrip((prev) => (prev ? { ...prev, ...patch } : prev));
      const { data, error } = await supabase.rpc('trip_update', { p_token: token, p_patch: patch });
      if (error) {
        setTrip(before);
        throw new Error(error.message);
      }
      setTrip(data as Trip);
    },
    [token],
  );

  return { trip, entries, sync, refresh, upsert, patchEntry, remove, update };
}

export type TripApi = ReturnType<typeof useTrip>;

/* ------------------------------------------------------------------ 내 여행 목록 (로그인 사용자) */

export function useTrips(userId: string) {
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`ma.trips.${userId}`) ?? '[]') as Trip[];
    } catch {
      return [];
    }
  });
  const [sync, setSync] = useState<SyncState>('loading');

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_trips');
    if (error) {
      setSync(navigator.onLine ? 'error' : 'offline');
      return;
    }
    const list = (data as Trip[]) ?? [];
    setTrips(list);
    setSync('synced');
    try {
      localStorage.setItem(`ma.trips.${userId}`, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [refresh]);

  /** 여행 카드 만들기 — 기본 정보는 trips 에, 일정·체크리스트는 공유 RPC 로 한 번에 넣는다. */
  const create = useCallback(
    async (info: TripPatch, entries: TripEntry[]): Promise<Trip> => {
      const { data, error } = await supabase
        .from('trips')
        .insert({ ...info, start_date: info.start_date || null, end_date: info.end_date || null })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? '여행을 만들지 못했습니다');
      const row = { ...(data as Trip), is_owner: true };
      for (let i = 0; i < entries.length; i += 300) {
        const chunk = entries.slice(i, i + 300).map(({ trip_id: _t, created_at: _c, updated_at: _u, ...rest }) => rest);
        const r = await supabase.rpc('trip_entries_upsert', { p_token: row.share_token, p_entries: chunk });
        if (r.error) throw new Error(r.error.message);
      }
      void refresh();
      return row;
    },
    [refresh],
  );

  /** 소유자: 휴지통으로(복구 가능), 참여자: 내 목록에서 빼기 */
  const removeTrip = useCallback(
    async (trip: Trip) => {
      setTrips((prev) => prev.filter((t) => t.id !== trip.id));
      const { error } = trip.is_owner
        ? await supabase.from('trips').update({ deleted_at: new Date().toISOString() }).eq('id', trip.id)
        : await supabase.from('trip_members').delete().eq('trip_id', trip.id).eq('user_id', userId);
      if (error) {
        void refresh();
        throw new Error(error.message);
      }
    },
    [refresh, userId],
  );

  const restoreTrip = useCallback(
    async (trip: Trip) => {
      const { error } = await supabase.from('trips').update({ deleted_at: null }).eq('id', trip.id);
      if (error) throw new Error(error.message);
      await refresh();
    },
    [refresh],
  );

  return { trips, sync, refresh, create, removeTrip, restoreTrip };
}

export type TripsApi = ReturnType<typeof useTrips>;

/** 공유 설정은 소유자만 (RLS). 링크를 새로 만들면 예전 링크는 더 이상 열리지 않는다. */
export async function setSharing(tripId: string, changes: { share_enabled?: boolean; rotate?: boolean }): Promise<Partial<Trip>> {
  const patch: Record<string, unknown> = {};
  if (changes.share_enabled !== undefined) patch.share_enabled = changes.share_enabled;
  if (changes.rotate) patch.share_token = crypto.randomUUID().replace(/-/g, '');
  const { data, error } = await supabase.from('trips').update(patch).eq('id', tripId).select('share_enabled, share_token').single();
  if (error || !data) throw new Error(error?.message ?? '변경하지 못했습니다');
  return data as Partial<Trip>;
}

export async function joinTrip(token: string) {
  await supabase.rpc('trip_join', { p_token: token });
}

export function tripTokenFromPath(path = window.location.pathname): string | null {
  return path.match(/^\/t\/([0-9a-z]{16,64})\/?$/i)?.[1] ?? null;
}

export const shareUrl = (token: string) => `${window.location.origin}/t/${token}`;

/** 공유 링크로 들어온 사람의 이름 — 체크·기록에 "누가" 를 남긴다. 기기별로 기억. */
export function getMemberName(): string {
  try {
    return localStorage.getItem('ma.trip.name') ?? '';
  } catch {
    return '';
  }
}
export function setMemberName(name: string) {
  try {
    localStorage.setItem('ma.trip.name', name.trim().slice(0, 40));
  } catch {
    /* ignore */
  }
}
