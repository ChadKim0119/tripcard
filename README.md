# 트립카드

여행사 일정·상품 링크 하나로 **여행 카드**를 만들고, 공유 링크로 가족·일행과 함께 준비하고 기록하는 여행 앱.
여행 가기 전(일정·체크리스트·자료)부터 다녀온 후(기록·정리)까지 한 카드에 모읍니다.

- 디자인: **MapStone Blue Infographic v1** (`src/styles/mapstone-tokens.css` 원본 + `tokens.css` 확장)
- 프론트: Vite + React 19 + TypeScript (정적 배포, Vercel)
- 백엔드: Supabase (Postgres + RLS · Auth · Realtime broadcast · Edge Functions) — **MyArchive 와 같은 프로젝트**(`zyhlhkqyigyrubovkxjr`)를 쓴다. 계정은 공유, 데이터는 `trips`·`trip_entries`·`trip_members` 로 분리, 서버 함수는 `trip-` 접두어로 분리

## 메뉴

| 메뉴 | 내용 |
|---|---|
| 내 여행 | 다가오는 여행(D-day·준비율) / 다녀온 여행. 내가 만든 여행과 링크로 참여한 여행이 함께 보임 |
| 새 여행 | 여행사 일정·상품 링크(또는 일정표 텍스트) → 제목·사진·날짜·**일차별 일정** 자동 인식(AI 또는 규칙) → 카드 확인 → 생성. 유튜브·블로그 링크는 자료로 저장. 목록 화면에서 링크를 붙여넣어도 시작 |
| 여행 카드 · 일정 | 일차·날짜별 일정, 장소마다 유튜브·블로그·지도 검색 |
| 여행 카드 · 체크리스트 | 국내/해외 기본 템플릿(서류·통신·짐·출발 전날·다녀온 후), 분류 추가, 누가 체크했는지 표시 |
| 여행 카드 · 기록 | 여행 전·중·다녀온 후 질문으로 시작하는 기록, 작성자 표시. 다녀온 뒤에는 이 탭이 먼저 열림 |
| 여행 카드 · 자료 | 유튜브·블로그·지도 링크 저장, 목적지·시기 맞춤 검색 링크(브이로그·맛집·아이와 갈 곳·준비물·날씨) |
| 함께 쓰기 | 공유 링크 `/t/<토큰>` — 로그인 없이 보고 수정, 모든 기기에 실시간 반영. 로그인한 사람이 열면 그 사람 목록에 추가. 소유자는 공유 끄기·새 링크 |
| 설정 | 계정·로그아웃, 테마, 버전(리비전 히스토리) |

## 설치 (다른 Supabase 프로젝트로 옮길 때)

1. Supabase 프로젝트를 만들고 `supabase/migrations/20261022000000_init.sql` 을 적용한다.
2. Edge Functions `trip-unfurl`(링크 읽기), `trip-ai`(일정 정리)를 배포한다 (`verify_jwt` 켬).
   (선택) Secrets 에 `ANTHROPIC_API_KEY` — 없으면 규칙 기반 일정 인식만 쓴다. `AI_MODEL` 로 모델 변경(기본 `claude-opus-5-5`).
3. Vercel 프로젝트 환경 변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`(publishable key) 를 지정하고 배포한다.
4. Supabase Auth → URL Configuration 의 Redirect URLs 에 배포 주소를 추가한다 (가입 확인·비밀번호 재설정 메일 링크).

## 개발

```bash
npm install
npm run dev     # 기본값으로 MyArchive Supabase 프로젝트에 연결
npm test        # 일정 파서·템플릿·검색 링크 단위 테스트
npm run build
```
