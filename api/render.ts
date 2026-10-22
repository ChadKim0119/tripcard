// 여행사 상품 페이지를 실제 브라우저(헤드리스 크롬)로 열어 화면에 보이는 글자를 돌려준다.
// 많은 여행사(노랑풍선 등)가 일정을 페이지가 열린 뒤 따로 불러와 HTML 에는 일정이 없다 → 여행사마다 맞추지 않고
// 사람이 보는 화면 그대로 읽는다. '일정' 탭이 있으면 누르고, 아래로 내려 늦게 뜨는 내용까지 기다린다.
// 일정 해석은 앱(src/lib/trip.ts parseItinerary)이 한다.
import chromium from '@sparticuz/chromium';
import puppeteer, { type Page } from 'puppeteer-core';

type Req = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { status: (n: number) => Res; setHeader: (k: string, v: string) => void; json: (b: unknown) => void };

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
// 광고·분석 스크립트는 막아 빨리 연다 (일정과 무관)
const BLOCK = /google-analytics|googletagmanager|doubleclick|googlesyndication|facebook\.(net|com)\/tr|connect\.facebook|criteo|moloco|widerplanet|onetag|kakao.*(pixel|ad)|daum\.net\/bc|wcs\.naver|clarity\.ms|hotjar|tiktok|appsflyer|branch\.io|channel\.io|braze|amplitude|mixpanel/i;
const DAY_TEXT = /(?:^|\s)(?:1\s*일\s*차|제\s*1\s*일|DAY\s*-?\s*0?1)(?:\s|$|[^0-9])/i;
const TAB_LABELS = ['상세일정', '상세 일정', '일차별 일정', '여행일정', '여행 일정', '일정표', '일정'];
// 일차별 일정이 접혀 있는 사이트(참좋은여행 등)는 펼친다
const EXPAND_LABELS = ['전체열기', '전체 열기', '전체펼치기', '전체 펼치기', '모두 펼치기', '일정 전체보기', '일정 펼치기', '상세일정 펼치기'];

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '[::1]' || h.startsWith('[')) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

const bodyText = (page: Page) => page.evaluate(() => document.body?.innerText ?? '');

async function waitFor(page: Page, test: (t: string) => boolean, ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (test(await bodyText(page).catch(() => ''))) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/**
 * 숨은 일정까지 보이게 한다.
 * 1) '전체열기' 같은 버튼  2) 일차 머리("2일차 · 11월 9일 …")를 하나씩 — 누른 뒤 글자가 줄면(이미 열려 있던 것을 닫음) 다시 눌러 되돌린다.
 */
async function expandAll(page: Page) {
  await page.evaluate((labels: string[]) => {
    for (const el of document.querySelectorAll<HTMLElement>('a, button, [role="button"], span, div, li')) {
      const t = el.innerText?.trim();
      if (t && labels.includes(t) && el.getClientRects().length > 0 && ![...el.children].some((c) => (c as HTMLElement).innerText?.trim() === t)) {
        el.click();
        return;
      }
    }
  }, EXPAND_LABELS);
  await new Promise((r) => setTimeout(r, 800));

  // 일차 사이 글이 이미 충분하면(펼쳐져 있으면) 하나씩 누르지 않는다
  const collapsed = await page.evaluate(() => {
    const t = document.body?.innerText ?? '';
    const at = [...t.matchAll(/(?:^|\n)\s*(?:\d+\s*일\s*차|DAY\s*-?\s*\d+)/gi)].map((m) => m.index ?? 0);
    if (at.length < 2) return false;
    const gaps = at.slice(1).map((v, i) => v - at[i]);
    return gaps.filter((g) => g < 120).length >= gaps.length / 2;
  });
  if (!collapsed) return;

  const count = await page.evaluate(() => {
    const heads = [...document.querySelectorAll<HTMLElement>('a, button, [role="button"], [aria-expanded], [onclick], dt, summary')].filter((e) => {
      const t = (e.innerText ?? '').trim();
      return /^(?:\d+\s*일\s*차|DAY\s*-?\s*\d+|제\s*\d+\s*일)/i.test(t) && t.length < 120 && e.getClientRects().length > 0;
    });
    // 같은 머리 안에 겹친 요소는 바깥 하나만
    const outer = heads.filter((e) => !heads.some((o) => o !== e && o.contains(e)));
    outer.forEach((e, i) => e.setAttribute('data-tc-day', String(i)));
    return outer.length;
  });
  for (let i = 1; i < Math.min(count, 40); i++) {
    const before = (await bodyText(page)).length;
    await page.evaluate((k: number) => document.querySelector<HTMLElement>(`[data-tc-day="${k}"]`)?.click(), i);
    await new Promise((r) => setTimeout(r, 350));
    const after = (await bodyText(page)).length;
    if (after < before) {
      await page.evaluate((k: number) => document.querySelector<HTMLElement>(`[data-tc-day="${k}"]`)?.click(), i);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

export default async function handler(req: Req, res: Res) {
  const raw = String((req.query.url as string) ?? (req.body as { url?: string } | undefined)?.url ?? '');
  let target: URL;
  try {
    target = new URL(raw);
    if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) throw new Error('bad');
  } catch {
    res.status(400).json({ error: 'invalid_url' });
    return;
  }

  const started = Date.now();
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: process.env.LOCAL_CHROME ?? (await chromium.executablePath()),
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(MOBILE_UA);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.6' });
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      let host = '';
      try {
        host = new URL(r.url()).hostname;
      } catch {
        /* data: 등 */
      }
      if (['image', 'media', 'font'].includes(r.resourceType()) || BLOCK.test(r.url()) || (host && isPrivateHost(host))) void r.abort();
      else void r.continue();
    });

    await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 25000 });
    let found = await waitFor(page, (t) => DAY_TEXT.test(t), 6000);

    // '일정' 탭·버튼 누르기 (이미 보이면 생략)
    if (!found) {
      await page.evaluate((labels: string[]) => {
        // 링크·버튼·탭을 먼저, 같은 글자를 가진 요소 중 가장 안쪽(클릭 처리기가 달린 쪽)을 누른다
        const pick = (sel: string, label: string) =>
          [...document.querySelectorAll<HTMLElement>(sel)].find(
            (e) => e.innerText?.trim() === label && e.getClientRects().length > 0 && ![...e.children].some((c) => (c as HTMLElement).innerText?.trim() === label),
          );
        for (const label of labels) {
          const el = pick('a, button, [role="tab"]', label) ?? pick('li, span, div, p', label);
          if (el) {
            (el.querySelector<HTMLElement>('a, button') ?? el).click();
            return;
          }
        }
      }, TAB_LABELS);
      found = await waitFor(page, (t) => DAY_TEXT.test(t), 6000);
    }

    await new Promise((r) => setTimeout(r, 1000));
    await expandAll(page);

    // 아래로 내려 늦게 뜨는 일정까지 불러온다. 글자 수가 더 늘지 않으면 멈춘다.
    let prev = 0;
    for (let i = 0; i < 12 && Date.now() - started < 40000; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
      await new Promise((r) => setTimeout(r, 450));
      const len = (await bodyText(page)).length;
      if (len === prev && i > 3) break;
      prev = len;
    }

    const data = await page.evaluate(() => {
      const meta = (k: string) => document.querySelector<HTMLMetaElement>(`meta[property="${k}"], meta[name="${k}"]`)?.content ?? undefined;
      return {
        title: meta('og:title') ?? document.title,
        description: meta('og:description') ?? meta('description'),
        image: meta('og:image'),
        site_name: meta('og:site_name'),
        text: document.body?.innerText ?? '',
      };
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ url: page.url(), ...data, text: data.text.slice(0, 60000), hasSchedule: DAY_TEXT.test(data.text), ms: Date.now() - started });
  } catch (e) {
    res.status(200).json({ error: 'render_failed', message: e instanceof Error ? e.message.slice(0, 200) : 'unknown' });
  } finally {
    await browser.close().catch(() => undefined);
  }
}
