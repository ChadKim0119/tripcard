import { describe, expect, it } from 'vitest';
import {
  dDay,
  dayLabel,
  defaultChecklist,
  formatRange,
  guessDestination,
  isDomestic,
  linkCategory,
  parseItinerary,
  placeQuery,
  researchLinks,
  tripLength,
  tripPhase,
} from '../src/lib/trip';
import { tripTokenFromPath } from '../src/lib/tripStore';

const AGENCY = `[하나투어] 오사카/교토 4박 5일 가족여행
출발일 2026.11.03 (화) ~ 2026.11.07 (토)
1일차 인천 출발
09:30 인천국제공항 출발
11:20 간사이 국제공항 도착
오후 2시 오사카성 관광
석식: 도톤보리 자유식
2일차 교토
08:00 호텔 조식 후 교토로 이동
기요미즈데라
후시미이나리 신사
3일차 유니버설 스튜디오 재팬 (자유일정)
4일차 나라 공원 · 사슴 먹이주기
5일차 간사이 공항 출발 → 인천 도착`;

describe('parseItinerary', () => {
  const p = parseItinerary(AGENCY);
  it('출발·도착일', () => {
    expect(p.start_date).toBe('2026-11-03');
    expect(p.end_date).toBe('2026-11-07');
  });
  it('일차별 항목과 시간', () => {
    expect(p.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
    const d1 = p.days[0].items;
    expect(d1.find((i) => i.title.includes('간사이'))?.time).toBe('11:20');
    expect(d1.find((i) => i.title.includes('오사카성'))?.time).toBe('14:00');
    expect(p.days[1].items.some((i) => i.title.includes('기요미즈데라'))).toBe(true);
  });
  it('줄바꿈 없는 페이지 본문도 일차로 자른다', () => {
    const flat = 'DAY 1 인천 출발 김포 도착 DAY 2 성산일출봉 우도 DAY 3 공항 이동';
    expect(parseItinerary(flat).days.map((d) => d.day)).toEqual([1, 2, 3]);
  });
  it('N박 M일로 도착일 추정', () => {
    expect(parseItinerary('2026-05-01 출발 3박 4일 패키지').end_date).toBe('2026-05-04');
  });
  it('일차 순서가 맞지 않는 잡음은 무시', () => {
    expect(parseItinerary('3일째 되는 날 이야기').days).toEqual([]);
  });
});

describe('trip helpers', () => {
  it('목적지 추측', () => {
    expect(guessDestination('[하나투어] 오사카/교토 4박 5일')).toBe('오사카');
    expect(guessDestination('제주 2박3일 렌터카')).toBe('제주');
    expect(guessDestination('그냥 여행')).toBe('');
  });
  it('국내 여부에 따라 체크리스트가 달라진다', () => {
    expect(isDomestic('제주')).toBe(true);
    expect(isDomestic('오사카')).toBe(false);
    expect(defaultChecklist('오사카').some((c) => c.title.startsWith('여권'))).toBe(true);
    expect(defaultChecklist('제주').some((c) => c.title.startsWith('여권'))).toBe(false);
    expect(defaultChecklist('제주').some((c) => c.phase === 'after')).toBe(true);
  });
  it('단계·D-day·날짜 표시', () => {
    const t = { start_date: '2026-11-03', end_date: '2026-11-07' };
    expect(tripPhase(t, '2026-10-22')).toBe('before');
    expect(dDay(t, '2026-10-22')).toBe('D-12');
    expect(dDay(t, '2026-11-04')).toBe('여행 2일차');
    expect(tripPhase(t, '2026-11-08')).toBe('after');
    expect(dayLabel(t, 2)).toBe('2일차 · 11월 4일 (수)');
    expect(formatRange(t)).toContain('4박 5일');
    expect(tripLength(t)).toBe(5);
  });
  it('유튜브·블로그 검색 링크', () => {
    const links = researchLinks({ destination: '오사카', title: '', start_date: '2026-11-03', members: ['우리', '민수네'] });
    expect(links.find((l) => l.kind === 'youtube')?.url).toBe('https://www.youtube.com/results?search_query=' + encodeURIComponent('오사카 여행 브이로그'));
    expect(links.some((l) => l.kind === 'blog' && l.query.includes('아이와'))).toBe(true);
    expect(links.some((l) => l.query.includes('11월 날씨'))).toBe(true);
    expect(placeQuery({ title: '오사카성 관광' }, '오사카')).toBe('오사카성');
    expect(placeQuery({ title: '기요미즈데라' }, '교토')).toBe('교토 기요미즈데라');
    expect(placeQuery({ title: '식사' }, '북해도')).toBe('');
    expect(placeQuery({ title: '인천 출발 → 삿포로' }, '북해도')).toBe('');
    expect(placeQuery({ title: '북해도 최대의 칼데라 호수의 고장, 도야로 이동' }, '북해도')).toBe('');
    expect(placeQuery({ title: '숙박: 노보리베츠 석수정 호텔 (4성급 ★★★★) 외 3곳 중 확정' }, '북해도')).toBe('북해도 노보리베츠 석수정 호텔');
    expect(placeQuery({ title: '호텔 조식 후 교토로 이동' }, '오사카')).toBe('오사카 호텔 조식 후 교토');
  });
  it('자료 분류', () => {
    expect(linkCategory('https://youtu.be/abc123XYZ')).toBe('유튜브');
    expect(linkCategory('https://blog.naver.com/x/1')).toBe('블로그');
    expect(linkCategory('https://example.com')).toBe('웹');
  });
  it('공유 링크 경로', () => {
    expect(tripTokenFromPath('/t/0123456789abcdef0123456789abcdef')).toBe('0123456789abcdef0123456789abcdef');
    expect(tripTokenFromPath('/')).toBeNull();
  });
});
