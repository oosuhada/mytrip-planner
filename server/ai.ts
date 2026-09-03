type ParsedEvent = {
  title: string;
  kind: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  address?: string | null;
  notes?: string | null;
  meta?: Record<string, unknown>;
};

const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

export function aiEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function parseBookingText(raw: string): Promise<{ parser: string; events: ParsedEvent[]; summary: string }> {
  if (aiEnabled()) {
    try {
      const result = await callOpenAI(
        `Extract travel booking information into strict JSON. Return an object with keys summary and events. Each event must use: title, kind (flight|hotel|train|activity|reservation), date YYYY-MM-DD, start_time HH:mm or null, end_time HH:mm or null, location, address, notes, meta. Never expose booking codes/PNRs, phone numbers, payment data, or private confirmation tokens in output. Split hotel check-in and check-out into separate events. Preserve only operational itinerary details.`,
        raw,
      );
      const parsed = JSON.parse(stripCodeFence(result));
      if (Array.isArray(parsed.events)) return { parser: 'openai', events: parsed.events, summary: parsed.summary || '예약 정보를 일정으로 변환했습니다.' };
    } catch (error) {
      console.error('AI parse failed, using fallback:', error);
    }
  }
  return fallbackParse(raw);
}

export async function generateTripIdeas(input: {
  destination: string;
  dates: string;
  prompt: string;
  weather?: string;
  existing?: string[];
}) {
  if (aiEnabled()) {
    try {
      const result = await callOpenAI(
        `You are a concise collaborative trip-planning copilot. Suggest practical ideas grounded in the supplied destination, dates, weather and existing places. Return strict JSON only: {"message":"...","ideas":[{"name":"...","category":"...","reason":"...","bestTime":"...","area":"..."}]}. Give 3-6 ideas. Avoid claiming live opening hours unless provided.`,
        JSON.stringify(input),
      );
      const parsed = JSON.parse(stripCodeFence(result));
      return { provider: 'openai', ...parsed };
    } catch (error) {
      console.error('AI idea generation failed:', error);
    }
  }
  return fallbackIdeas(input);
}

export function packingAdvice(input: { days: number; gender?: string; min?: number; max?: number; rain?: number }) {
  const { days, gender = 'neutral', min = 18, max = 27, rain = 30 } = input;
  const tops = Math.min(days, 4);
  const items = [
    ['의류', `반팔/얇은 상의 ${tops}장`, `${days}일 일정 기준, 세탁/재착용 여유 포함`],
    ['의류', '얇은 긴팔 또는 셔츠 1장', `아침·저녁 ${min}°C 안팎 및 실내 냉방 대비`],
    ['의류', '편한 하의 2벌', '도보 이동이 많은 여행에 맞춘 로테이션'],
    ['신발', '오래 걸어도 편한 운동화', '교토·오사카 도보 일정 대비'],
    ['생활', '접이식 우산', `강수 가능성 약 ${Math.round(rain)}% 기준`],
    ['생활', '보조배터리', '지도·카메라·번역 사용량 대비'],
    ['여행', '여권 / 결제수단 / 교통 IC 준비', '출국 및 현지 이동 필수'],
  ];
  if (max >= 27) items.push(['생활', '선크림 / 휴대용 손수건', `낮 최고 ${max}°C 안팎 대비`]);
  if (gender === 'male') items.push(['코디', '린넨/옥스퍼드 셔츠 + 테이퍼드 팬츠', '도심 저녁 일정에도 자연스러운 가벼운 조합']);
  if (gender === 'female') items.push(['코디', '가벼운 레이어드 상의 + 통기성 좋은 하의', '일교차와 장시간 도보를 함께 고려한 조합']);
  if (gender === 'neutral') items.push(['코디', '얇은 셔츠 레이어 + 편한 팬츠', '성별과 무관하게 일교차·도보를 우선한 조합']);
  return items.map(([category, label, reason]) => ({ category, label, reason }));
}

async function callOpenAI(system: string, user: string) {
  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, instructions: system, input: user }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json: any = await response.json();
  if (json.output_text) return json.output_text as string;
  const text = json.output?.flatMap((item: any) => item.content || []).find((c: any) => c.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI response contained no output_text');
  return text;
}

function stripCodeFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function fallbackParse(raw: string): { parser: string; events: ParsedEvent[]; summary: string } {
  const events: ParsedEvent[] = [];
  const normalized = raw.replace(/\r/g, '');
  const dateMatches = [...normalized.matchAll(/(20\d{2})[년.\-/\s]+(\d{1,2})[월.\-/\s]+(\d{1,2})/g)];
  const dates = dateMatches.map((m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);

  const flightRegex = /(ICN|GMP|KIX|NRT|HND|CTS|FUK)\s*(?:→|-|–|—|to)\s*(ICN|GMP|KIX|NRT|HND|CTS|FUK)/gi;
  const flights = [...normalized.matchAll(flightRegex)];
  const times = [...normalized.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
  flights.forEach((m, i) => {
    events.push({
      title: `Flight · ${m[1].toUpperCase()} → ${m[2].toUpperCase()}`,
      kind: 'flight', date: dates[Math.min(i, dates.length - 1)] || new Date().toISOString().slice(0, 10),
      start_time: times[i * 2] || null, end_time: times[i * 2 + 1] || null,
      location: `${m[1].toUpperCase()} → ${m[2].toUpperCase()}`,
      notes: '자유 텍스트에서 자동 추출 · 예약번호/연락처는 저장하지 않음',
    });
  });

  const hotels = [
    { rx: /HOTEL AMANEK Kyoto Kawaramachi Gojo/i, name: 'HOTEL AMANEK Kyoto Kawaramachi Gojo', address: 'Azuchicho 616, Shimogyo Ward, Kyoto 600-8040, Japan' },
    { rx: /(?:Nipponbashi|니혼바시) Crystal Hotel|니혼바시 크리스탈 호텔/i, name: 'Nipponbashi Crystal Hotel', address: '4-8-13 Nipponbashi, Naniwa Ward, Osaka, Japan' },
  ];
  for (const hotel of hotels) {
    if (!hotel.rx.test(normalized)) continue;
    const relevantDates = dates.slice(-2);
    if (relevantDates[0]) events.push({ title: `${hotel.name} · check-in`, kind: 'hotel', date: relevantDates[0], location: hotel.name, address: hotel.address, notes: '자동 추출' });
    if (relevantDates[1]) events.push({ title: `${hotel.name} · check-out`, kind: 'hotel', date: relevantDates[1], location: hotel.name, address: hotel.address, notes: '자동 추출' });
  }

  return {
    parser: 'local', events,
    summary: events.length ? `${events.length}개의 일정 후보를 추출했습니다. AI 키를 연결하면 더 복잡한 예약 메일까지 구조화할 수 있습니다.` : '자동으로 확정할 일정을 찾지 못했습니다. 날짜·시간·장소가 포함된 내용을 붙여넣어 주세요.',
  };
}

function fallbackIdeas(input: { destination: string; prompt: string }) {
  const kyoto = /kyoto|교토/i.test(input.destination);
  const ideas = kyoto ? [
    { name: 'Philosopher’s Path', category: 'walk', reason: '아침 산책용으로 일정 밀도가 낮고 동선 조정이 쉽습니다.', bestTime: 'morning', area: 'Higashiyama' },
    { name: 'Pontocho Alley', category: 'food', reason: '가와라마치 숙소에서 저녁 식사 후보로 붙이기 쉽습니다.', bestTime: 'evening', area: 'Kawaramachi' },
    { name: 'Kennin-ji', category: 'temple', reason: '기온 일정에 짧게 결합하기 좋은 사찰입니다.', bestTime: 'late morning', area: 'Gion' },
  ] : [
    { name: 'Kuromon Ichiba Market', category: 'food', reason: '닛폰바시 숙소에서 접근성이 좋고 짧게 넣기 쉽습니다.', bestTime: 'morning', area: 'Nippombashi' },
    { name: 'Shinsekai', category: 'neighborhood', reason: '난바권 일정과 함께 묶기 좋습니다.', bestTime: 'evening', area: 'Naniwa' },
  ];
  return { provider: 'local', message: `“${input.prompt || '추천'}” 요청에 맞춘 빠른 후보입니다.`, ideas };
}
