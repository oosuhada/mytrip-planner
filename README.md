# MyTrip Planner

> One private workspace for the entire trip: booking imports, collaborative planning, maps, weather, voting, packing, outfits, and a drag-and-drop day plan.

MyTrip is a self-hosted personal travel workspace built to replace the usual mix of Sheets, Docs, chat, Notion, map bookmarks, and calendar screenshots. It is intentionally **login-free** for a small trusted travel group and stores trip state on the server in SQLite.

The first seeded project is **Kyoto · Osaka 2026 (Sep 13–17)** with the confirmed flight/hotel schedule, while booking codes, phone numbers, payment details, and confirmation tokens are intentionally excluded from source code and persisted itinerary data.

## Core experience

- **Project home** — create a new trip or jump back into an existing one.
- **AI Inbox** — paste airline/hotel/train confirmation text and turn it into structured itinerary events.
- **Day plan** — drag events between dates, edit time inline, add or delete cards quickly.
- **Map-first discovery** — MapLibre + OpenStreetMap works without an API key; Google Places is automatically preferred when a server-side key is present.
- **Saved places + voting** — friends save candidates, vote under their display name, then schedule the winner directly.
- **Live weather** — Open-Meteo forecast for each trip day.
- **Packing + outfits** — weather, duration, and gender-aware recommendations with a shared checklist.
- **Realtime collaboration** — Socket.IO broadcasts trip updates to every open browser.
- **Self-hosted persistence** — SQLite WAL mode on the Mac mini; no client-side secrets.

## 한국어 설명

MyTrip은 여행을 준비할 때 Google Sheets, Docs, 카카오톡, Notion, 지도 즐겨찾기, 캘린더에 흩어지는 정보를 **하나의 개인 여행 워크스페이스**로 모으기 위한 프로젝트입니다.

로그인 시스템 없이 소수의 동행자가 함께 사용하는 것을 전제로 하며, 실제 일정 데이터는 Mac mini의 SQLite에 저장됩니다. 항공권·숙소 예약 메일이나 메신저 내용을 그대로 붙여넣으면 AI/로컬 파서가 날짜·시간·장소를 추출해 일정으로 만들고, 지도에서 장소를 모은 뒤 친구들과 투표하고, 선택된 장소를 날짜별 일정으로 옮길 수 있습니다.

초기 프로젝트에는 **2026년 9월 13일~17일 교토·오사카 일정**의 항공/숙소 시간만 들어가며, PNR·예약번호·전화번호·결제정보·예약 관리 토큰은 코드와 일정 데이터에서 제외합니다.

## Product flow

```text
Paste booking / search a place / ask AI
                  ↓
          Shared candidate pool
                  ↓
              Group vote
                  ↓
        Drag into the day plan
                  ↓
   Live map + weather + packing list
```

## Reference patterns

The implementation was informed by several public travel-planner projects without copying their product identity:

- `liketrek/TREK` — drag-and-drop day plans, booking import, packing and self-hosting patterns.
- `Jagatees/grab-hackthon-2026` — group shortlist and voting flow.
- `ladHarsh/AI-TripPlanner` — free map/routing fallback philosophy.
- `Biko-KHM/PLANEXA` — AI + Places provider composition.
- `mjunaidca/travel-ai-service` — AI/map boundary between browser and server.
- `nishant-sharma-99/PlanetPath-AI-Travel-Planner` — structured AI handoff into itinerary data.
- TripSketch — map-first scheduling and low-friction day planning UX.

## Architecture

```text
React + Vite
  ├─ DnD Kit day planner
  ├─ MapLibre map
  └─ Socket.IO client
          │
          ▼
Express + Socket.IO :8290
  ├─ SQLite (better-sqlite3)
  ├─ Open-Meteo weather
  ├─ Nominatim / Google Places
  └─ OpenAI Responses API (optional)
          │
          ▼
Cloudflare Tunnel → mytrip.oosu.dev
```

## AI behavior

The application is usable without an AI key:

1. Booking import falls back to a deterministic parser for common flight/hotel text.
2. Place discovery falls back to OpenStreetMap/Nominatim.
3. Packing/outfit generation has a deterministic weather-aware recommendation engine.

With `OPENAI_API_KEY`, booking extraction and itinerary recommendations use the server-side Responses API. The browser never receives the key.

## Local development

```bash
npm install
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:8290`

Production verification:

```bash
npm run check
npm start
```

## Environment

Copy `.env.example` to `.env` only on the deployment host.

```env
PORT=8290
DATA_DIR=./data
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_BASE_URL=https://api.openai.com/v1
GOOGLE_MAPS_API_KEY=
```

`OPENAI_API_KEY` and `GOOGLE_MAPS_API_KEY` are server-only. Never add them to `VITE_*` variables.

## Mac mini deployment

The production layout is designed for the existing Oosu Mac mini stack:

```text
~/Services/mytrip-planner
  ├─ dist/
  ├─ dist-server/
  ├─ data/mytrip.sqlite
  ├─ .env                 # server only, gitignored
  └─ deploy/start.sh

~/Library/LaunchAgents/dev.oosu.mytrip.plist
~/.cloudflared/config.yml
  └─ mytrip.oosu.dev → http://127.0.0.1:8290
```

The service uses `/opt/homebrew/opt/node@22/bin/node` and launchd so it restarts after failure or reboot.

## Privacy boundary

- Do not commit PNRs, booking IDs, phone numbers, payment details, Agoda/tripla deep-link tokens, or copied emails.
- Raw imported booking text is discarded after parsing; only a redacted import record and structured events remain.
- This project intentionally has no account/login system. If the hostname is later shared beyond the trusted group, add Cloudflare Access or a project-level share code before storing more sensitive travel data.

## Current scope / next upgrades

- Rich event editing and time-resize gestures (iOS Calendar-style vertical time grid)
- Route-time optimization between scheduled places
- Google Places photos/details when an API key is enabled
- PDF / Apple Calendar (`.ics`) export
- Optional project share code without introducing full accounts
- Per-person packing assignment and shared expense tracking
