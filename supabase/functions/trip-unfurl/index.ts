// 링크 메타데이터 추출 (og:title / og:description / og:image / site_name + 본문 일부).
// 트립카드는 로그인 없이 쓰므로 공개 호출(verify_jwt 끔)이다. 내부망 주소는 거부하고, 앞부분 400KB 만 읽는다.
// full: true 면 본문을 줄 구조째 20,000자까지 돌려준다 (여행사 일정표 읽기용).
// 일정을 API 로 따로 불러오는 여행사(모두투어)는 그 API 를 읽어 itinerary(일차별 일정)로 함께 돌려준다.
import { modetourItinerary, modetourProductNo, type Itinerary } from './modetour.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '[::1]') return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z#0-9]+);/gi, (all, n) => ENTITIES[n.toLowerCase()] ?? all)
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i');
    const m = html.match(re1) ?? html.match(re2);
    if (m?.[1]) return decode(m[1]);
  }
  return undefined;
}

function absolutize(src: string | undefined, base: string): string | undefined {
  if (!src) return undefined;
  try {
    return new URL(src, base).toString();
  } catch {
    return undefined;
  }
}

function youtubeId(u: URL): string | null {
  const h = u.hostname.replace(/^(www|m|music)\./, '');
  if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (h === 'youtube.com') {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
    if (m) return m[2];
  }
  return null;
}

async function fetchWithTimeout(url: string, ms: number, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
// 모두투어 웹이 모든 방문자에게 내려 주는 공개 클라이언트 헤더 (사이트 번호·기기 종류·웹 API 키)
const MODETOUR_HEADER = 'eyJXZWJTaXRlTm8iOjIsIkNvbXBhbnlObyI6ODEyMDIsIkRldmljZVR5cGUiOiJEVlRNb2JpbGUiLCJBcGlLZXkiOiJqbTlpNVJVektQTVBka2xIekRLcU56d1pZeTBJR1Y1aFR5S2tDY3B4TzBJR0lnVlMrOFo3Tm5iemJBUnY1dzdCbjkwS1QxM0dxNzlYWk1vdzZUWXZ3UT09In0=';

async function modetour(no: string): Promise<Itinerary | null> {
  const get = async (path: string) => {
    try {
      const r = await fetchWithTimeout(`https://b2c-api.modetour.com/Package/${path}?productNo=${no}`, 9000, {
        headers: { modewebapireqheader: MODETOUR_HEADER, accept: 'application/json, text/plain, */*', referer: 'https://m.modetour.com/', 'user-agent': MOBILE_UA },
      });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  };
  const [info, schedule] = await Promise.all([get('GetPackageInfo'), get('GetScheduleList')]);
  return modetourItinerary(info, schedule);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let target: URL;
  let full = false;
  try {
    const { url, full: wantFull } = await req.json();
    full = wantFull === true;
    target = new URL(String(url));
    if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) return json({ error: 'invalid_url' }, 400);
  } catch {
    return json({ error: 'invalid_url' }, 400);
  }

  const out: Record<string, unknown> & { title?: string; image?: string; site_name?: string; description?: string; text?: string } = { url: target.toString() };

  const mtNo = modetourProductNo(target);
  const mt = mtNo ? modetour(mtNo) : null;

  // YouTube 는 oEmbed 가 가장 정확하다.
  const yt = youtubeId(target);
  if (yt) {
    try {
      const r = await fetchWithTimeout(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target.toString())}`, 6000);
      if (r.ok) {
        const o = await r.json();
        out.title = o.title;
        out.site_name = o.author_name ? `YouTube · ${o.author_name}` : 'YouTube';
      }
    } catch {
      /* fall through */
    }
    out.image = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  }

  try {
    const res = await fetchWithTimeout(target.toString(), 8000, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 MyArchiveBot',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko,en;q=0.8',
      },
    });
    const finalUrl = res.url || target.toString();
    const type = res.headers.get('content-type') ?? '';
    if (res.ok && type.includes('html')) {
      // 앞부분 400KB 만 읽는다.
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (size < 400_000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }
      reader.cancel().catch(() => {});
      const buf = new Uint8Array(size);
      let off = 0;
      for (const c of chunks) {
        buf.set(c.subarray(0, Math.min(c.length, size - off)), off);
        off += c.length;
      }
      const charset = type.match(/charset=([\w-]+)/i)?.[1] ?? 'utf-8';
      let html: string;
      try {
        html = new TextDecoder(charset).decode(buf);
      } catch {
        html = new TextDecoder().decode(buf);
      }
      const head = html.slice(0, 200_000);
      out.title ??= meta(head, ['og:title', 'twitter:title']) ?? decode(head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '');
      out.description = meta(head, ['og:description', 'twitter:description', 'description']);
      out.image ??= absolutize(meta(head, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']), finalUrl);
      out.site_name ??= meta(head, ['og:site_name', 'application-name']);
      // 여행사 상품 페이지는 og:title 에 상품코드만 두고 상품명은 설명에 두는 경우가 있다 (예: "2026-12-27 JCE602YPR5")
      if (out.title && !/[가-힣]/.test(out.title) && out.description && /[가-힣]/.test(out.description) && out.description.length <= 160) {
        out.title = out.description;
      }
      const body = html.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ');
      out.text = full
        ? // 여행 일정표처럼 줄 구조가 의미 있는 페이지: 블록 태그를 줄바꿈으로 남긴다
          body
            .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/dt|\/dd|\/section|\/article)[^>]*>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .split('\n')
            .map(decode)
            .filter(Boolean)
            .join('\n')
            .slice(0, 20000)
        : decode(body.replace(/<[^>]+>/g, ' ')).slice(0, 3000);
    }
  } catch {
    /* 메타데이터를 못 읽어도 URL 은 저장할 수 있어야 한다 */
  }

  const itinerary = mt ? await mt : null;
  if (itinerary) {
    out.itinerary = itinerary;
    if (itinerary.title) out.title = itinerary.title;
    out.site_name = '모두투어';
  }

  if (!out.title) out.title = target.hostname.replace(/^www\./, '');
  return json(out);
});
