import { hostOf, youtubeId } from './detect';

/**
 * 여행 프로젝트 — 여행사 일정·상품 링크 하나로 만드는 카드.
 * 일정(plan) · 체크리스트(check) · 기록(note) · 자료 링크(link) 를 trip_entries 한 테이블에 담는다.
 * 순수 함수만 둔다 (테스트 대상). 서버 통신은 tripStore.ts.
 */

export type EntryKind = 'plan' | 'check' | 'note' | 'link';
export type Phase = 'before' | 'during' | 'after';

export interface Trip {
  id: string;
  share_token: string;
  share_enabled: boolean;
  is_owner: boolean;
  title: string;
  destination: string;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;
  cover: string | null;
  source_url: string | null;
  summary: string;
  members: string[];
  created_at: string;
  updated_at: string;
  /* my_trips() 가 붙여 주는 요약 */
  check_total?: number;
  check_done?: number;
  plan_count?: number;
  note_count?: number;
}

export interface TripEntry {
  id: string;
  trip_id?: string;
  kind: EntryKind;
  phase: Phase;
  day: number | null; // 1일차 = 1, 미정 = null
  time: string;
  title: string;
  body: string;
  url: string | null;
  thumbnail: string | null;
  site_name: string | null;
  group_name: string;
  done: boolean;
  done_by: string | null;
  author: string;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

export type TripPatch = Partial<Pick<Trip, 'title' | 'destination' | 'start_date' | 'end_date' | 'cover' | 'source_url' | 'summary' | 'members'>>;

export const PHASE_LABEL: Record<Phase, string> = { before: '여행 전', during: '여행 중', after: '다녀온 후' };

let seq = 0;
/** 같은 밀리초에 여러 개를 만들어도 순서가 유지되는 정렬값 */
export function nextSort(): number {
  seq = (seq + 1) % 1000;
  return Date.now() / 1000 + seq / 1e6;
}

export function newEntry(kind: EntryKind, fields: Partial<TripEntry> = {}): TripEntry {
  return {
    id: crypto.randomUUID(),
    kind,
    phase: 'before',
    day: null,
    time: '',
    title: '',
    body: '',
    url: null,
    thumbnail: null,
    site_name: null,
    group_name: '',
    done: false,
    done_by: null,
    author: '',
    sort: nextSort(),
    ...fields,
  };
}

/* ------------------------------------------------------------------ 날짜 */

const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseISODate(s: string | null | undefined): Date | null {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)!;
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b)!.getTime() - parseISODate(a)!.getTime()) / 86400000);
}

/** 여행 일수 (날짜가 없으면 일정에 적힌 최대 일차) */
export function tripLength(trip: Pick<Trip, 'start_date' | 'end_date'>, entries: TripEntry[] = []): number {
  const maxDay = entries.reduce((m, e) => (e.kind === 'plan' && e.day ? Math.max(m, e.day) : m), 0);
  if (trip.start_date && trip.end_date) return Math.max(maxDay, daysBetween(trip.start_date, trip.end_date) + 1);
  return maxDay;
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function dayLabel(trip: Pick<Trip, 'start_date'>, day: number): string {
  if (!trip.start_date) return `${day}일차`;
  const d = parseISODate(addDays(trip.start_date, day - 1))!;
  return `${day}일차 · ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

export function formatRange(trip: Pick<Trip, 'start_date' | 'end_date'>): string {
  const a = parseISODate(trip.start_date);
  const b = parseISODate(trip.end_date);
  if (!a) return '날짜 미정';
  const f = (d: Date, withYear: boolean) => `${withYear ? `${d.getFullYear()}. ` : ''}${d.getMonth() + 1}. ${d.getDate()}.`;
  const thisYear = a.getFullYear() === new Date().getFullYear();
  if (!b || b.getTime() === a.getTime()) return f(a, !thisYear);
  const nights = daysBetween(trip.start_date!, trip.end_date!);
  return `${f(a, !thisYear)} – ${f(b, b.getFullYear() !== a.getFullYear())} · ${nights}박 ${nights + 1}일`;
}

/** 지금 여행의 어느 단계인지 — 탭 기본값·D-day 표시에 쓴다 */
export function tripPhase(trip: Pick<Trip, 'start_date' | 'end_date'>, today = toISODate(new Date())): Phase {
  if (!trip.start_date) return 'before';
  if (today < trip.start_date) return 'before';
  if (today <= (trip.end_date ?? trip.start_date)) return 'during';
  return 'after';
}

export function dDay(trip: Pick<Trip, 'start_date' | 'end_date'>, today = toISODate(new Date())): string {
  if (!trip.start_date) return '날짜 미정';
  const phase = tripPhase(trip, today);
  if (phase === 'before') {
    const n = daysBetween(today, trip.start_date);
    return n === 0 ? 'D-DAY' : `D-${n}`;
  }
  if (phase === 'during') return `여행 ${daysBetween(trip.start_date, today) + 1}일차`;
  return '다녀옴';
}

/* ------------------------------------------------------------------ 목적지 */

const DOMESTIC = ['제주', '서귀포', '부산', '강릉', '속초', '양양', '경주', '여수', '전주', '통영', '거제', '남해', '포항', '안동', '가평', '춘천', '서울', '인천', '대구', '광주', '대전', '울릉', '평창', '태안', '단양'];
const OVERSEAS = [
  '도쿄', '오사카', '교토', '나라', '고베', '후쿠오카', '삿포로', '홋카이도', '북해도', '오타루', '노보리베츠', '비에이', '후라노', '하코다테', '오키나와', '나고야', '규슈', '유후인', '벳푸', '하코네', '일본',
  '다낭', '호이안', '나트랑', '나짱', '하노이', '호치민', '푸꾸옥', '달랏', '하롱베이', '베트남',
  '방콕', '파타야', '푸켓', '치앙마이', '끄라비', '코사무이', '태국', '싱가포르', '쿠알라룸푸르', '코타키나발루', '말레이시아',
  '발리', '인도네시아', '세부', '보라카이', '보홀', '마닐라', '필리핀', '괌', '사이판', '하와이', '호놀룰루',
  '타이베이', '타이중', '가오슝', '대만', '홍콩', '마카오', '상하이', '베이징', '칭다오', '장가계', '중국',
  '울란바토르', '몽골', '라오스', '비엔티안', '루앙프라방', '캄보디아', '씨엠립',
  '파리', '런던', '로마', '피렌체', '베네치아', '밀라노', '바르셀로나', '마드리드', '스위스', '인터라켄', '프라하', '빈', '부다페스트',
  '이탈리아', '프랑스', '스페인', '포르투갈', '리스본', '독일', '뮌헨', '영국', '아이슬란드', '터키', '이스탄불', '튀르키예', '두바이', '이집트',
  '뉴욕', '로스앤젤레스', '샌프란시스코', '라스베이거스', '시애틀', '캐나다', '밴쿠버', '미국', '시드니', '멜버른', '호주', '뉴질랜드', '몰디브',
];
const ALIASES: Record<string, string> = { la: '로스앤젤레스', 엘에이: '로스앤젤레스', 나짱: '나트랑', 튀르키예: '터키' };

/** 제목·본문에서 목적지 이름을 찾는다. 앞에 나온 것 우선, 같은 위치면 구체적인(긴) 지명. */
export function guessDestination(text: string): string {
  const t = text.toLowerCase();
  let best: { name: string; at: number } | null = null;
  for (const name of [...OVERSEAS, ...DOMESTIC, ...Object.keys(ALIASES)]) {
    const at = /^[a-z]+$/.test(name) ? t.search(new RegExp(`\\b${name}\\b`)) : t.indexOf(name);
    if (at === -1) continue;
    if (!best || at < best.at || (at === best.at && name.length > best.name.length)) best = { name, at };
  }
  return best ? (ALIASES[best.name] ?? best.name) : '';
}

export function isDomestic(destination: string): boolean {
  return !!destination && DOMESTIC.some((d) => destination.includes(d)) || /국내|한국/.test(destination);
}

/* ------------------------------------------------------------------ 일정 파싱 */

export interface ParsedItinerary {
  start_date?: string;
  end_date?: string;
  days: { day: number; items: { time: string; title: string; body: string }[] }[];
}

const DATE_RE = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/g;
// 1일차 · 제1일 · DAY 1 · Day1 · 1일째 · [1일]
const DAY_RE = /(?:^|[\s\[(【<|·•])(?:DAY\s*-?\s*0?(\d{1,2})|제\s*(\d{1,2})\s*일(?!\s*[~\-])|(\d{1,2})\s*일\s*(?:차|째))/gi;
const TIME_RE = /^(?:(오전|오후|AM|PM)\s*)?(\d{1,2})(?::(\d{2})|\s*시(?:\s*(\d{1,2})\s*분)?)\s*(AM|PM)?[\s\-–~:)]*/i;
const NOISE = /^(?:[-–—=_*#•·▶▷►◆◇■□○●※|]+|일정|상세\s*일정|여행\s*일정|교통편?|식사|숙박|호텔|일자|지역|시간)$/;

function cleanLine(s: string) {
  return s.replace(/^[\s\-–—*•·▶▷►◆◇■□○●※>|]+/, '').replace(/\s+/g, ' ').trim();
}

function parseTime(line: string): { time: string; rest: string } {
  const m = line.match(TIME_RE);
  if (!m || Number(m[2]) > 24) return { time: '', rest: line };
  let h = Number(m[2]);
  const ap = (m[1] ?? m[5] ?? '').toLowerCase();
  if ((ap === '오후' || ap === 'pm') && h < 12) h += 12;
  if ((ap === '오전' || ap === 'am') && h === 12) h = 0;
  const min = m[3] ?? m[4] ?? '00';
  return { time: `${pad(h)}:${pad(Number(min))}`, rest: line.slice(m[0].length).trim() };
}

/**
 * 여행사 일정표 텍스트(붙여넣기 또는 페이지 본문)를 일차별 항목으로 나눈다.
 * 줄바꿈이 없는 한 덩어리 본문도 일차 표시를 기준으로 자른다.
 */
export function parseItinerary(text: string): ParsedItinerary {
  const out: ParsedItinerary = { days: [] };
  const dates = [...text.matchAll(DATE_RE)]
    .map((m) => `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`)
    .filter((d) => parseISODate(d) && Number(d.slice(5, 7)) <= 12 && Number(d.slice(8, 10)) <= 31);
  if (dates.length) {
    const sorted = [...new Set(dates)].sort();
    out.start_date = sorted[0];
    const last = sorted[sorted.length - 1];
    if (last !== sorted[0] && daysBetween(sorted[0], last) <= 60) out.end_date = last;
  }
  const nights = text.match(/(\d{1,2})\s*박\s*(\d{1,2})\s*일/);
  if (out.start_date && !out.end_date && nights) out.end_date = addDays(out.start_date, Number(nights[2]) - 1);

  const marks = [...text.matchAll(DAY_RE)]
    .map((m) => ({ day: Number(m[1] ?? m[2] ?? m[3]), at: m.index! + (m[0].length - m[0].trimStart().length), len: m[0].trimStart().length }))
    .filter((m) => m.day >= 1 && m.day <= 60);
  // 일차가 1부터 차례로 늘어나는 표시만 쓴다 (본문 속 "3일째 되는 날" 같은 잡음 제거)
  const seqMarks: typeof marks = [];
  for (const m of marks) {
    const prev = seqMarks[seqMarks.length - 1];
    if (prev ? m.day === prev.day + 1 || (m.day === prev.day && m.at - prev.at > 400) : m.day === 1) {
      if (prev && m.day === prev.day) continue;
      seqMarks.push(m);
    }
  }
  for (let i = 0; i < seqMarks.length; i++) {
    const m = seqMarks[i];
    const chunk = text.slice(m.at + m.len, seqMarks[i + 1]?.at ?? text.length).slice(0, 4000);
    const lines = chunk
      .split(/\n|(?<=[.!?])\s+(?=\S)|\s{3,}|(?=(?:오전|오후)\s*\d{1,2}\s*시)|(?=\s\d{1,2}:\d{2}\s)/)
      .map(cleanLine)
      .filter((l) => l && l.length > 1 && !NOISE.test(l));
    const items: ParsedItinerary['days'][number]['items'] = [];
    for (const raw of lines) {
      const { time, rest } = parseTime(raw);
      const line = rest.replace(/^[:\-–\s]+/, '');
      if (!line) continue;
      if (line.length > 120 && items.length) {
        const last = items[items.length - 1];
        last.body = last.body ? `${last.body}\n${line}` : line;
        continue;
      }
      items.push({ time, title: line.slice(0, 200), body: line.length > 200 ? line.slice(200) : '' });
      if (items.length >= 30) break;
    }
    // 머리줄 남은 부분("1일차 인천 – 오사카")이 첫 항목이 되므로 그대로 둔다
    out.days.push({ day: m.day, items });
  }
  return out;
}

/* ------------------------------------------------------------------ 템플릿 */

export function defaultChecklist(destination: string): TripEntry[] {
  const domestic = isDomestic(destination);
  const groups: [string, Phase, string[]][] = [
    [
      '예약·서류',
      'before',
      domestic
        ? ['교통편 예약 확인', '숙소 예약 확인', '렌터카·주차 확인', '신분증']
        : ['여권 (유효기간 6개월 이상)', '항공권 · e티켓', '숙소 예약 확인', '여행자 보험', '비자·입국 신고 (필요 시)', '환전 · 트래블 카드'],
    ],
    ['통신·이동', 'before', domestic ? ['내비·지도 앱 오프라인 저장', '맛집·명소 예약'] : ['eSIM · 유심 · 로밍', '공항 이동 방법', '현지 교통패스·앱', '지도 앱 오프라인 저장']],
    ['짐', 'before', ['충전기 · 보조배터리', ...(domestic ? [] : ['멀티 어댑터']), '상비약', '세면도구 · 화장품', '옷 · 신발 (날씨 확인)', '아이 물품 (필요 시)']],
    ['출발 전날', 'before', ['날씨 다시 확인', '짐 무게 확인', '집 정리 · 가스 · 창문']],
    ['다녀온 후', 'after', ['사진 · 영상 모아서 공유', '경비 정산', '여행 기록 남기기', '다음 여행 아이디어 메모']],
  ];
  return groups.flatMap(([group_name, phase, titles]) => titles.map((title) => newEntry('check', { title, group_name, phase })));
}

/** 기록을 풍부하게 — 단계별로 떠올리기 좋은 질문 */
export const NOTE_PROMPTS: Record<Phase, string[]> = {
  before: ['이번 여행에서 가장 기대하는 것', '꼭 해 보고 싶은 것', '가족·일행이 원하는 것'],
  during: ['오늘의 한 장면', '오늘 먹은 것 중 최고', '예상과 달랐던 점'],
  after: ['가장 좋았던 순간', '다시 간다면 꼭 할 것 · 안 할 것', '맛집 베스트', '다음 여행에 챙길 것', '아이(일행)가 가장 좋아한 것'],
};

/* ------------------------------------------------------------------ 자료 검색 링크 */

export type ResearchKind = 'youtube' | 'blog' | 'map' | 'web';

export interface ResearchLink {
  kind: ResearchKind;
  label: string;
  query: string;
  url: string;
}

export const RESEARCH_LABEL: Record<ResearchKind, string> = { youtube: '유튜브', blog: '블로그', map: '지도', web: '웹' };

export function searchUrl(kind: ResearchKind, query: string): string {
  const q = encodeURIComponent(query);
  switch (kind) {
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${q}`;
    case 'blog':
      return `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${q}`;
    case 'map':
      return `https://www.google.com/maps/search/?api=1&query=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

/** 목적지·시기에 맞춘 추천 검색 (유튜브 브이로그·블로그 후기·날씨 등) */
export function researchLinks(trip: Pick<Trip, 'destination' | 'title' | 'start_date' | 'members'>): ResearchLink[] {
  const dest = trip.destination || trip.title.split(/[\s,·|/]+/).slice(0, 2).join(' ');
  if (!dest) return [];
  const month = parseISODate(trip.start_date)?.getMonth();
  const family = trip.members.length > 1 || /가족|아이|키즈/.test(trip.title);
  const list: [ResearchKind, string, string][] = [
    ['youtube', '여행 브이로그', `${dest} 여행 브이로그`],
    ['youtube', '여행 코스', `${dest} 여행 코스 추천`],
    ['blog', '여행 후기', `${dest} 여행 후기`],
    ['blog', '맛집', `${dest} 맛집`],
    ['blog', family ? '가족·아이와 가볼 곳' : '가볼 만한 곳', family ? `${dest} 아이와 가볼만한곳` : `${dest} 가볼만한곳`],
    ['blog', '준비물', `${dest} 여행 준비물`],
    ['web', month !== undefined ? `${month + 1}월 날씨·옷차림` : '날씨', month !== undefined ? `${dest} ${month + 1}월 날씨 옷차림` : `${dest} 날씨`],
    ['map', '지도', dest],
  ];
  return list.map(([kind, label, query]) => ({ kind, label, query, url: searchUrl(kind, query) }));
}

/**
 * 일정 한 줄에서 검색어로 쓸 장소 이름 — 이동·식사 같은 군말을 덜어낸다.
 * 장소가 아닌 줄(식사, 항공 구간, '○○로 이동' 같은 안내문)은 빈 문자열 → 검색 버튼을 감춘다.
 */
export function placeQuery(entry: Pick<TripEntry, 'title'>, destination: string): string {
  const t = entry.title.trim();
  if (/^(식사|조식|중식|석식)$/.test(t) || /출발\s*→/.test(t)) return '';
  if (t.length > 14 && /(이동|휴식|체크인|자유\s*시간)/.test(t)) return '';
  const core = t
    .replace(/^숙박\s*[:：]\s*/, '')
    .replace(/\s*외\s*\d+곳.*$/, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/(?:으로|로)?\s*(?:이동|출발|도착|관광|투어|방문|체크인|체크아웃|자유\s*시간|자유\s*일정)(?:[\s,·].*)?$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  if (!core) return destination;
  return destination && !core.includes(destination) ? `${destination} ${core}` : core;
}

/** 자료 링크 분류 — 카드의 작은 배지 */
export function linkCategory(url: string): string {
  if (youtubeId(url)) return '유튜브';
  const h = hostOf(url);
  if (/(^|\.)(blog\.naver\.com|m\.blog\.naver\.com|tistory\.com|brunch\.co\.kr|velog\.io|medium\.com|post\.naver\.com)$/.test(h)) return '블로그';
  if (/(^|\.)(instagram\.com|tiktok\.com)$/.test(h)) return 'SNS';
  if (/(maps\.google|google\.[a-z.]+\/maps|map\.naver\.com|map\.kakao\.com)/.test(url)) return '지도';
  return '웹';
}

/* ------------------------------------------------------------------ 진행률 */

export function checklistProgress(entries: TripEntry[], phase?: Phase) {
  const list = entries.filter((e) => e.kind === 'check' && (!phase || e.phase === phase));
  return { done: list.filter((e) => e.done).length, total: list.length };
}
