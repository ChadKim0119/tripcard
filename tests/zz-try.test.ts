import { it } from 'vitest';
import { readFileSync } from 'fs';
import { parseItinerary } from '../src/lib/trip';
it('x', () => {
  const p = parseItinerary(readFileSync('/tmp/claude-0/-home-user/da760ebe-4aca-57c1-b196-79888503acd3/scratchpad/rendered.txt', 'utf8'));
  console.log('DATES', p.start_date, p.end_date, 'DAYS', p.days.length);
  for (const d of p.days) console.log(d.day, d.items.length, d.items.slice(0, 9).map((i) => (i.time ? i.time + ' ' : '') + i.title.slice(0, 30)).join(' | '));
});
