import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { io } from 'socket.io-client';
import maplibregl, { Marker } from 'maplibre-gl';
import {
  ArrowLeft, BedDouble, CalendarDays, Check, ChevronRight, CloudRain, Compass, GripVertical,
  Heart, Hotel, Import, Luggage, Map, MapPin, MessageCircle, MoreHorizontal, Navigation, Plane,
  Plus, Search, Sparkles, Trash2, Users, Vote, X,
} from 'lucide-react';
import { api, del, patch, post } from './api';
import type { PackingItem, Place, SearchPlace, Trip, TripEvent, TripSummary, WeatherDay } from './types';

const socket = io({ autoConnect: true });

function navigate(path: string) {
  history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);
  const match = path.match(/^\/trip\/([^/]+)/);
  return match ? <TripPage tripId={match[1]} /> : <HomePage />;
}

function HomePage() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', destination: '', start_date: '', end_date: '' });

  const load = useCallback(() => api<TripSummary[]>('/api/trips').then(setTrips), []);
  useEffect(() => { load(); }, [load]);

  async function createTrip() {
    if (!form.title || !form.destination || !form.start_date || !form.end_date) return;
    const trip = await post<Trip>('/api/trips', form);
    navigate(`/trip/${trip.id}`);
  }

  return (
    <main className="home-shell">
      <header className="home-header">
        <div className="brand"><span className="brand-mark">M</span><span>MyTrip</span></div>
        <div className="quiet-pill"><Sparkles size={14} /> AI travel workspace</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">ONE PLACE FOR THE WHOLE TRIP</p>
          <h1>계획부터 여행 중 일정까지,<br /><em>여기 하나만.</em></h1>
          <p className="hero-copy">예약 메일을 붙여넣고, 지도에서 장소를 모으고, 친구와 투표한 뒤 드래그해서 하루 일정으로 완성하세요.</p>
        </div>
        <button className="primary big" onClick={() => setCreating(true)}><Plus size={19} /> 새 여행 만들기</button>
      </section>

      <section className="trip-section">
        <div className="section-title"><h2>내 여행</h2><span>{trips.length} projects</span></div>
        <div className="trip-grid">
          {trips.map((trip) => <button key={trip.id} className="trip-card" onClick={() => navigate(`/trip/${trip.id}`)}>
            <div className="trip-card-top"><span className="trip-emoji">{trip.emoji}</span><ChevronRight size={18} /></div>
            <div><h3>{trip.title}</h3><p><MapPin size={13} /> {trip.destination}</p></div>
            <div className="trip-card-bottom"><span>{formatDateRange(trip.start_date, trip.end_date)}</span><span>{trip.event_count} 일정 · {trip.place_count} 장소</span></div>
          </button>)}
          <button className="trip-card new-card" onClick={() => setCreating(true)}><Plus size={26} /><span>새 여행 프로젝트</span></button>
        </div>
      </section>

      <section className="workflow-strip">
        <div><Import /><strong>붙여넣기</strong><span>항공·숙소 예약문 자동 구조화</span></div>
        <div><Map /><strong>모으기</strong><span>지도 검색과 AI 장소 추천</span></div>
        <div><Vote /><strong>고르기</strong><span>친구와 후보 투표</span></div>
        <div><CalendarDays /><strong>일정화</strong><span>드래그해서 날짜 변경</span></div>
      </section>

      {creating && <div className="modal-backdrop" onMouseDown={() => setCreating(false)}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-head"><div><p className="eyebrow">NEW TRIP</p><h2>어디로 떠나나요?</h2></div><button className="icon-btn" onClick={() => setCreating(false)}><X /></button></div>
          <label>여행 이름<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Kyoto · Osaka 2026" autoFocus /></label>
          <label>여행지<input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Kyoto & Osaka, Japan" /></label>
          <div className="form-row"><label>출발일<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label><label>도착일<input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label></div>
          <button className="primary full" onClick={createTrip}>여행 만들기 <ChevronRight size={17} /></button>
        </div>
      </div>}
    </main>
  );
}

type Tab = 'schedule' | 'map' | 'votes' | 'packing' | 'inbox';

function TripPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<Tab>('schedule');
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [plannerName, setPlannerName] = useState(() => localStorage.getItem('mytrip-name') || 'Woosu');
  const [quickAdd, setQuickAdd] = useState(false);

  const load = useCallback(() => api<Trip>(`/api/trips/${tripId}`).then(setTrip), [tripId]);
  useEffect(() => {
    load();
    socket.emit('trip:join', tripId);
    const refresh = (data: { tripId: string }) => data.tripId === tripId && load();
    socket.on('trip:updated', refresh);
    return () => { socket.emit('trip:leave', tripId); socket.off('trip:updated', refresh); };
  }, [tripId, load]);

  useEffect(() => {
    if (!trip) return;
    const anchor = trip.places.find((p) => p.lat && p.lng) || trip.events.find((e) => e.lat && e.lng);
    const lat = anchor?.lat || 35.0116, lng = anchor?.lng || 135.7681;
    api<{ daily: WeatherDay[] }>(`/api/weather?lat=${lat}&lng=${lng}&start=${trip.start_date}&end=${trip.end_date}`)
      .then((x) => setWeather(x.daily)).catch(() => setWeather([]));
  }, [trip?.id, trip?.start_date, trip?.end_date]);

  function updateName(value: string) { setPlannerName(value); localStorage.setItem('mytrip-name', value); }
  if (!trip) return <div className="loading"><div className="brand-mark">M</div><span>여행을 불러오는 중…</span></div>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="back" onClick={() => navigate('/')}><ArrowLeft size={18} /></button>
        <div className="sidebar-trip"><span className="trip-emoji small">{trip.emoji}</span><div><strong>{trip.title}</strong><span>{formatDateRange(trip.start_date, trip.end_date)}</span></div></div>
        <nav>
          <NavButton active={tab === 'schedule'} icon={<CalendarDays />} label="일정" onClick={() => setTab('schedule')} />
          <NavButton active={tab === 'map'} icon={<Compass />} label="지도 · 발견" onClick={() => setTab('map')} />
          <NavButton active={tab === 'votes'} icon={<Vote />} label="후보 · 투표" onClick={() => setTab('votes')} count={trip.places.length} />
          <NavButton active={tab === 'packing'} icon={<Luggage />} label="짐 · 코디" onClick={() => setTab('packing')} />
          <NavButton active={tab === 'inbox'} icon={<Import />} label="AI Inbox" onClick={() => setTab('inbox')} />
        </nav>
        <div className="sidebar-bottom">
          <label className="planner-name"><Users size={15} /><input value={plannerName} onChange={(e) => updateName(e.target.value)} aria-label="내 이름" /></label>
          <span>실시간 공동 편집</span>
        </div>
      </aside>

      <section className="main-panel">
        <TripHeader trip={trip} weather={weather} onAdd={() => setQuickAdd(true)} />
        <div className="mobile-tabs">
          {([['schedule','일정'],['map','지도'],['votes','투표'],['packing','짐'],['inbox','AI']] as [Tab,string][]).map(([key,label]) => <button className={tab===key?'active':''} onClick={() => setTab(key)} key={key}>{label}</button>)}
        </div>
        <div className="content-area">
          {tab === 'schedule' && <ScheduleBoard trip={trip} weather={weather} reload={load} />}
          {tab === 'map' && <DiscoverPanel trip={trip} plannerName={plannerName} reload={load} />}
          {tab === 'votes' && <VotePanel trip={trip} plannerName={plannerName} reload={load} />}
          {tab === 'packing' && <PackingPanel trip={trip} weather={weather} reload={load} />}
          {tab === 'inbox' && <InboxPanel trip={trip} reload={load} />}
        </div>
      </section>
      {quickAdd && <QuickAdd trip={trip} onClose={() => setQuickAdd(false)} reload={load} />}
    </main>
  );
}

function NavButton({ active, icon, label, onClick, count }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void; count?: number }) {
  return <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{typeof count === 'number' && <b>{count}</b>}</button>;
}

function TripHeader({ trip, weather, onAdd }: { trip: Trip; weather: WeatherDay[]; onAdd: () => void }) {
  const todayWeather = weather[0];
  return <header className="trip-header">
    <div><p className="eyebrow">{trip.destination}</p><h1>{trip.title}</h1><p className="trip-meta"><span><CalendarDays size={14} /> {formatDateRange(trip.start_date, trip.end_date)}</span><span><Users size={14} /> {trip.participants.map((p) => p.name).join(' · ') || '친구 추가 가능'}</span></p></div>
    <div className="header-actions">
      {todayWeather && <div className="weather-chip"><span>{weatherIcon(todayWeather.code)}</span><div><strong>{Math.round(todayWeather.max)}°</strong><small>{Math.round(todayWeather.min)}° · rain {todayWeather.rain}%</small></div></div>}
      <button className="primary" onClick={onAdd}><Plus size={17} /> 일정 추가</button>
    </div>
  </header>;
}

function ScheduleBoard({ trip, weather, reload }: { trip: Trip; weather: WeatherDay[]; reload: () => void }) {
  const days = dateRange(trip.start_date, trip.end_date);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  async function onDragEnd(event: DragEndEvent) {
    const date = event.over?.id?.toString().replace('day:', '');
    const eventId = event.active.id.toString().replace('event:', '');
    if (date && eventId) { await patch(`/api/events/${eventId}`, { date }); reload(); }
  }
  return <div className="schedule-wrap">
    <div className="schedule-intro"><div><h2>Day plan</h2><p>일정을 잡아 원하는 날짜로 옮기세요. 시간은 카드에서 바로 수정할 수 있습니다.</p></div><span className="hint"><GripVertical size={15} /> drag to move</span></div>
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="day-grid">
        {days.map((date, index) => <DayColumn key={date} date={date} index={index} events={trip.events.filter((e) => e.date === date)} weather={weather.find((w) => w.date === date)} reload={reload} />)}
      </div>
    </DndContext>
  </div>;
}

function DayColumn({ date, index, events, weather, reload }: { date: string; index: number; events: TripEvent[]; weather?: WeatherDay; reload: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  return <section className={`day-column ${isOver ? 'drop-active' : ''}`} ref={setNodeRef}>
    <header><div><span>DAY {index + 1}</span><strong>{formatDay(date)}</strong></div>{weather && <div className="day-weather">{weatherIcon(weather.code)} <span>{Math.round(weather.max)}°</span></div>}</header>
    <div className="day-events">
      {events.length ? events.map((event) => <EventCard key={event.id} event={event} reload={reload} />) : <div className="empty-day"><span>비어 있는 날</span><small>장소나 일정을 여기로 드래그</small></div>}
    </div>
  </section>;
}

function EventCard({ event, reload }: { event: TripEvent; reload: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `event:${event.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;
  const icon = event.kind === 'flight' ? <Plane /> : event.kind === 'hotel' ? <BedDouble /> : <MapPin />;
  async function changeTime(value: string) { await patch(`/api/events/${event.id}`, { start_time: value || null }); reload(); }
  async function remove() { await del(`/api/events/${event.id}`); reload(); }
  return <article ref={setNodeRef} style={style} className={`event-card kind-${event.kind} ${isDragging ? 'dragging' : ''}`}>
    <button className="drag-handle" {...listeners} {...attributes}><GripVertical size={16} /></button>
    <div className="event-icon">{icon}</div>
    <div className="event-body"><div className="event-title-row"><strong>{event.title}</strong><button className="mini-delete" onClick={remove} aria-label="삭제"><Trash2 size={13} /></button></div>
      <div className="event-time"><input type="time" value={event.start_time || ''} onChange={(e) => changeTime(e.target.value)} />{event.end_time && <span>→ {event.end_time}</span>}</div>
      {event.location && <p><MapPin size={12} /> {event.location}</p>}
      {event.notes && <small>{event.notes}</small>}
      <div className="event-source">{event.source === 'ai-import' ? <><Sparkles size={11}/> AI import</> : event.source === 'booking' ? 'booking' : event.source}</div>
    </div>
  </article>;
}

function DiscoverPanel({ trip, plannerName, reload }: { trip: Trip; plannerName: string; reload: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchPlace[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [prompt, setPrompt] = useState('교토에서 너무 빡빡하지 않은 반나절 코스 추천해줘');
  const [aiMessage, setAiMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function search() { if (!query.trim()) return; setLoading(true); try { setResults(await api(`/api/geocode?q=${encodeURIComponent(query)}`)); } finally { setLoading(false); } }
  async function save(place: SearchPlace | any) {
    await post(`/api/trips/${trip.id}/places`, { ...place, notes: place.reason || place.notes, saved_by: plannerName }); reload();
  }
  async function askAi() {
    setLoading(true); try { const r: any = await post(`/api/trips/${trip.id}/ai/ideas`, { prompt }); setIdeas(r.ideas || []); setAiMessage(r.message || ''); } finally { setLoading(false); }
  }

  return <div className="discover-layout">
    <div className="map-stage"><TripMap trip={trip} /><div className="map-search-card"><div className="search-box"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="장소 검색 · 예: coffee near Gion"/><button onClick={search}>검색</button></div>
      {results.length > 0 && <div className="search-results">{results.slice(0,5).map((p, i) => <div key={`${p.name}-${i}`}><div><strong>{p.name}</strong><small>{p.address}</small></div><button onClick={() => save(p)}><Heart size={14}/> 저장</button></div>)}</div>}
    </div></div>
    <aside className="ai-rail"><div className="ai-title"><span className="spark"><Sparkles /></span><div><p className="eyebrow">TRIP COPILOT</p><h2>어디 갈지 같이 고르기</h2></div></div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}/><button className="primary full" onClick={askAi} disabled={loading}><Sparkles size={16}/>{loading ? '찾는 중…' : 'AI에게 추천받기'}</button>
      {aiMessage && <p className="ai-message">{aiMessage}</p>}
      <div className="idea-list">{ideas.map((idea, i) => <article key={`${idea.name}-${i}`}><div className="idea-top"><span>{idea.category}</span><small>{idea.area}</small></div><h3>{idea.name}</h3><p>{idea.reason}</p><div><span>추천 시간 · {idea.bestTime}</span><button onClick={() => save(idea)}><Plus size={14}/> 후보 저장</button></div></article>)}</div>
    </aside>
  </div>;
}

function TripMap({ trip }: { trip: Trip }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Marker[]>([]);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: ref.current,
      style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] },
      center: [135.7681, 35.0116], zoom: 11,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => {
    if (!mapRef.current) return;
    markers.current.forEach((m) => m.remove()); markers.current = [];
    const points = [...trip.places.map((p) => ({ ...p, type: 'place' })), ...trip.events.filter((e) => e.lat && e.lng).map((e) => ({ ...e, name: e.title, category: e.kind, type: 'event' }))].filter((p) => p.lat && p.lng) as any[];
    const bounds = new maplibregl.LngLatBounds();
    points.forEach((p) => {
      const el = document.createElement('div'); el.className = `map-marker ${p.type}`; el.innerHTML = p.type === 'event' ? '•' : '♥';
      const marker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${escapeHtml(p.name)}</strong><br/><span>${escapeHtml(p.category || '')}</span>`)).addTo(mapRef.current!);
      markers.current.push(marker); bounds.extend([p.lng, p.lat]);
    });
    if (points.length) mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 700 });
  }, [trip.places, trip.events]);
  return <div className="map-canvas" ref={ref} />;
}

function VotePanel({ trip, plannerName, reload }: { trip: Trip; plannerName: string; reload: () => void }) {
  const [scheduleFor, setScheduleFor] = useState<Place | null>(null);
  const [schedule, setSchedule] = useState({ date: trip.start_date, start_time: '10:00' });
  async function vote(place: Place, value: 1|-1) { await post(`/api/places/${place.id}/vote`, { voter: plannerName || 'friend', value }); reload(); }
  async function addSchedule() { if (!scheduleFor) return; await post(`/api/places/${scheduleFor.id}/schedule`, schedule); setScheduleFor(null); reload(); }
  return <div className="panel-page"><div className="page-title"><div><p className="eyebrow">SHARED SHORTLIST</p><h2>같이 갈 곳 고르기</h2><p>각자 이름으로 투표하고, 정해진 장소는 바로 일정에 넣을 수 있습니다.</p></div><div className="people-stack">{trip.participants.map((p) => <span key={p.id}>{p.name.slice(0,1)}</span>)}</div></div>
    <div className="vote-grid">{trip.places.map((p, index) => <article className="vote-card" key={p.id}><div className="rank">{String(index+1).padStart(2,'0')}</div><div className="vote-body"><div className="idea-top"><span>{p.category}</span><small>{p.saved_by ? `${p.saved_by} saved` : 'saved'}</small></div><h3>{p.name}</h3><p>{p.notes || p.address}</p><div className="vote-actions"><button onClick={() => vote(p, 1)}><Heart size={15}/><strong>{p.vote_score}</strong></button><button onClick={() => setScheduleFor(p)}><CalendarDays size={15}/> 일정에 넣기</button><button className="ghost-icon" onClick={async () => { await del(`/api/places/${p.id}`); reload(); }}><Trash2 size={14}/></button></div></div></article>)}</div>
    {scheduleFor && <div className="modal-backdrop" onMouseDown={() => setScheduleFor(null)}><div className="modal small-modal" onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">ADD TO DAY PLAN</p><h2>{scheduleFor.name}</h2></div><button className="icon-btn" onClick={()=>setScheduleFor(null)}><X/></button></div><div className="form-row"><label>날짜<select value={schedule.date} onChange={(e)=>setSchedule({...schedule,date:e.target.value})}>{dateRange(trip.start_date,trip.end_date).map(d=><option key={d}>{d}</option>)}</select></label><label>시간<input type="time" value={schedule.start_time} onChange={(e)=>setSchedule({...schedule,start_time:e.target.value})}/></label></div><button className="primary full" onClick={addSchedule}>일정에 추가</button></div></div>}
  </div>;
}

function PackingPanel({ trip, weather, reload }: { trip: Trip; weather: WeatherDay[]; reload: () => void }) {
  const [gender, setGender] = useState('male');
  const [generating, setGenerating] = useState(false);
  const min = weather.length ? Math.min(...weather.map((w)=>w.min)) : 18;
  const max = weather.length ? Math.max(...weather.map((w)=>w.max)) : 27;
  const rain = weather.length ? Math.max(...weather.map((w)=>w.rain)) : 30;
  async function generate() { setGenerating(true); try { await post(`/api/trips/${trip.id}/packing/generate`, { gender, min, max, rain }); reload(); } finally { setGenerating(false); } }
  const groups = useMemo(() => trip.packing.reduce<Record<string, PackingItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {}), [trip.packing]);
  return <div className="panel-page packing-page"><div className="page-title"><div><p className="eyebrow">WEATHER-AWARE PACKING</p><h2>짐 · 코디 추천</h2><p>{weather.length ? `예보 기준 ${Math.round(min)}–${Math.round(max)}°C · 최대 강수확률 ${Math.round(rain)}%` : '여행 기간과 계절을 기준으로 추천합니다.'}</p></div></div>
    <div className="packing-top"><div className="outfit-card"><div><Sparkles/><span>추천 기준</span></div><h3>{max >= 27 ? '가볍게, 레이어는 한 장' : '레이어 중심으로 준비'}</h3><p>도보가 많은 교토·오사카 일정에 맞춰 편안함을 우선합니다.</p><div className="segmented"><button className={gender==='male'?'active':''} onClick={()=>setGender('male')}>남성</button><button className={gender==='female'?'active':''} onClick={()=>setGender('female')}>여성</button><button className={gender==='neutral'?'active':''} onClick={()=>setGender('neutral')}>중립</button></div><button className="primary" onClick={generate} disabled={generating}><Sparkles size={15}/>{generating?'생성 중…':'추천 목록 만들기'}</button></div>
      <div className="weather-days">{weather.map((w)=><div key={w.date}><span>{formatDay(w.date)}</span><b>{weatherIcon(w.code)} {Math.round(w.max)}°</b><small>{Math.round(w.min)}° · rain {w.rain}%</small></div>)}</div></div>
    <div className="packing-groups">{Object.entries(groups).map(([category, items]) => <section key={category}><h3>{category}<span>{items?.length || 0}</span></h3>{items?.map((item: PackingItem)=><label className={`packing-item ${item.checked?'done':''}`} key={item.id}><input type="checkbox" checked={Boolean(item.checked)} onChange={async(e)=>{await patch(`/api/packing/${item.id}`,{checked:e.target.checked});reload();}}/><span className="check-ui">{item.checked ? <Check size={14}/> : null}</span><div><strong>{item.label}</strong><small>{item.reason}</small></div></label>)}</section>)}</div>
  </div>;
}

function InboxPanel({ trip, reload }: { trip: Trip; reload: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{summary:string;inserted:number;parser:string}|null>(null);
  const [loading, setLoading] = useState(false);
  async function parse() { if (!text.trim()) return; setLoading(true); try { const r:any=await post(`/api/trips/${trip.id}/import`,{text}); setResult(r); setText(''); reload(); } finally { setLoading(false); } }
  return <div className="inbox-page"><div className="inbox-copy"><p className="eyebrow">AI INBOX</p><h2>메일·메신저 내용을<br/>그냥 붙여넣으세요.</h2><p>항공권, 호텔 예약, 기차표처럼 날짜·시간·장소가 섞인 텍스트를 일정 카드로 바꿉니다. 예약번호·전화번호·결제정보는 일정 데이터에 보존하지 않습니다.</p><div className="privacy-note"><Sparkles size={18}/><div><strong>키가 있으면 AI, 없어도 로컬 파서</strong><span>외부 AI 키가 설정되지 않아도 일반적인 항공/숙소 형식은 기본 파서가 처리합니다.</span></div></div></div>
    <div className="import-card"><div className="import-toolbar"><span><Import size={15}/> Paste anything</span><span>{text.length.toLocaleString()} chars</span></div><textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder={'예:\n2026년 9월 13일\nICN - KIX\n08:00 - 10:05\nHOTEL ...\n체크인 15:00'} /><button className="primary full" onClick={parse} disabled={loading||!text.trim()}><Sparkles size={16}/>{loading?'일정으로 정리하는 중…':'AI로 일정화하기'}</button>{result&&<div className="import-result"><Check size={18}/><div><strong>{result.inserted}개 일정 추가 · {result.parser}</strong><p>{result.summary}</p></div></div>}</div>
  </div>;
}

function QuickAdd({ trip, onClose, reload }: { trip: Trip; onClose: () => void; reload: () => void }) {
  const [form, setForm] = useState({ title: '', kind: 'activity', date: trip.start_date, start_time: '10:00', end_time: '', location: '', notes: '' });
  async function save() { if (!form.title) return; await post(`/api/trips/${trip.id}/events`, form); reload(); onClose(); }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">QUICK ADD</p><h2>일정 추가</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>제목<input autoFocus value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="카페, 관광지, 식사…"/></label><div className="form-row"><label>종류<select value={form.kind} onChange={(e)=>setForm({...form,kind:e.target.value})}><option value="activity">일정</option><option value="reservation">예약</option><option value="train">교통</option><option value="hotel">숙소</option><option value="flight">항공</option></select></label><label>날짜<select value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}>{dateRange(trip.start_date,trip.end_date).map(d=><option key={d}>{d}</option>)}</select></label></div><div className="form-row"><label>시작<input type="time" value={form.start_time} onChange={(e)=>setForm({...form,start_time:e.target.value})}/></label><label>종료<input type="time" value={form.end_time} onChange={(e)=>setForm({...form,end_time:e.target.value})}/></label></div><label>장소<input value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} placeholder="장소 이름을 넣으면 좌표도 찾아봅니다"/></label><label>메모<textarea rows={3} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/></label><button className="primary full" onClick={save}>추가하기</button></div></div>;
}

function dateRange(start: string, end: string) { const out=[]; const d=new Date(`${start}T00:00:00`), e=new Date(`${end}T00:00:00`); while(d<=e){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);} return out; }
function formatDay(date:string){return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',weekday:'short'}).format(new Date(`${date}T00:00:00`));}
function formatDateRange(start:string,end:string){const s=new Date(`${start}T00:00:00`),e=new Date(`${end}T00:00:00`);return `${s.getFullYear()}. ${s.getMonth()+1}. ${s.getDate()} — ${e.getMonth()+1}. ${e.getDate()}`;}
function weatherIcon(code:number){if(code>=95)return '⛈';if(code>=61)return '🌧';if(code>=51)return '🌦';if(code>=45)return '🌫';if(code>=2)return '⛅';return '☀️';}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c));}
