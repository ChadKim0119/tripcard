import { supabase } from './supabase';

export interface Unfurled {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
  text?: string;
  /** 일정을 API 로 따로 불러오는 여행사(모두투어 등)는 서버가 일차별 일정까지 읽어 준다 */
  itinerary?: {
    title: string;
    start_date: string;
    end_date: string;
    summary: string;
    days: { day: number; items: { time: string; title: string; note: string }[] }[];
  };
}

/** 링크 메타데이터(제목·설명·썸네일). 브라우저는 CORS 때문에 직접 못 읽어서 Edge Function 이 대신 가져온다. */
export async function unfurl(url: string, signal?: AbortSignal, opts: { full?: boolean } = {}): Promise<Unfurled | null> {
  const { data, error } = await supabase.functions.invoke<Unfurled>('trip-unfurl', { body: { url, full: opts.full } });
  if (signal?.aborted || error || !data) return null;
  return data;
}

let aiEnabledCache: boolean | null = null;

/** 서버에 ANTHROPIC_API_KEY 가 설정됐는지. 없으면 규칙 기반 일정 인식만 쓴다. */
export async function aiEnabled(): Promise<boolean> {
  if (aiEnabledCache !== null) return aiEnabledCache;
  const { data, error } = await supabase.functions.invoke<{ enabled: boolean }>('trip-ai', { body: { action: 'status' } });
  aiEnabledCache = !error && !!data?.enabled;
  return aiEnabledCache;
}

export interface AiTrip {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  summary: string;
  days: { day: number; items: { time: string; title: string; note: string }[] }[];
  packing: string[];
}

/** 여행사 일정표·상품 페이지 본문 → 일차별 일정. AI 키가 없으면 규칙 기반 파서(trip.ts)만 쓴다. */
export async function aiTrip(input: { url?: string; title?: string; text: string }): Promise<AiTrip> {
  const { data, error } = await supabase.functions.invoke<AiTrip & { error?: string }>('trip-ai', { body: { action: 'trip', ...input } });
  if (error || !data || data.error) throw new Error(data?.error ?? 'AI 요청에 실패했습니다');
  return data;
}
