import { describe, expect, it } from 'vitest';
import { modetourItinerary, modetourProductNo } from '../supabase/functions/trip-unfurl/modetour';
import fixture from './fixtures/modetour-112891965.json';

describe('모두투어 상품 → 일정', () => {
  it('상품 번호', () => {
    expect(modetourProductNo(new URL('https://m.modetour.com/package/112891965#schedule'))).toBe('112891965');
    expect(modetourProductNo(new URL('https://www.modetour.com/package/112891965?MLoc=99'))).toBe('112891965');
    expect(modetourProductNo(new URL('https://example.com/package/112891965'))).toBeNull();
  });

  const it_ = modetourItinerary(fixture.info, fixture.schedule)!;
  it('제목·날짜·요약', () => {
    expect(it_.title).toContain('도야/북해도 4일');
    expect(it_.start_date).toBe('2026-12-27');
    expect(it_.end_date).toBe('2026-12-30');
    expect(it_.summary).toContain('3박 4일');
    expect(it_.summary).toContain('에어프레미아 YP751');
  });
  it('일차별 항목', () => {
    expect(it_.days.map((d) => d.day)).toEqual([1, 2, 3, 4]);
    const d1 = it_.days[0].items;
    expect(d1[0]).toMatchObject({ time: '09:40', title: '인천 출발 → 삿포로' });
    expect(d1.map((i) => i.title)).toEqual(expect.arrayContaining(['지옥계곡', '지다이무라', '식사']));
    expect(d1.find((i) => i.title.startsWith('숙박'))?.title).toContain('외 3곳 중 확정');
    // 첫 관광지 앞의 공지성 문구는 들어가지 않는다
    expect(d1.some((i) => i.note.includes('투숙 지역 순서'))).toBe(false);
    const d2 = it_.days[1].items.map((i) => i.title);
    expect(d2).toEqual(expect.arrayContaining(['도야호수 유람선 탑승', '쇼와신잔', '사이로 전망대']));
    expect(it_.days[2].items.map((i) => i.title)).toContain('오타루운하');
    expect(it_.days[3].items[0]).toMatchObject({ time: '13:45' });
  });
});
