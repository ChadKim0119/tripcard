// 모두투어 패키지 상품 → 여행 카드 일정.
// 상품 페이지(m.modetour.com/package/<번호>)는 일정을 브라우저에서 API 로 불러오므로 HTML 에는 일정이 없다.
// 같은 API(b2c-api.modetour.com)를 읽어 일차별 항목으로 바꾼다. 순수 함수만 둔다 (테스트 대상).

export interface Itinerary {
  title: string;
  start_date: string;
  end_date: string;
  summary: string;
  days: { day: number; items: { time: string; title: string; note: string }[] }[];
}

interface Place {
  itiSeq?: number | null;
  itiServiceName?: string | null;
  itiPlaceName?: string | null;
  placeNameK?: string | null;
  itiSummaryDes?: string | null;
}

interface AirLeg {
  departureCityName?: string | null;
  departureTime?: string | null;
  arrivalCityName?: string | null;
  arrivalTime?: string | null;
  departureFlight?: string | null;
  departureFlightDuration?: string | null;
  transportName?: string | null;
}

interface Day {
  ortherActions?: Place[];
  listLocalPlace?: Place[];
  allPlaceTravelToday?: Place[];
  listGuidePlace?: Place[];
  listHotelPlace?: Place[];
  listMealPlace?: Place[];
  listAirRouteInfo?: { item?: AirLeg[] | null } | null;
}

export interface PackageInfo {
  result?: {
    pName?: string;
    date?: { sdate?: string; edate?: string; night?: number; days?: number };
    transport?: { name?: string; startNumber?: string };
    price?: { adult?: number };
  };
}

export interface ScheduleList {
  result?: { scheduleItemList?: Day[] };
}

/** 모두투어 상품 주소면 상품 번호 */
export function modetourProductNo(url: URL): string | null {
  if (!/(^|\.)modetour\.com$/.test(url.hostname)) return null;
  return url.pathname.match(/\/package\/(\d{5,})/)?.[1] ?? null;
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const placeName = (p: Place) => clean(p.itiPlaceName ?? p.placeNameK).replace(/\s*\((동계|하계)\)/g, '');

type Item = { time: string; title: string; note: string; kind: 'flight' | 'place' | 'move' | 'meal' | 'hotel' };

function dayItems(day: Day): Item[] {
  const items: Item[] = [];

  // 항공: 출발 구간(시간·도시)과 도착 구간(도시·편명)이 따로 온다
  const legs = day.listAirRouteInfo?.item ?? [];
  const dep = legs.find((l) => l.departureTime && l.departureCityName);
  const arr = legs.find((l) => l.arrivalCityName);
  const flight = legs.find((l) => l.departureFlight);
  if (dep) {
    items.push({
      kind: 'flight',
      time: dep.departureTime ?? '',
      title: `${dep.departureCityName} 출발${arr?.arrivalCityName ? ` → ${arr.arrivalCityName}` : ''}`,
      note: [flight?.transportName, flight?.departureFlight, flight?.departureFlightDuration ? `비행 ${flight.departureFlightDuration}` : '', arr?.arrivalTime ? `${arr.arrivalTime} 도착` : '']
        .filter(Boolean)
        .join(' · '),
    });
  }

  const places = [...(day.ortherActions ?? []), ...(day.listLocalPlace ?? []), ...(day.allPlaceTravelToday ?? []), ...(day.listGuidePlace ?? [])].sort(
    (a, b) => (a.itiSeq ?? 0) - (b.itiSeq ?? 0),
  );
  for (const p of places) {
    const svc = clean(p.itiServiceName);
    const name = placeName(p);
    const summary = clean(p.itiSummaryDes);
    if (/유의|안내사항/.test(svc)) continue;
    if (svc.startsWith('관광') || (name && svc !== '기타단문' && svc !== '이동정보 안내')) {
      if (name) items.push({ kind: 'place', time: '', title: name, note: summary });
    } else if (svc === '이동정보 안내' && summary) {
      items.push({ kind: 'move', time: '', title: summary.slice(0, 80), note: summary.length > 80 ? summary : '' });
    } else if (summary) {
      // 짧은 안내문은 바로 앞 관광지의 메모로 붙인다 (첫 관광지 앞의 공지성 문구는 버린다)
      const last = items[items.length - 1];
      if (last && (last.kind === 'place' || last.kind === 'move')) last.note = last.note ? `${last.note}\n${summary}` : summary;
    }
  }

  const meals = (day.listMealPlace ?? []).map((m) => `${clean(m.itiServiceName)} ${clean(m.itiSummaryDes)}`.trim()).filter(Boolean);
  if (meals.length) items.push({ kind: 'meal', time: '', title: '식사', note: meals.join('\n') });

  const hotels = (day.listHotelPlace ?? []).map(placeName).filter(Boolean);
  if (hotels.length)
    items.push({
      kind: 'hotel',
      time: '',
      title: hotels.length > 1 ? `숙박: ${hotels[0]} 외 ${hotels.length - 1}곳 중 확정` : `숙박: ${hotels[0]}`,
      note: hotels.length > 1 ? hotels.join('\n') : '',
    });

  return items;
}

export function modetourItinerary(info: PackageInfo | null, schedule: ScheduleList | null): Itinerary | null {
  const list = schedule?.result?.scheduleItemList ?? [];
  const r = info?.result;
  if (!list.length && !r?.pName) return null;
  const d = r?.date;
  const summary = [
    d?.night && d?.days ? `${d.night}박 ${d.days}일` : '',
    [r?.transport?.name, r?.transport?.startNumber].filter(Boolean).join(' '),
    r?.price?.adult ? `성인 ${r.price.adult.toLocaleString('ko-KR')}원` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    title: clean(r?.pName),
    start_date: d?.sdate ?? '',
    end_date: d?.edate ?? '',
    summary,
    days: list
      .map((day, i) => ({ day: i + 1, items: dayItems(day).map(({ time, title, note }) => ({ time, title: title.slice(0, 200), note: note.slice(0, 1000) })) }))
      .filter((x) => x.items.length),
  };
}
