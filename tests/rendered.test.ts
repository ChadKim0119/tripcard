import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { parseItinerary } from '../src/lib/trip';

// 노랑풍선 상품 페이지를 브라우저로 연 화면 글자 (후기·간략 일정·상세 일정·페이지 끝 공통 영역이 섞여 있다)
const text = readFileSync(new URL('./fixtures/ybtour-rendered.txt', import.meta.url), 'utf8');

describe('렌더링된 여행사 페이지 → 일정', () => {
  const p = parseItinerary(text);
  it('후기 속 "1일차:" 가 아니라 상세 일정을 고른다', () => {
    expect(p.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(p.days[0].items.some((i) => i.title.includes('금문교'))).toBe(true);
  });
  it('날짜는 상세 일정의 1일차·마지막 일차에서', () => {
    expect(p.start_date).toBe('2026-10-23');
    expect(p.end_date).toBe('2026-10-31');
  });
  it('시간·선택관광·식사·숙박을 나누고 페이지 끝 공통 영역은 버린다', () => {
    const d1 = p.days[0].items;
    expect(d1.find((i) => i.title === '인천 출발')?.time).toBe('16:00');
    expect(d1.map((i) => i.title)).toContain('[선택] 샌프란시스코 베이크루즈 유람선 탑승');
    expect(d1.find((i) => i.title === '식사')?.body).toContain('중식 현지식');
    const all = p.days.flatMap((d) => d.items.map((i) => i.title)).join('|');
    expect(all).not.toMatch(/고객센터|이용약관|\[선택\] \[선택|\$\d/);
    expect(p.days[8].items.map((i) => i.title)).toEqual(['인천', '샌프란시스코 출발']);
  });
});
