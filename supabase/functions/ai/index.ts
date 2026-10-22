// AI 보조 — action 'trip': 여행사 일정표·상품 페이지 본문을 일차별 일정 + 맞춤 준비물로 정리한다.
// ANTHROPIC_API_KEY 시크릿이 없으면 { enabled: false } 를 돌려주고 앱은 규칙 기반 일정 인식만 쓴다.
import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-opus-5-5';

// 여행사 일정·상품 페이지 → 여행 카드 (일차별 일정 + 맞춤 준비물)
const TRIP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '짧은 여행 이름. 예: "오사카·교토 4박 5일 가족여행"' },
    destination: { type: 'string', description: '대표 목적지 (도시 또는 나라, 한국어)' },
    start_date: { type: 'string', description: 'YYYY-MM-DD. 본문에 출발일이 없으면 빈 문자열' },
    end_date: { type: 'string', description: 'YYYY-MM-DD. 없으면 빈 문자열' },
    summary: { type: 'string', description: '상품·일정의 핵심 한두 문장 (포함/불포함, 특전 등)' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string', description: 'HH:MM 또는 빈 문자열' },
                title: { type: 'string', description: '장소·활동 이름 (짧게)' },
                note: { type: 'string', description: '식사·이동·옵션 등 부가 정보 또는 빈 문자열' },
              },
              required: ['time', 'title', 'note'],
              additionalProperties: false,
            },
          },
        },
        required: ['day', 'items'],
        additionalProperties: false,
      },
    },
    packing: { type: 'array', items: { type: 'string' }, description: '이 여행에 특히 필요한 준비물·할 일 0~8개 (여권 같은 기본 항목 제외)' },
  },
  required: ['title', 'destination', 'start_date', 'end_date', 'summary', 'days', 'packing'],
  additionalProperties: false,
};

const TRIP_SYSTEM = `너는 여행사 일정표·상품 소개 페이지를 읽어 가족 여행 플래너 카드로 정리하는 도우미다.
- 본문에 있는 일정만 옮긴다. 없는 장소·시간을 지어내지 않는다.
- 일차(1일차, DAY 1 …)별로 나누고, 한 일차 안에서는 시간 순서를 지킨다.
- 광고 문구, 약관, 가격표, 예약 안내는 일정에 넣지 않는다 (summary 에 핵심만).
- 날짜가 명확하지 않으면 빈 문자열.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  if (body.action === 'status') return json({ enabled: !!apiKey, model: MODEL });
  if (!apiKey) return json({ error: 'AI 키가 설정되지 않았습니다' }, 200);

  const s = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
  const client = new Anthropic({ apiKey });

  if (body.action === 'trip') {
    const text = [body.url ? `URL: ${s(body.url, 500)}` : '', body.title ? `페이지 제목: ${s(body.title, 300)}` : '', `본문:\n${s(body.text, 24000)}`]
      .filter(Boolean)
      .join('\n');
    try {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: TRIP_SYSTEM,
        messages: [{ role: 'user', content: text }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema: TRIP_SCHEMA } },
        betas: ['server-side-fallback-2026-07-01'],
        // @ts-ignore — SDK 타입이 아직 'default' 형태를 모를 수 있다
        fallbacks: 'default',
      });
      if (res.stop_reason === 'refusal') return json({ error: 'AI 가 이 내용을 처리하지 않았습니다' });
      const out = res.content.find((b) => b.type === 'text');
      if (!out || out.type !== 'text') return json({ error: 'AI 응답이 비었습니다' });
      return json(JSON.parse(out.text));
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? e.status : 0;
      return json({ error: status === 429 ? 'AI 요청이 많습니다. 잠시 후 다시 시도하세요' : 'AI 요청에 실패했습니다' });
    }
  }

  return json({ error: 'unknown_action' }, 400);
});
