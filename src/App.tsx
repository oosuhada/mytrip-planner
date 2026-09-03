import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { io } from 'socket.io-client';
import maplibregl, { Marker } from 'maplibre-gl';
import {
  ArrowLeft, BedDouble, CalendarDays, Check, ChevronRight, CloudRain, Compass, GripVertical,
  Heart, Hotel, Import, Luggage, Map, MapPin, MessageCircle, MoreHorizontal, Navigation, Plane,
  Plus, Printer, Search, Send, Sparkles, Trash2, Users, Vote, X,
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
          <h1>계획부터 일정까지,<br /><em>MyTrip.</em></h1>
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
        <div><Import /><strong>붙여넣기 · 질문하기</strong><span>예약문 구조화와 여행 AI 상담</span></div>
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
  const [plannerName, setPlannerName] = useState(() => {
    const stored = localStorage.getItem('mytrip-name');
    return !stored || stored === 'Woosu' ? 'Oosu' : stored;
  });
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
          {tab === 'inbox' && <InboxPanel trip={trip} weather={weather} plannerName={plannerName} reload={load} />}
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
  const today = todayInTimeZone('Asia/Tokyo');
  const featuredWeather = weather.find((item) => item.date === today) || weather[0];
  const forecastLabel = featuredWeather ? (featuredWeather.date === today ? '오늘 예보' : `${formatMonthDay(featuredWeather.date)} 예보`) : '';
  return <header className="trip-header">
    <div><p className="eyebrow">{trip.destination}</p><h1>{trip.title}</h1><p className="trip-meta"><span><CalendarDays size={14} /> {formatDateRange(trip.start_date, trip.end_date)}</span><span><Users size={14} /> {trip.participants.map((p) => p.name).join(' · ') || '친구 추가 가능'}</span></p></div>
    <div className="header-actions">
      {featuredWeather && <div className="weather-chip"><span>{weatherIcon(featuredWeather.code)}</span><div><strong>{Math.round(featuredWeather.max)}° / {Math.round(featuredWeather.min)}°</strong><small>{forecastLabel} · 강수 {featuredWeather.rain}%</small></div></div>}
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
    <header><div><span>DAY {index + 1}</span><strong>{formatDay(date)}</strong></div>{weather && <div className="day-weather"><span className="weather-symbol">{weatherIcon(weather.code)}</span><div><b>{Math.round(weather.max)}° / {Math.round(weather.min)}°</b><small>{weatherLabel(weather.code)} · 강수 {weather.rain}%</small></div></div>}</header>
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
  const [addingBag, setAddingBag] = useState(false);
  const [bagForm, setBagForm] = useState({ name: '', weight_limit: '' });
  const [itemForm, setItemForm] = useState({ label: '', category: '기타', owner: 'Oosu', bag_id: '' });
  const min = weather.length ? Math.min(...weather.map((w)=>w.min)) : 18;
  const max = weather.length ? Math.max(...weather.map((w)=>w.max)) : 27;
  const rain = weather.length ? Math.max(...weather.map((w)=>w.rain)) : 30;
  async function generate() { setGenerating(true); try { await post(`/api/trips/${trip.id}/packing/generate`, { gender, min, max, rain, owner: 'Oosu' }); reload(); } finally { setGenerating(false); } }
  async function addBag() {
    if (!bagForm.name.trim()) return;
    await post(`/api/trips/${trip.id}/packing/bags`, { name: bagForm.name.trim(), weight_limit: bagForm.weight_limit ? Number(bagForm.weight_limit) : null, owner: 'Oosu' });
    setBagForm({ name: '', weight_limit: '' }); setAddingBag(false); reload();
  }
  async function addItem() {
    if (!itemForm.label.trim()) return;
    await post(`/api/trips/${trip.id}/packing/items`, { ...itemForm, bag_id: itemForm.bag_id || trip.packing_bags?.[0]?.id || null });
    setItemForm({ label: '', category: '기타', owner: 'Oosu', bag_id: '' }); reload();
  }
  const groups = useMemo(() => trip.packing.reduce<Record<string, PackingItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {}), [trip.packing]);
  const bagWeight = (bagId: string) => {
    const bag = trip.packing_bags?.find((item) => item.id === bagId);
    return (bag?.tare_weight || 0) + trip.packing.filter((item) => item.bag_id === bagId).reduce((sum, item) => sum + Number(item.weight_kg || 0) * Number(item.quantity || 1), 0);
  };
  return <div className="panel-page packing-page"><div className="page-title packing-title"><div><p className="eyebrow">PACK · WEAR · CHECK</p><h2>짐 · 코디 · 가방 플래너</h2><p>{weather.length ? `여행일별 예보 ${Math.round(min)}–${Math.round(max)}°C · 최대 강수확률 ${Math.round(rain)}%` : '여행 기간과 체크리스트를 기준으로 준비합니다.'}</p></div><button className="secondary print-button" onClick={()=>window.print()}><Printer size={15}/> 체크리스트 인쇄</button></div>
    <div className="packing-top"><div className="outfit-card"><div><Sparkles/><span>코디 추천</span></div><h3>{max >= 27 ? '통기성 좋은 옷 + 얇은 레이어' : '레이어 중심으로 준비'}</h3><p>Oosu · Domenic 모두 도보가 많은 일정이므로 워킹화와 가벼운 상의를 기본으로 하고, 비 예보가 있는 날은 젖어도 관리하기 쉬운 하의와 접이식 우산을 우선합니다.</p><div className="segmented"><button className={gender==='male'?'active':''} onClick={()=>setGender('male')}>남성</button><button className={gender==='female'?'active':''} onClick={()=>setGender('female')}>여성</button><button className={gender==='neutral'?'active':''} onClick={()=>setGender('neutral')}>중립</button></div><button className="primary" onClick={generate} disabled={generating}><Sparkles size={15}/>{generating?'생성 중…':'날씨 기반 항목 추가'}</button></div>
      <div className="weather-days outfit-days">{weather.map((w)=><div key={w.date}><span>{formatDay(w.date)}</span><b>{weatherIcon(w.code)} {Math.round(w.max)}° / {Math.round(w.min)}°</b><small>{weatherLabel(w.code)} · 강수 {w.rain}%</small><em>{outfitForWeather(w)}</em></div>)}</div></div>

    <div className="baggage-rule"><Luggage size={18}/><div><strong>이번 항공 수하물 기준</strong><span>Oosu · Domenic 각각 출국: 기내 10kg + 위탁 15kg / 귀국: 기내 10kg + 위탁 0kg. 귀국 전 체크인 캐리어 물건을 기내용/배송/추가수하물로 재배치해야 합니다.</span></div></div>

    <section className="bag-planner print-section"><div className="packing-section-head"><div><p className="eyebrow">BAG PLAN</p><h3>가방별로 나눠 담기</h3></div><button className="secondary no-print" onClick={()=>setAddingBag(!addingBag)}><Plus size={14}/> 가방 추가</button></div>
      {addingBag && <div className="inline-add no-print"><input placeholder="가방 이름" value={bagForm.name} onChange={(e)=>setBagForm({...bagForm,name:e.target.value})}/><input type="number" min="0" step="0.1" placeholder="제한 kg" value={bagForm.weight_limit} onChange={(e)=>setBagForm({...bagForm,weight_limit:e.target.value})}/><button className="primary" onClick={addBag}>추가</button></div>}
      <div className="bag-grid">{(trip.packing_bags || []).map((bag)=>{const weight=bagWeight(bag.id);const ratio=bag.weight_limit ? Math.min(100,(weight/bag.weight_limit)*100) : 0;return <article className="bag-card" key={bag.id}><div className="bag-card-head"><div><Luggage size={18}/><span><strong>{bag.name}</strong><small>{bag.owner || '공용'}</small></span></div><b>{weight.toFixed(1)}{bag.weight_limit ? ` / ${bag.weight_limit}` : ''} kg</b></div>{bag.weight_limit ? <div className={`weight-meter ${weight>bag.weight_limit?'over':''}`}><i style={{width:`${ratio}%`}}/></div>:null}<p>{bag.notes}</p><small>{trip.packing.filter((item)=>item.bag_id===bag.id).length}개 항목</small></article>})}</div>
    </section>

    <section className="packing-checklist print-section"><div className="packing-section-head"><div><p className="eyebrow">CHECKLIST</p><h3>준비물 체크리스트</h3></div></div>
      <div className="inline-add item-add no-print"><input placeholder="새 준비물" value={itemForm.label} onChange={(e)=>setItemForm({...itemForm,label:e.target.value})}/><input placeholder="카테고리" value={itemForm.category} onChange={(e)=>setItemForm({...itemForm,category:e.target.value})}/><select value={itemForm.owner} onChange={(e)=>setItemForm({...itemForm,owner:e.target.value})}>{trip.participants.map((p)=><option key={p.id}>{p.name}</option>)}<option>공용</option></select><select value={itemForm.bag_id} onChange={(e)=>setItemForm({...itemForm,bag_id:e.target.value})}><option value="">가방 선택</option>{(trip.packing_bags||[]).map((bag)=><option key={bag.id} value={bag.id}>{bag.name}</option>)}</select><button className="primary" onClick={addItem}><Plus size={14}/> 추가</button></div>
      <div className="packing-groups">{Object.entries(groups).map(([category, items]) => <section key={category}><h3>{category}<span>{items?.filter((item)=>item.checked).length || 0}/{items?.length || 0}</span></h3>{items?.map((item: PackingItem)=><div className={`packing-item packing-item-rich ${item.checked?'done':''}`} key={item.id}><label className="packing-check"><input type="checkbox" checked={Boolean(item.checked)} onChange={async(e)=>{await patch(`/api/packing/${item.id}`,{checked:e.target.checked});reload();}}/><span className="check-ui">{item.checked ? <Check size={14}/> : null}</span></label><div className="packing-item-copy"><strong>{item.label}</strong><small>{item.reason}</small><span className="item-source">{item.source==='pdf-template'?'체크리스트 기반':item.source==='weather-ai'?'날씨 추천':'직접 추가'}</span></div><select className="packing-select" value={item.owner || '공용'} onChange={async(e)=>{await patch(`/api/packing/${item.id}`,{owner:e.target.value==='공용'?null:e.target.value});reload();}}><option>공용</option>{trip.participants.map((p)=><option key={p.id}>{p.name}</option>)}</select><select className="packing-select" value={item.bag_id || ''} onChange={async(e)=>{await patch(`/api/packing/${item.id}`,{bag_id:e.target.value||null});reload();}}><option value="">미배정</option>{(trip.packing_bags||[]).map((bag)=><option key={bag.id} value={bag.id}>{bag.name}</option>)}</select><label className="weight-input"><input type="number" min="0" step="0.05" defaultValue={Number(item.weight_kg||0)} onBlur={async(e)=>{await patch(`/api/packing/${item.id}`,{weight_kg:Number(e.target.value||0)});reload();}}/><span>kg</span></label><button className="ghost-icon no-print" onClick={async()=>{await del(`/api/packing/${item.id}`);reload();}}><Trash2 size={13}/></button></div>)}</section>)}</div>
    </section>
  </div>;
}

function InboxPanel({ trip, weather, plannerName, reload }: { trip: Trip; weather: WeatherDay[]; plannerName: string; reload: () => void }) {
  const [mode, setMode] = useState<'ask'|'import'>('ask');
  const [prompt, setPrompt] = useState('교토에서 숙소 동선 기준으로 저녁에 갈 만한 곳 추천해줘');
  const [answer, setAnswer] = useState<{message?:string;ideas?:any[];provider?:string}|null>(null);
  const [savedIdeas, setSavedIdeas] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [result, setResult] = useState<{summary:string;inserted:number;parser:string}|null>(null);
  const [loading, setLoading] = useState(false);
  async function ask() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const weatherText = weather.map((w)=>`${w.date} ${weatherLabel(w.code)} ${Math.round(w.max)}/${Math.round(w.min)}C rain ${w.rain}%`).join('; ');
      const r:any = await post(`/api/trips/${trip.id}/ai/ideas`, { prompt, weather: weatherText });
      setAnswer(r);
    } finally { setLoading(false); }
  }
  async function saveIdea(idea:any) {
    await post(`/api/trips/${trip.id}/places`, { name: idea.name, category: idea.category || 'AI 추천', address: idea.area || null, notes: [idea.reason, idea.bestTime ? `추천 시간: ${idea.bestTime}` : ''].filter(Boolean).join(' · '), saved_by: plannerName || 'Oosu' });
    setSavedIdeas((prev)=>new Set(prev).add(idea.name)); reload();
  }
  async function parse() { if (!text.trim()) return; setLoading(true); try { const r:any=await post(`/api/trips/${trip.id}/import`,{text}); setResult(r); setText(''); reload(); } finally { setLoading(false); } }
  return <div className="inbox-page inbox-upgraded"><div className="inbox-copy"><p className="eyebrow">AI INBOX</p><h2>예약도 붙여넣고,<br/>여행 질문도 여기서.</h2><p>항공·호텔 예약문은 구조화해서 일정으로 넣고, “비 오면 어디 가지?”, “숙소 근처 저녁 추천해줘” 같은 질문은 여행 일정과 날짜별 예보를 참고해 답합니다. 마음에 드는 AI 추천은 바로 <strong>후보 · 투표</strong>에 저장할 수 있습니다.</p><div className="privacy-note"><Sparkles size={18}/><div><strong>Oosu · Domenic의 여행 컨텍스트 사용</strong><span>현재 여행 날짜, 저장 장소, 날씨 예보를 함께 참고합니다. 예약번호·전화번호·결제정보는 일정 데이터에 보존하지 않습니다.</span></div></div></div>
    <div className="import-card ai-inbox-card"><div className="inbox-tabs"><button className={mode==='ask'?'active':''} onClick={()=>setMode('ask')}><MessageCircle size={15}/> AI에게 물어보기</button><button className={mode==='import'?'active':''} onClick={()=>setMode('import')}><Import size={15}/> 예약 · 자료 붙여넣기</button></div>
      {mode==='ask' ? <div className="ask-pane"><div className="import-toolbar"><span><Sparkles size={15}/> Trip copilot</span><span>{plannerName || 'Oosu'}로 저장</span></div><div className="inbox-composer"><textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} onKeyDown={(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter') ask();}} placeholder="예: 9/14 비가 오면 교토에서 실내 위주로 어떻게 보내면 좋아?"/><div className="composer-footer"><span>⌘/Ctrl + Enter로 바로 질문</span><button className="primary composer-action" onClick={ask} disabled={loading||!prompt.trim()}><Send size={16}/>{loading?'생각하는 중…':'AI에게 물어보기'}</button></div></div>{answer&&<div className="inbox-answer"><div className="answer-head"><Sparkles size={16}/><div><strong>MyTrip AI</strong><small>{answer.provider || 'AI'}</small></div></div><p>{answer.message}</p><div className="inbox-idea-list">{(answer.ideas||[]).map((idea:any,i:number)=><article key={`${idea.name}-${i}`}><div><span>{idea.category}</span><small>{idea.area}</small></div><h3>{idea.name}</h3><p>{idea.reason}</p><footer><span>{idea.bestTime ? `추천 시간 · ${idea.bestTime}` : '여행 후보'}</span><button disabled={savedIdeas.has(idea.name)} onClick={()=>saveIdea(idea)}><Heart size={14}/>{savedIdeas.has(idea.name)?'후보에 저장됨':'후보 · 투표에 저장'}</button></footer></article>)}</div></div>}</div> : <div className="import-pane"><div className="import-toolbar"><span><Import size={15}/> Paste anything</span><span>{text.length.toLocaleString()} chars</span></div><div className="inbox-composer"><textarea value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter') parse();}} placeholder={'예:\n2026년 9월 13일\nICN - KIX\n08:00 - 10:05\nHOTEL ...\n체크인 15:00'} /><div className="composer-footer"><span>예약 메일·메신저 내용을 그대로 붙여넣어도 됩니다</span><button className="primary composer-action" onClick={parse} disabled={loading||!text.trim()}><Sparkles size={16}/>{loading?'일정으로 정리하는 중…':'AI로 일정화하기'}</button></div></div>{result&&<div className="import-result"><Check size={18}/><div><strong>{result.inserted}개 일정 추가 · {result.parser}</strong><p>{result.summary}</p></div></div>}</div>}
    </div>
  </div>;
}

function QuickAdd({ trip, onClose, reload }: { trip: Trip; onClose: () => void; reload: () => void }) {
  const [form, setForm] = useState({ title: '', kind: 'activity', date: trip.start_date, start_time: '10:00', end_time: '', location: '', notes: '' });
  async function save() { if (!form.title) return; await post(`/api/trips/${trip.id}/events`, form); reload(); onClose(); }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">QUICK ADD</p><h2>일정 추가</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>제목<input autoFocus value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="카페, 관광지, 식사…"/></label><div className="form-row"><label>종류<select value={form.kind} onChange={(e)=>setForm({...form,kind:e.target.value})}><option value="activity">일정</option><option value="reservation">예약</option><option value="train">교통</option><option value="hotel">숙소</option><option value="flight">항공</option></select></label><label>날짜<select value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}>{dateRange(trip.start_date,trip.end_date).map(d=><option key={d}>{d}</option>)}</select></label></div><div className="form-row"><label>시작<input type="time" value={form.start_time} onChange={(e)=>setForm({...form,start_time:e.target.value})}/></label><label>종료<input type="time" value={form.end_time} onChange={(e)=>setForm({...form,end_time:e.target.value})}/></label></div><label>장소<input value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} placeholder="장소 이름을 넣으면 좌표도 찾아봅니다"/></label><label>메모<textarea rows={3} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/></label><button className="primary full" onClick={save}>추가하기</button></div></div>;
}

function dateRange(start: string, end: string) {
  const out:string[]=[];
  let cursor=plainDateUtc(start), finish=plainDateUtc(end);
  while(cursor<=finish){out.push(new Date(cursor).toISOString().slice(0,10));cursor+=86400000;}
  return out;
}
function plainDateUtc(value:string){const [year,month,day]=value.split('-').map(Number);return Date.UTC(year,month-1,day);}
function formatDay(date:string){return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(plainDateUtc(date)));}
function formatMonthDay(date:string){const [,month,day]=date.split('-').map(Number);return `${month}/${day}`;}
function formatDateRange(start:string,end:string){const [year,month,day]=start.split('-').map(Number),[,endMonth,endDay]=end.split('-').map(Number);return `${year}. ${month}. ${day} — ${endMonth}. ${endDay}`;}
function todayInTimeZone(timeZone:string){const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone}).formatToParts(new Date());const get=(type:string)=>parts.find((part)=>part.type===type)?.value;return `${get('year')}-${get('month')}-${get('day')}`;}
function weatherIcon(code:number){if(code>=95)return '⛈';if(code>=61)return '🌧';if(code>=51)return '🌦';if(code>=45)return '🌫';if(code>=2)return '⛅';return '☀️';}
function weatherLabel(code:number){if(code>=95)return '뇌우';if(code>=80)return '소나기';if(code>=61)return '비';if(code>=51)return '이슬비';if(code>=45)return '안개';if(code>=3)return '흐림';if(code>=1)return '구름 조금';return '맑음';}
function outfitForWeather(day:WeatherDay){if(day.rain>=60)return '통기성 상의 · 마르기 쉬운 하의 · 워킹화 · 우산';if(day.max>=29)return '반팔 · 얇은 하의 · 선스크린 · 모자';if(day.min<=20)return '반팔 + 얇은 셔츠/가디건 · 편한 팬츠';return '가벼운 상의 · 편한 팬츠 · 워킹화';}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c));}
