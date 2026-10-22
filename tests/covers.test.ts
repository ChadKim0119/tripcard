import { describe, expect, it } from 'vitest';
import { coverFromMap, DESTINATION_COVERS } from '../src/lib/covers';

describe('여행지 대표 사진', () => {
  it('목적지 이름으로 찾기', () => {
    expect(coverFromMap('북해도')).toContain('Hokkaido');
    expect(coverFromMap('오사카')).toContain('Osaka_Castle');
    expect(coverFromMap('도야/북해도')).toContain('Hokkaido');
    expect(coverFromMap('제주')).toContain('Seongsan');
    expect(coverFromMap('')).toBeNull();
    expect(coverFromMap('어딘가')).toBeNull();
  });
  it('모든 사진은 위키미디어 jpg 썸네일', () => {
    for (const u of Object.values(DESTINATION_COVERS)) expect(u).toMatch(/^https:\/\/(thumb|upload)\.wikimedia\.org\/.+\.(jpe?g)$/i);
  });
});
