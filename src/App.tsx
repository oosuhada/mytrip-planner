import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { io } from 'socket.io-client';
import maplibregl, { Marker } from 'maplibre-gl';
import {
  ArrowLeft, BedDouble, CalendarDays, Check, ChevronRight, CloudRain, Compass, Copy, ExternalLink, GripVertical,
  ClipboardCheck, Heart, Hotel, Import, Luggage, Map, MapPin, MessageCircle, MoreHorizontal, Navigation, Plane,
  Menu, PanelLeftClose, PanelLeftOpen, Plus, Printer, Route, Search, Send, ShoppingBag, Sparkles, Trash2, Users, Utensils, Vote, X,
} from 'lucide-react';
import { api, del, patch, post } from './api';
import type { MealSlot, PackingItem, Place, Restaurant, SearchPlace, Trip, TripEvent, TripSummary, WeatherDay } from './types';

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

type WorkspaceMode = 'plan' | 'trip';
type Tab = 'today' | 'trip-weather' | 'phrases' | 'guide' | 'schedule' | 'map' | 'votes' | 'packing' | 'inbox';

function TripPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<Tab>('guide');
  const initialTabResolved = useRef(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('plan');
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [plannerName, setPlannerName] = useState(() => {
    const stored = localStorage.getItem('mytrip-name');
    return !stored || stored === 'Woosu' ? 'Oosu' : stored;
  });
  const [quickAdd, setQuickAdd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('mytrip-sidebar-open') !== '0');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!trip || initialTabResolved.current) return;
    initialTabResolved.current = true;
    const today = todayInTimeZone('Asia/Tokyo');
    const active = today >= trip.start_date && today <= trip.end_date;
    setWorkspaceMode(active ? 'trip' : 'plan');
    setTab(active ? 'today' : 'guide');
  }, [trip?.id]);

  function updateName(value: string) { setPlannerName(value); localStorage.setItem('mytrip-name', value); }
  function toggleSidebar(next?: boolean) {
    const value = typeof next === 'boolean' ? next : !sidebarOpen;
    setSidebarOpen(value);
    localStorage.setItem('mytrip-sidebar-open', value ? '1' : '0');
  }
  function selectTab(next: Tab) {
    setTab(next);
    setMobileMenuOpen(false);
  }
  function selectMode(next: WorkspaceMode) {
    setWorkspaceMode(next);
    setTab(next === 'trip' ? 'today' : 'guide');
    setMobileMenuOpen(false);
  }
  if (!trip) return <div className="loading"><div className="brand-mark">M</div><span>여행을 불러오는 중…</span></div>;

  return (
    <main className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <aside className="sidebar">
        <div className="sidebar-top-actions"><button className="back" onClick={() => navigate('/')}><ArrowLeft size={18} /></button><button className="sidebar-collapse" onClick={() => toggleSidebar(false)} aria-label="사이드바 닫기"><PanelLeftClose size={17}/></button></div>
        <div className="sidebar-trip"><span className="trip-emoji small">{trip.emoji}</span><div><strong>{trip.title}</strong><span>{formatDateRange(trip.start_date, trip.end_date)}</span></div></div>
        <ModeSwitcher mode={workspaceMode} onSelect={selectMode} />
        <nav>
          {workspaceMode === 'plan' ? <>
            <NavButton active={tab === 'guide'} icon={<ClipboardCheck />} label="준비 · 예약" onClick={() => selectTab('guide')} />
            <NavButton active={tab === 'schedule'} icon={<CalendarDays />} label="일정 편집" onClick={() => selectTab('schedule')} />
            <NavButton active={tab === 'votes'} icon={<Vote />} label="후보 · 결정" onClick={() => selectTab('votes')} count={trip.places.length} />
            <NavButton active={tab === 'map'} icon={<Compass />} label="지도 · 리서치" onClick={() => selectTab('map')} />
            <NavButton active={tab === 'packing'} icon={<Luggage />} label="짐 · 코디" onClick={() => selectTab('packing')} />
            <NavButton active={tab === 'inbox'} icon={<Import />} label="AI 가져오기" onClick={() => selectTab('inbox')} />
          </> : <>
            <NavButton active={tab === 'today'} icon={<Navigation />} label="오늘" onClick={() => selectTab('today')} />
            <NavButton active={tab === 'schedule'} icon={<CalendarDays />} label="전체 일정" onClick={() => selectTab('schedule')} />
            <NavButton active={tab === 'trip-weather'} icon={<CloudRain />} label="날씨 · 오늘의 코디" onClick={() => selectTab('trip-weather')} />
            <NavButton active={tab === 'phrases'} icon={<MessageCircle />} label="일본어 표현" onClick={() => selectTab('phrases')} />
            <NavButton active={tab === 'map'} icon={<MapPin />} label="지도" onClick={() => selectTab('map')} />
          </>}
        </nav>
        <div className="sidebar-bottom">
          <label className="planner-name"><Users size={15} /><input value={plannerName} onChange={(e) => updateName(e.target.value)} aria-label="내 이름" /></label>
          <span>실시간 공동 편집</span>
        </div>
      </aside>

      {!sidebarOpen && <button className="sidebar-reopen" onClick={() => toggleSidebar(true)} aria-label="사이드바 열기"><PanelLeftOpen size={17}/><span>메뉴</span></button>}

      <section className="main-panel">
        <TripHeader trip={trip} weather={weather} mode={workspaceMode} onToggleMode={() => selectMode(workspaceMode === 'plan' ? 'trip' : 'plan')} onAdd={() => setQuickAdd(true)} onOpenMenu={() => setMobileMenuOpen(true)} />
        <div className="content-area">
          {workspaceMode === 'trip' && tab === 'today' && <TripLivePanel trip={trip} weather={weather} reload={load} onOpenTab={selectTab} />}
          {workspaceMode === 'trip' && tab === 'trip-weather' && <TripWeatherOutfitPanel trip={trip} weather={weather} />}
          {workspaceMode === 'trip' && tab === 'phrases' && <TripJapanesePanel />}
          {workspaceMode === 'plan' && tab === 'guide' && <TripGuidePanel trip={trip} reload={load} />}
          {tab === 'schedule' && <ScheduleBoard trip={trip} weather={weather} reload={load} tripMode={workspaceMode === 'trip'} />}
          {tab === 'map' && <DiscoverPanel trip={trip} plannerName={plannerName} reload={load} />}
          {workspaceMode === 'plan' && tab === 'votes' && <VotePanel trip={trip} plannerName={plannerName} reload={load} />}
          {workspaceMode === 'plan' && tab === 'packing' && <PackingPanel trip={trip} weather={weather} reload={load} />}
          {workspaceMode === 'plan' && tab === 'inbox' && <InboxPanel trip={trip} weather={weather} plannerName={plannerName} reload={load} />}
        </div>
      </section>
      {mobileMenuOpen && <MobileMenuDrawer trip={trip} mode={workspaceMode} tab={tab} plannerName={plannerName} onNameChange={updateName} onSelectMode={selectMode} onSelect={selectTab} onClose={() => setMobileMenuOpen(false)} />}
      {quickAdd && <QuickAdd trip={trip} onClose={() => setQuickAdd(false)} reload={load} />}
      <FloatingTripAssistant trip={trip} weather={weather} plannerName={plannerName} mode={workspaceMode} reload={load} />
    </main>
  );
}

function TripGuidePanel({ trip, reload }: { trip: Trip; reload: () => void }) {
  const checklistGroups = useMemo(() => trip.checklist.reduce<Record<string, typeof trip.checklist>>((groups, item) => {
    (groups[item.category] ||= []).push(item);
    return groups;
  }, {}), [trip.checklist]);
  const transport = trip.guides.filter((item) => item.section === 'transport');
  const rules = trip.guides.filter((item) => item.section === 'rules');
  const done = trip.checklist.filter((item) => item.status === 'DONE').length;
  const restaurantsById = useMemo(() => new globalThis.Map(trip.restaurants.map((restaurant) => [restaurant.id, restaurant] as const)), [trip.restaurants]);
  const optionGroups = useMemo(() => {
    const groups = new globalThis.Map<string, { title: string; items: typeof trip.options }>();
    for (const item of trip.options || []) {
      const current = groups.get(item.group_key) || { title: item.group_title, items: [] };
      current.items.push(item);
      groups.set(item.group_key, current);
    }
    return ['kyoto_transport', 'osaka_transport', 'esim'].map((key) => [key, groups.get(key)] as const).filter((entry) => entry[1]);
  }, [trip.options]);
  const selectedRestaurants = useMemo(() => {
    const ids = new Set((trip.meal_slots || []).map((slot) => slot.selected_restaurant_id).filter(Boolean));
    return trip.restaurants.filter((restaurant) => ids.has(restaurant.id));
  }, [trip.meal_slots, trip.restaurants]);

  async function toggleChecklist(id: string, status: string) {
    await patch(`/api/checklist/${id}`, { status: status === 'DONE' ? 'TODO' : 'DONE' });
    reload();
  }
  async function toggleReservation(id: string, status: string) {
    await patch(`/api/restaurants/${id}`, { reservation_status: status === 'BOOKED' ? 'TODO' : 'BOOKED' });
    reload();
  }
  async function selectRestaurant(slotId: string, restaurantId: string) {
    await patch(`/api/meal-slots/${slotId}/select`, { restaurant_id: restaurantId });
    reload();
  }

  return <div className="guide-page">
    <section className="guide-hero">
      <div><p className="eyebrow">TRIP ESSENTIALS</p><h2>출발 전부터 귀국까지, 한 화면에서.</h2><p>예약·준비 상태를 체크하고 식당 영업시간, 이동 방식, 음식 주의사항을 모바일에서 바로 확인하세요.</p></div>
      <div className="guide-progress"><strong>{done}/{trip.checklist.length}</strong><span>출발 전 준비 완료</span></div>
    </section>

    {rules.length > 0 && <section className="guide-rule-strip">{rules.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.details}</span></article>)}</section>}

    <div className="guide-columns">
      <section className="guide-section before-departure">
        <div className="guide-section-head"><div><ClipboardCheck/><span><p className="eyebrow">BEFORE DEPARTURE</p><h3>출발 전 체크</h3></span></div><b>{done}/{trip.checklist.length}</b></div>
        <div className="guide-check-groups">{Object.entries(checklistGroups).map(([category, items]) => <div key={category} className="guide-check-group"><h4>{category}</h4>{items.map((item) => <article key={item.id} className={`guide-check ${item.status === 'DONE' ? 'done' : ''}`}><button className="guide-check-main" onClick={() => toggleChecklist(item.id, item.status)} disabled={item.id === 'plan-task-restaurants'}><span className="check-ui">{item.status === 'DONE' ? <Check size={14}/> : null}</span><span><strong>{item.title}</strong>{item.notes && <small>{item.notes}</small>}{item.id === 'plan-task-restaurants' && <em>아래 식사 후보 선택 + 선택된 식당 예약 상태와 자동 연동</em>}{Boolean(item.packing_ids?.length) && <em>짐 · 코디 체크리스트와 양방향 연동</em>}</span></button>{item.url && <a className="guide-link" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={12}/> 공식 열기</a>}</article>)}</div>)}</div>
      </section>

      <section className="guide-section reservations">
        <div className="guide-section-head"><div><Utensils/><span><p className="eyebrow">RESERVATION STATUS</p><h3>식당 예약</h3></span></div></div>
        <div className="reservation-list">{selectedRestaurants.map((restaurant) => <article key={restaurant.id} className="reservation-row"><div><strong>{restaurant.name}</strong><small>{(trip.meal_slots || []).filter((slot) => slot.selected_restaurant_id === restaurant.id).map((slot) => `${formatMonthDay(slot.date)} ${slot.label}`).join(' · ') || restaurant.city}</small></div><div className="reservation-actions">{restaurant.reservation_url && <a className="icon-link" href={restaurant.reservation_url} target="_blank" rel="noreferrer" aria-label={`${restaurant.name} 공식 페이지`}><ExternalLink size={12}/></a>}{restaurant.reservation_action === 'WALK-IN ONLY' ? <span className="status-pill walkin">WALK-IN</span> : <button className={`status-pill ${restaurant.reservation_status === 'BOOKED' ? 'booked' : 'todo'}`} onClick={() => toggleReservation(restaurant.id, restaurant.reservation_status)}>{restaurant.reservation_status}</button>}</div></article>)}</div>
      </section>
    </div>

    <section className="guide-section transport-section">
      <div className="guide-section-head"><div><Route/><span><p className="eyebrow">TRANSPORT</p><h3>구간별 이동</h3></span></div></div>
      <div className="transport-grid">{transport.map((item) => <article key={item.id}><strong>{item.title}</strong>{item.subtitle && <span>{item.subtitle}</span>}<p>{item.details}</p></article>)}</div>
    </section>

    {optionGroups.map(([key, group]) => group && <section className="guide-section compare-section" key={key}><div className="guide-section-head"><div><Navigation/><span><p className="eyebrow">{key === 'esim' ? 'CONNECTIVITY' : 'TRANSIT OPTIONS'}</p><h3>{group.title}</h3></span></div></div><div className="compare-table-wrap"><table className="compare-table"><thead><tr><th>옵션</th><th>가격</th><th>포함 / 방식</th><th>우리 일정 적합도</th><th>판단</th><th></th></tr></thead><tbody>{group.items.map((item) => <tr key={item.id} className={item.recommended ? 'recommended' : ''}><td data-label="옵션"><strong>{item.name}</strong>{item.recommended ? <span className="recommend-tag">추천</span> : null}</td><td data-label="가격">{item.price || '—'}</td><td data-label="포함 · 방식">{item.coverage || '—'}</td><td data-label="일정 적합도">{item.fit || '—'}</td><td data-label="판단">{item.verdict || '—'}</td><td data-label="바로가기"><div className="compare-actions">{item.purchase_url && <a href={item.purchase_url} target="_blank" rel="noreferrer"><ExternalLink size={11}/>{item.action_label || '구매'}</a>}{item.source_url && item.source_url !== item.purchase_url && <a className="muted-link" href={item.source_url} target="_blank" rel="noreferrer">공식</a>}</div></td></tr>)}</tbody></table></div></section>)}

    <section className="guide-section restaurant-section">
      <div className="guide-section-head"><div><Utensils/><span><p className="eyebrow">MEAL CHOICES</p><h3>식사별 후보 · 선택</h3></span></div><b>선택하면 일정 카드도 함께 변경</b></div>
      <div className="meal-slot-list">{(trip.meal_slots || []).map((slot) => <section className="meal-slot" key={slot.id}><header><div><span>{formatMonthDay(slot.date)} · {slot.time || ''} · {slot.area || ''}</span><h4>{slot.label}</h4></div><small>{slot.selected_restaurant_id ? `선택: ${restaurantsById.get(slot.selected_restaurant_id)?.name || ''}` : '아직 선택 안 함'}</small></header><div className="meal-options">{slot.option_ids.map((restaurantId) => { const restaurant = restaurantsById.get(restaurantId); if (!restaurant) return null; const selected = slot.selected_restaurant_id === restaurant.id; const planB = Boolean(slot.selected_restaurant_id) && !selected; return <article className={`meal-option ${selected ? 'selected' : ''} ${planB ? 'plan-b' : ''}`} key={restaurant.id}><RestaurantPhoto url={restaurant.image_url} kind="meal"/><div className="meal-option-copy"><div className="meal-option-top"><span>{restaurant.city}</span>{selected ? <b>선택됨</b> : planB ? <em>PLAN B</em> : null}</div><h5>{restaurant.name}</h5><p>{restaurant.price_range || '예산 확인'} · {restaurant.hours || '영업시간 확인'} · 후보투표 ♥ {restaurant.vote_score || 0}</p>{restaurant.dietary_notes && <small>{restaurant.dietary_notes}</small>}<div className="meal-option-links">{restaurant.google_maps_url && <a href={restaurant.google_maps_url} target="_blank" rel="noreferrer"><MapPin size={11}/>지도</a>}{restaurant.menu_url && <a href={restaurant.menu_url} target="_blank" rel="noreferrer"><Utensils size={11}/>메뉴·사진</a>}{restaurant.reservation_url && <a href={restaurant.reservation_url} target="_blank" rel="noreferrer"><ExternalLink size={11}/>공식</a>}</div><button className={selected ? 'selected-button' : 'choose-button'} disabled={selected} onClick={() => selectRestaurant(slot.id, restaurant.id)}>{selected ? '현재 선택' : '이 식당으로 선택'}</button></div></article>; })}</div></section>)}</div>
    </section>
  </div>;
}

function NavButton({ active, icon, label, onClick, count }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void; count?: number }) {
  return <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{typeof count === 'number' && <b>{count}</b>}</button>;
}

function ModeSwitcher({ mode, onSelect }: { mode: WorkspaceMode; onSelect: (mode: WorkspaceMode) => void }) {
  return <div className="mode-switcher" aria-label="여행 모드 선택"><button className={mode === 'plan' ? 'active' : ''} onClick={() => onSelect('plan')}><span>PLAN</span><small>여행 전</small></button><button className={mode === 'trip' ? 'active' : ''} onClick={() => onSelect('trip')}><span>TRIP</span><small>여행 중</small></button></div>;
}

function MobileMenuDrawer({ trip, mode, tab, plannerName, onNameChange, onSelectMode, onSelect, onClose }: { trip: Trip; mode: WorkspaceMode; tab: Tab; plannerName: string; onNameChange: (value: string) => void; onSelectMode: (mode: WorkspaceMode) => void; onSelect: (tab: Tab) => void; onClose: () => void }) {
  const items: Array<[Tab, React.ReactNode, string, number?]> = mode === 'plan' ? [
    ['guide', <ClipboardCheck/>, '준비 · 예약'],
    ['schedule', <CalendarDays/>, '일정 편집'],
    ['votes', <Vote/>, '후보 · 결정', trip.places.length],
    ['map', <Compass/>, '지도 · 리서치'],
    ['packing', <Luggage/>, '짐 · 코디'],
    ['inbox', <Import/>, 'AI 가져오기'],
  ] : [
    ['today', <Navigation/>, '오늘'],
    ['schedule', <CalendarDays/>, '전체 일정'],
    ['trip-weather', <CloudRain/>, '날씨 · 오늘의 코디'],
    ['phrases', <MessageCircle/>, '일본어 표현'],
    ['map', <MapPin/>, '지도'],
  ];
  return <div className="mobile-menu-backdrop" onMouseDown={onClose}>
    <aside className="mobile-menu-drawer" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span className="trip-emoji small">{trip.emoji}</span><div><strong>{trip.title}</strong><small>{formatDateRange(trip.start_date, trip.end_date)}</small></div></div><button onClick={onClose} aria-label="메뉴 닫기"><X size={22}/></button></header>
      <ModeSwitcher mode={mode} onSelect={onSelectMode} />
      <nav>{items.map(([key, icon, label, count]) => <NavButton key={key} active={tab === key} icon={icon} label={label} count={count} onClick={() => onSelect(key)} />)}</nav>
      <footer><label className="planner-name"><Users size={16}/><input value={plannerName} onChange={(event) => onNameChange(event.target.value)} aria-label="내 이름" /></label><span>실시간 공동 편집</span></footer>
    </aside>
  </div>;
}

function TripHeader({ trip, weather, mode, onToggleMode, onAdd, onOpenMenu }: { trip: Trip; weather: WeatherDay[]; mode: WorkspaceMode; onToggleMode: () => void; onAdd: () => void; onOpenMenu: () => void }) {
  const today = todayInTimeZone('Asia/Tokyo');
  const featuredWeather = weather.find((item) => item.date === today) || weather[0];
  const forecastLabel = featuredWeather ? (featuredWeather.date === today ? '오늘 예보' : `${formatMonthDay(featuredWeather.date)} 예보`) : '';
  return <header className="trip-header">
    <button className="mobile-menu-trigger" onClick={onOpenMenu} aria-label="여행 메뉴 열기"><Menu size={22}/></button>
    <div className="trip-header-copy"><p className="eyebrow">{trip.destination}</p><h1>{trip.title}</h1><p className="trip-meta"><span><CalendarDays size={14} /> {formatDateRange(trip.start_date, trip.end_date)}</span><span><Users size={14} /> {trip.participants.map((p) => p.name).join(' · ') || '친구 추가 가능'}</span></p></div>
    <div className="header-actions">
      <button className={`header-mode-chip ${mode}`} onClick={onToggleMode}><span>{mode.toUpperCase()}</span><small>{mode === 'plan' ? '여행 전' : '여행 중'}</small></button>
      {featuredWeather && <div className="weather-chip"><span>{weatherIcon(featuredWeather.code)}</span><div><strong>{Math.round(featuredWeather.max)}° / {Math.round(featuredWeather.min)}°</strong><small>{forecastLabel} · 강수 {featuredWeather.rain}%</small></div></div>}
      <button className="primary" onClick={onAdd}><Plus size={17} /> 일정 추가</button>
    </div>
  </header>;
}

function TripLivePanel({ trip, weather, reload, onOpenTab }: { trip: Trip; weather: WeatherDay[]; reload: () => void; onOpenTab: (tab: Tab) => void }) {
  const today = todayInTimeZone('Asia/Tokyo');
  const active = today >= trip.start_date && today <= trip.end_date;
  const focusDate = active ? today : trip.start_date;
  const now = active ? timeInTimeZone('Asia/Tokyo') : '00:00';
  const events = trip.events.filter((event) => event.date === focusDate).sort((a, b) => compareDayEvents(a, b, trip.events));
  const currentIndex = events.findIndex((event) => event.start_time && event.end_time && event.start_time <= now && event.end_time >= now);
  const nextIndex = currentIndex >= 0 ? currentIndex : events.findIndex((event) => (event.start_time || '99:99') >= now);
  const anchorIndex = Math.max(0, nextIndex >= 0 ? nextIndex : Math.max(0, events.length - 1));
  const contextIndex = currentIndex < 0 && nextIndex > 0 ? nextIndex - 1 : -1;
  const liveStartIndex = contextIndex >= 0 ? contextIndex : anchorIndex;
  const liveEvents = events.slice(liveStartIndex);
  const remainingCount = currentIndex >= 0
    ? events.length - currentIndex
    : nextIndex >= 0
      ? events.length - nextIndex
      : 0;
  const liveEventRef = useRef<HTMLDivElement | null>(null);
  const mealSlots = (trip.meal_slots || []).filter((slot) => slot.date === focusDate);
  const restaurants = new globalThis.Map(trip.restaurants.map((restaurant) => [restaurant.id, restaurant] as const));
  const decisions = (trip.decision_slots || []).filter((slot) => slot.date === focusDate);
  const reservationRows = mealSlots.map((slot) => ({ slot, restaurant: slot.selected_restaurant_id ? restaurants.get(slot.selected_restaurant_id) : undefined })).filter((row) => row.restaurant);
  const dayWeather = weather.find((item) => item.date === focusDate);
  const progressEvents = events;
  const completedCount = progressEvents.filter((event) => Boolean(event.completed_at)).length;
  const elapsedUncheckedCount = active ? progressEvents.filter((event) => {
    const finish = event.end_time || event.start_time;
    return !event.completed_at && Boolean(finish && finish < now);
  }).length : 0;
  const dayProgress = progressEvents.length ? Math.min(100, Math.round((completedCount / progressEvents.length) * 100)) : 0;
  const walkingTarget = events.find((event) => typeof event.meta?.daily_walking === 'string')?.meta?.daily_walking;
  const nextEvent = nextIndex >= 0 ? events[nextIndex] : undefined;
  const nextMealSlot = active ? mealSlots.find((slot) => !slot.time || slot.time >= now) : mealSlots[0];
  const nextMeal = nextMealSlot?.selected_restaurant_id ? restaurants.get(nextMealSlot.selected_restaurant_id) : undefined;
  const hotelTransitions = trip.events
    .filter((event) => event.kind === 'hotel' && event.location && event.start_time && !/check-out/i.test(event.title))
    .sort((a, b) => `${a.date} ${a.start_time || '00:00'}`.localeCompare(`${b.date} ${b.start_time || '00:00'}`));
  const focusMoment = `${focusDate} ${active ? now : '23:59'}`;
  const currentHotel = [...hotelTransitions].reverse().find((event) => `${event.date} ${event.start_time || '00:00'}` <= focusMoment)
    || hotelTransitions.find((event) => event.date === focusDate)
    || hotelTransitions[0];
  const nextMapUrl = nextEvent ? googleMapsEventUrl(nextEvent) : null;
  const hotelMapUrl = currentHotel ? googleMapsEventUrl(currentHotel) : null;
  const nextTransport = typeof nextEvent?.meta?.transport === 'string' ? nextEvent.meta.transport : null;
  const nextWalking = typeof nextEvent?.meta?.walking === 'string' ? nextEvent.meta.walking : null;
  const rainLevel = dayWeather ? Math.round(dayWeather.rain) : null;
  const fieldAlert = dayWeather && dayWeather.rain >= 60
    ? '강한 비 가능성 · 야외 한 곳은 빼도 괜찮게 움직이기'
    : dayWeather && dayWeather.max >= 30
      ? '더운 날씨 · 물 자주 마시고 실내 휴식 구간 유지'
      : '일정 사이 휴식을 남겨두고 무리하지 않기';
  async function selectPlanB(slotId: string, optionId: string) {
    await patch(`/api/decision-slots/${slotId}/select`, { option_id: optionId });
    reload();
  }
  async function toggleEventComplete(event: TripEvent) {
    await patch(`/api/events/${event.id}`, { completed_at: event.completed_at ? null : new Date().toISOString() });
    reload();
  }
  function scrollLiveEvents(direction: -1 | 1) {
    const node = liveEventRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(320, node.clientWidth * .78), behavior: 'smooth' });
  }
  return <div className="trip-live-page">
    <section className="trip-live-hero">
      <div><p className="eyebrow">{active ? 'LIVE TRIP' : 'TRIP MODE PREVIEW'} · {formatDay(focusDate)}</p><h2>{active ? '지금 필요한 것만.' : '여행 중 화면 미리보기'}</h2><p>{active ? `${now} 일본 시간 기준으로 현재·다음 일정과 바로 쓸 정보만 보여줍니다.` : '출발하면 이 화면이 기본으로 열리고 오늘 날짜 일정에 자동 맞춰집니다.'}</p></div>
    </section>

    <section className="trip-field-dashboard" aria-label="오늘 여행 현황">
      <div className="trip-field-progress">
        <div><span><Navigation size={15}/>오늘 체크</span><strong>{completedCount}/{progressEvents.length}</strong></div>
        <div className="trip-progress-track"><i style={{ width: `${dayProgress}%` }}/></div>
        <small>{active ? `${dayProgress}% 완료${elapsedUncheckedCount ? ` · 시간상 지난 미체크 ${elapsedUncheckedCount}개` : ''}` : '여행 중 직접 완료 체크한 일정만 진행률에 반영됩니다.'}</small>
      </div>
      <div className="trip-field-stat"><span><Route size={15}/>보행 목표</span><strong>{typeof walkingTarget === 'string' ? walkingTarget : '여유 있게'}</strong><small>10k steps 크게 넘기지 않기</small></div>
      <div className="trip-field-stat"><span><CloudRain size={15}/>오늘 날씨</span><strong>{dayWeather ? `${Math.round(dayWeather.max)}° / ${Math.round(dayWeather.min)}°` : '예보 확인 중'}</strong><small>{rainLevel !== null ? `강수 ${rainLevel}%` : '날씨 탭에서 확인'}</small></div>
      <div className="trip-field-alert"><CloudRain size={16}/><span>{fieldAlert}</span></div>
    </section>

    <section className="trip-now-section"><div className="trip-section-heading"><div><Navigation/><span><p className="eyebrow">NOW · NEXT</p><h3>지금부터 다음 일정</h3></span></div><div className="trip-scroll-controls"><b>{remainingCount > 0 ? `현재 이후 ${remainingCount}개` : '오늘 일정 종료'}</b><button onClick={() => scrollLiveEvents(-1)} aria-label="이전 일정"><ArrowLeft size={15}/></button><button onClick={() => scrollLiveEvents(1)} aria-label="다음 일정"><ChevronRight size={15}/></button></div></div><div className="trip-live-events" ref={liveEventRef}>{liveEvents.map((event, index) => { const mapUrl = googleMapsEventUrl(event); const eventIndex = liveStartIndex + index; const isNow = active && event.start_time && event.end_time && event.start_time <= now && event.end_time >= now; const liveLabel = isNow ? 'NOW' : eventIndex === contextIndex ? 'PREV' : eventIndex === nextIndex ? 'NEXT' : 'THEN'; return <article className={`trip-live-event ${isNow ? 'now' : ''} ${event.completed_at ? 'completed' : ''}`} key={event.id}><EventVisual event={event} mapUrl={mapUrl}/><div className="trip-live-event-copy"><div><span>{event.completed_at ? 'DONE' : liveLabel}</span><b>{event.start_time || '--:--'}{event.end_time ? `–${event.end_time}` : ''}</b></div><h4>{event.title}</h4>{event.location && <p>{event.location}</p>}<div className="trip-live-actions"><button className={`trip-complete-action ${event.completed_at ? 'done' : ''}`} onClick={() => toggleEventComplete(event)}><Check size={14}/>{event.completed_at ? '완료됨 · 취소' : '완료 체크'}</button>{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={14}/>Google Maps</a>}{event.address && <button onClick={() => navigator.clipboard?.writeText(event.address || '')}><Copy size={13}/>주소 복사</button>}</div></div></article>; })}</div></section>

    <section className="trip-command-center">
      <div className="trip-section-heading"><div><Compass/><span><p className="eyebrow">FIELD COMMAND</p><h3>현장에서 바로 쓰기</h3></span></div><b>지도 · 식사 · 숙소를 한 번에</b></div>
      <div className="trip-command-grid">
        <article className="trip-command-card primary-card">
          <header><span><Navigation size={16}/>다음 이동</span>{nextEvent?.start_time && <b>{nextEvent.start_time}</b>}</header>
          <h4>{nextEvent?.title || '오늘 일정 종료'}</h4>
          {nextEvent?.location && <p>{nextEvent.location}</p>}
          {(nextTransport || nextWalking) && <small>{[nextTransport, nextWalking].filter(Boolean).join(' · ')}</small>}
          <footer>{nextMapUrl && <a href={nextMapUrl} target="_blank" rel="noreferrer"><MapPin size={14}/>지도 열기</a>}{nextEvent?.address && <button onClick={() => navigator.clipboard?.writeText(nextEvent.address || '')}><Copy size={13}/>주소 복사</button>}</footer>
        </article>
        <article className="trip-command-card">
          <header><span><Utensils size={16}/>다음 식사</span>{nextMealSlot?.time && <b>{nextMealSlot.time}</b>}</header>
          <h4>{nextMeal?.name || nextMealSlot?.label || '식사 후보 확인'}</h4>
          <p>{nextMeal ? [nextMeal.price_range, nextMeal.hours].filter(Boolean).join(' · ') : '선택된 식당이 없어요.'}</p>
          {nextMeal?.dietary_notes && <small>{nextMeal.dietary_notes}</small>}
          <footer>{nextMeal?.google_maps_url && <a href={nextMeal.google_maps_url} target="_blank" rel="noreferrer"><MapPin size={14}/>식당 지도</a>}{nextMeal?.menu_url && <a href={nextMeal.menu_url} target="_blank" rel="noreferrer"><Utensils size={13}/>메뉴</a>}</footer>
        </article>
        <article className="trip-command-card">
          <header><span><BedDouble size={16}/>오늘 숙소</span></header>
          <h4>{currentHotel?.location || currentHotel?.title || '숙소 확인'}</h4>
          {currentHotel?.address && <p>{currentHotel.address}</p>}
          <small>피곤하거나 비가 세면 숙소 복귀를 우선</small>
          <footer>{hotelMapUrl && <a href={hotelMapUrl} target="_blank" rel="noreferrer"><MapPin size={14}/>숙소 지도</a>}{currentHotel?.address && <button onClick={() => navigator.clipboard?.writeText(currentHotel.address || '')}><Copy size={13}/>주소 복사</button>}</footer>
        </article>
      </div>
      <div className="trip-quick-actions" aria-label="TRIP 빠른 메뉴">
        <button onClick={() => onOpenTab('schedule')}><CalendarDays size={15}/><span>전체 일정</span></button>
        <button onClick={() => onOpenTab('trip-weather')}><CloudRain size={15}/><span>날씨 · 코디</span></button>
        <button onClick={() => onOpenTab('phrases')}><MessageCircle size={15}/><span>일본어 표현</span></button>
        {hotelMapUrl ? <a href={hotelMapUrl} target="_blank" rel="noreferrer"><BedDouble size={15}/><span>숙소로 이동</span></a> : <button onClick={() => onOpenTab('map')}><MapPin size={15}/><span>지도</span></button>}
      </div>
    </section>

    {reservationRows.length > 0 && <section className="trip-live-section"><div className="trip-section-heading"><div><Utensils/><span><p className="eyebrow">TODAY'S MEALS</p><h3>오늘 식사 · 예약</h3></span></div></div><div className="trip-meal-live-grid">{reservationRows.map(({ slot, restaurant }) => restaurant && <article key={slot.id}><RestaurantPhoto url={restaurant.image_url} kind="meal"/><div><span>{slot.time || ''} · {slot.label}</span><h4>{restaurant.name}</h4><p>{restaurant.hours || '영업시간 확인'} · {restaurant.price_range || '예산 확인'}</p><div>{restaurant.google_maps_url && <a href={restaurant.google_maps_url} target="_blank" rel="noreferrer"><MapPin size={13}/>지도</a>}{restaurant.menu_url && <a href={restaurant.menu_url} target="_blank" rel="noreferrer"><Utensils size={13}/>메뉴</a>}<b className={`status-pill ${restaurant.reservation_status === 'BOOKED' ? 'booked' : 'walkin'}`}>{restaurant.reservation_status}</b></div></div></article>)}</div></section>}

    {decisions.length > 0 && <section className="trip-live-section"><div className="trip-section-heading"><div><Route/><span><p className="eyebrow">PLAN B</p><h3>상황 바뀌면 바로 전환</h3></span></div></div><div className="trip-planb-list">{decisions.map((slot) => { const selected = slot.options.find((option) => option.id === slot.selected_option_id); const alternatives = slot.options.filter((option) => option.id !== slot.selected_option_id); if (!selected || !alternatives.length) return null; return <article key={slot.id}><header><span>{slot.time || ''} · {slot.title}</span><strong>{selected.label}</strong></header><div className="trip-planb-options">{alternatives.map((option) => <div key={option.id}><span><b>PLAN B</b>{option.label}<small>{[option.duration, option.price].filter(Boolean).join(' · ')}</small></span><button onClick={() => selectPlanB(slot.id, option.id)}>이걸로 변경</button></div>)}</div></article>; })}</div></section>}

  </div>;
}

const tripPhraseGroups = [
  { title: '식당', icon: <Utensils/>, items: [
    ['すみません、二人です。', '스미마센, 후타리 데스.', '실례합니다, 두 명이에요.'],
    ['予約しています。', '요야쿠 시테이마스.', '예약했습니다.'],
    ['おすすめは何ですか？', '오스스메와 난데스카?', '추천 메뉴가 뭐예요?'],
    ['お水を二つお願いします。', '오미즈오 후타츠 오네가이시마스.', '물 두 잔 부탁해요.'],
    ['持ち帰りできますか？', '모치카에리 데키마스카?', '포장할 수 있나요?'],
    ['別々に払えますか？', '베츠베츠니 하라에마스카?', '따로 계산할 수 있나요?'],
  ] },
  { title: '음식 제한', icon: <Utensils/>, items: [
    ['魚の寿司は食べられます。', '사카나노 스시와 타베라레마스.', '생선 초밥은 먹을 수 있어요.'],
    ['ウニは食べられません。', '우니와 타베라레마센.', '우니는 먹을 수 없어요.'],
    ['魚以外の海鮮は食べられません。', '사카나 이가이노 카이센와 타베라레마센.', '생선 이외의 해산물은 먹을 수 없어요.'],
    ['貝類は入っていますか？', '카이루이와 하잇테이마스카?', '조개류가 들어 있나요?'],
    ['内臓は入っていますか？', '나이조와 하잇테이마스카?', '내장이 들어 있나요?'],
    ['これは辛いですか？', '코레와 카라이 데스카?', '이거 매운가요?'],
    ['辛くしないでください。', '카라쿠 시나이데 쿠다사이.', '맵지 않게 해주세요.'],
  ] },
  { title: '교통', icon: <Navigation/>, items: [
    ['この電車は京都駅に行きますか？', '코노 덴샤와 교토에키니 이키마스카?', '이 전철은 교토역에 가나요?'],
    ['河原町五条で降りたいです。', '카와라마치 고조데 오리타이 데스.', '가와라마치고조에서 내리고 싶어요.'],
    ['ICOCAは使えますか？', '이코카와 츠카에마스카?', 'ICOCA를 사용할 수 있나요?'],
    ['この乗り場で合っていますか？', '코노 노리바데 앗테이마스카?', '이 승강장이 맞나요?'],
    ['何番ホームですか？', '난반 호-무 데스카?', '몇 번 승강장이에요?'],
    ['乗り換えはどこですか？', '노리카에와 도코데스카?', '환승은 어디에서 하나요?'],
    ['このバスは河原町五条に行きますか？', '코노 바스와 카와라마치 고조니 이키마스카?', '이 버스는 가와라마치고조에 가나요?'],
  ] },
  { title: '호텔', icon: <Hotel/>, items: [
    ['荷物を預けてもいいですか？', '니모츠오 아즈케테모 이이데스카?', '짐을 맡겨도 될까요?'],
    ['チェックインをお願いします。', '첵쿠인오 오네가이시마스.', '체크인 부탁드립니다.'],
    ['大浴場はどこですか？', '다이요쿠조와 도코데스카?', '대욕장은 어디인가요?'],
    ['タオルはどこですか？', '타오루와 도코데스카?', '수건은 어디에 있나요?'],
    ['チェックアウト後も荷物を預けられますか？', '첵쿠아우토 고모 니모츠오 아즈케라레마스카?', '체크아웃 후에도 짐을 맡길 수 있나요?'],
    ['Wi-Fiのパスワードは何ですか？', '와이파이노 파스와-도와 난데스카?', 'Wi-Fi 비밀번호가 뭐예요?'],
  ] },
  { title: '쇼핑 · 결제', icon: <ShoppingBag/>, items: [
    ['クレジットカードは使えますか？', '쿠레짓토 카-도와 츠카에마스카?', '신용카드 사용할 수 있나요?'],
    ['交通系ICカードは使えますか？', '코-츠-케이 아이시 카-도와 츠카에마스카?', '교통계 IC카드로 결제할 수 있나요?'],
    ['これを二つください。', '코레오 후타츠 쿠다사이.', '이거 두 개 주세요.'],
    ['袋を一枚ください。', '후쿠로오 이치마이 쿠다사이.', '봉투 한 장 주세요.'],
    ['免税できますか？', '멘제이 데키마스카?', '면세 가능한가요?'],
  ] },
  { title: '도움 · 길찾기', icon: <MessageCircle/>, items: [
    ['もう一度お願いします。', '모- 이치도 오네가이시마스.', '한 번 더 말씀해 주세요.'],
    ['ゆっくり話してください。', '윳쿠리 하나시테 쿠다사이.', '천천히 말씀해 주세요.'],
    ['英語は話せますか？', '에이고와 하나세마스카?', '영어 하실 수 있나요?'],
    ['トイレはどこですか？', '토이레와 도코데스카?', '화장실은 어디인가요?'],
    ['この住所まで行きたいです。', '코노 주소마데 이키타이 데스.', '이 주소까지 가고 싶어요.'],
    ['この場所はどこですか？', '코노 바쇼와 도코데스카?', '이 장소는 어디인가요?'],
    ['薬局はどこですか？', '야쿄쿠와 도코데스카?', '약국은 어디인가요?'],
    ['気分が悪いです。', '키분가 와루이 데스.', '몸이 안 좋아요.'],
  ] },
];

function TripJapanesePanel() {
  return <div className="trip-tool-page japanese-tool-page"><div className="trip-tool-intro"><div><p className="eyebrow">USEFUL JAPANESE</p><h2>일본어 표현</h2><p>직원에게 보여주거나 그대로 읽기 쉽게 일본어 · 한글 발음 · 뜻을 분리했습니다. 카드를 누르면 일본어 문장이 복사됩니다.</p></div><b>{tripPhraseGroups.reduce((sum, group) => sum + group.items.length, 0)} phrases</b></div><div className="phrase-groups">{tripPhraseGroups.map((group) => <section key={group.title}><header>{group.icon}<h4>{group.title}</h4></header><div>{group.items.map(([jp, sound, meaning]) => <button key={jp} onClick={() => navigator.clipboard?.writeText(jp)}><strong lang="ja">{jp}</strong><span>{sound}</span><small>{meaning}</small><Copy size={14}/></button>)}</div></section>)}</div></div>;
}

function TripWeatherOutfitPanel({ trip, weather }: { trip: Trip; weather: WeatherDay[] }) {
  const today = todayInTimeZone('Asia/Tokyo');
  const active = today >= trip.start_date && today <= trip.end_date;
  const focusDate = active ? today : trip.start_date;
  const dayWeather = weather.find((item) => item.date === focusDate) || weather[0];
  const rain = dayWeather?.rain ?? 0;
  const max = dayWeather?.max ?? 27;
  const min = dayWeather?.min ?? 20;
  const outfit = dayWeather ? outfitForWeather(dayWeather) : '가벼운 상의 + 편한 하의 + 워킹화';
  const carry = [rain >= 40 ? '접이식 우산' : '작은 우산', rain >= 60 ? '얇은 방수 겉옷' : null, '보조배터리', '물집 밴드'].filter(Boolean);
  return <div className="trip-tool-page weather-outfit-page"><div className="trip-tool-intro"><div><p className="eyebrow">WEATHER · OUTFIT · {formatDay(focusDate)}</p><h2>날씨 · 오늘의 코디</h2><p>{active ? '오늘 일본 날씨와 도보 일정에 맞춘 옷차림만 빠르게 확인합니다.' : '여행 전에는 Day 1 예보를 기준으로 미리보기 합니다.'}</p></div></div>{dayWeather ? <><section className="weather-outfit-hero"><div className="weather-outfit-main"><span>{weatherIcon(dayWeather.code)}</span><div><strong>{Math.round(max)}° / {Math.round(min)}°</strong><p>{weatherLabel(dayWeather.code)} · 강수확률 {Math.round(rain)}%</p></div></div><div className="weather-outfit-advice"><span>오늘 코디</span><h3>{outfit}</h3><p>{rain >= 60 ? '비가 강하면 야외 한 곳은 과감히 빼고 젖어도 관리하기 쉬운 하의와 워킹화를 우선.' : rain >= 30 ? '우산을 바로 꺼낼 수 있게 백팩 바깥쪽에 두고, 실내 냉방용 얇은 레이어를 챙기기.' : '통기성 좋은 옷과 워킹화를 기본으로 하고 실내 냉방용 얇은 레이어만 챙기기.'}</p></div></section><section className="trip-live-section outfit-carry-section"><div className="trip-section-heading"><div><Luggage/><span><p className="eyebrow">TAKE TODAY</p><h3>오늘 바로 챙길 것</h3></span></div></div><div className="outfit-carry-list">{carry.map((item) => <span key={item}><Check size={14}/>{item}</span>)}</div></section><section className="trip-live-section mini-forecast-section"><div className="trip-section-heading"><div><CloudRain/><span><p className="eyebrow">TRIP FORECAST</p><h3>여행 기간 예보</h3></span></div></div><div className="weather-days">{weather.map((item) => <div key={item.date}><span>{formatDay(item.date)}</span><b>{weatherIcon(item.code)} {Math.round(item.max)}° / {Math.round(item.min)}°</b><small>{weatherLabel(item.code)} · 강수 {item.rain}%</small></div>)}</div></section></> : <section className="trip-live-section"><p>예보를 불러오는 중입니다.</p></section>}</div>;
}

function ScheduleBoard({ trip, weather, reload, tripMode }: { trip: Trip; weather: WeatherDay[]; reload: () => void; tripMode: boolean }) {
  const days = dateRange(trip.start_date, trip.end_date);
  const today = todayInTimeZone('Asia/Tokyo');
  const tripIsActive = today >= trip.start_date && today <= trip.end_date;
  const initialDay = tripIsActive ? today : days[0];
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [viewMode, setViewMode] = useState<'day'|'all'>('day');
  const dayGridRef = useRef<HTMLDivElement | null>(null);
  const didInitialScroll = useRef(false);
  const todayEvents = trip.events.filter((event) => event.date === today).sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
  const nowTime = timeInTimeZone('Asia/Tokyo');
  const current = todayEvents.find((event) => event.start_time && event.end_time && event.start_time <= nowTime && event.end_time >= nowTime);
  const next = current || todayEvents.find((event) => (event.start_time || '99:99') >= nowTime) || todayEvents.at(-1);
  const todayWeather = weather.find((item) => item.date === today);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  useEffect(() => {
    setSelectedDay(initialDay);
  }, [initialDay]);
  useEffect(() => {
    if (viewMode !== 'all' || didInitialScroll.current || !dayGridRef.current || !initialDay) return;
    const frame = requestAnimationFrame(() => {
      const target = dayGridRef.current?.querySelector<HTMLElement>(`[data-day-date="${initialDay}"]`);
      if (!target) return;
      dayGridRef.current?.scrollTo({ left: Math.max(0, target.offsetLeft - 2), behavior: 'auto' });
      didInitialScroll.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [initialDay, viewMode]);
  const selectedIndex = Math.max(0, days.indexOf(selectedDay));
  function moveSelectedDay(offset: number) {
    const nextIndex = Math.max(0, Math.min(days.length - 1, selectedIndex + offset));
    setSelectedDay(days[nextIndex]);
  }
  async function onDragEnd(event: DragEndEvent) {
    const date = event.over?.id?.toString().replace('day:', '');
    const eventId = event.active.id.toString().replace('event:', '');
    if (date && eventId) { await patch(`/api/events/${eventId}`, { date }); reload(); }
  }
  return <div className={`schedule-wrap schedule-view-${viewMode}`}>
    <div className="schedule-view-toolbar"><div className="schedule-view-toggle" aria-label="일정 보기 방식"><button className={viewMode === 'day' ? 'active' : ''} onClick={() => setViewMode('day')}>날짜별</button><button className={viewMode === 'all' ? 'active' : ''} onClick={() => { didInitialScroll.current = false; setViewMode('all'); }}>전체보기</button></div><span>{viewMode === 'day' ? `${selectedIndex + 1} / ${days.length} · 한 날짜 집중 보기` : '5일 전체 · 좌우 스크롤'}</span></div>
    {viewMode === 'day' && <div className="mobile-day-switcher schedule-day-switcher" aria-label="여행 날짜 선택">
      <button className="day-step" disabled={selectedIndex === 0} onClick={() => moveSelectedDay(-1)} aria-label="이전 날짜"><ArrowLeft size={18}/></button>
      <div className="mobile-day-tabs">{days.map((date, index) => <button key={date} className={selectedDay === date ? 'active' : ''} onClick={() => setSelectedDay(date)}><span>DAY {index + 1}</span><strong>{formatMonthDay(date)}</strong></button>)}</div>
      <button className="day-step next" disabled={selectedIndex === days.length - 1} onClick={() => moveSelectedDay(1)} aria-label="다음 날짜"><ChevronRight size={18}/></button>
    </div>}
    {tripIsActive && next && <section className="today-focus"><div className="today-focus-copy"><p className="eyebrow">TODAY · {formatDay(today)}</p><h2>{current ? '지금 일정' : '다음 일정'} · {next.title}</h2><p>{next.start_time || '시간 미정'}{next.end_time ? `–${next.end_time}` : ''}{next.location ? ` · ${next.location}` : ''}</p></div><div className="today-focus-meta">{todayWeather && <span>{weatherIcon(todayWeather.code)} {Math.round(todayWeather.max)}°/{Math.round(todayWeather.min)}° · 비 {todayWeather.rain}%</span>}{typeof next.meta?.transport === 'string' && <span><Route size={12}/>{next.meta.transport}</span>}{typeof next.meta?.rain === 'string' && <span><CloudRain size={12}/>{next.meta.rain}</span>}</div></section>}
    <div className="schedule-intro"><div><h2>Day plan</h2><p>일정을 잡아 원하는 날짜로 옮기세요. 시간은 카드에서 바로 수정할 수 있습니다.</p></div><span className="hint"><GripVertical size={15} /> drag to move</span></div>
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="day-grid" ref={dayGridRef} data-initial-day={initialDay} data-view-mode={viewMode}>
        {days.map((date) => <DayColumn key={date} date={date} index={days.indexOf(date)} active={date === selectedDay} events={trip.events.filter((e) => e.date === date)} weather={weather.find((w) => w.date === date)} reload={reload} allowCompletion={tripMode} />)}
      </div>
    </DndContext>
  </div>;
}

function DayColumn({ date, index, active, events, weather, reload, allowCompletion }: { date: string; index: number; active: boolean; events: TripEvent[]; weather?: WeatherDay; reload: () => void; allowCompletion: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  const walking = events.find((event) => typeof event.meta?.daily_walking === 'string')?.meta?.daily_walking;
  const orderedEvents = [...events].sort((a, b) => compareDayEvents(a, b, events));
  return <section className={`day-column ${active ? 'mobile-active' : ''} ${isOver ? 'drop-active' : ''}`} ref={setNodeRef} data-day-date={date}>
    <header><div><span>DAY {index + 1}</span><strong>{formatDay(date)}</strong>{typeof walking === 'string' && <small className="day-walking">보행 {walking}</small>}</div>{weather && <div className="day-weather"><span className="weather-symbol">{weatherIcon(weather.code)}</span><div><b>{Math.round(weather.max)}° / {Math.round(weather.min)}°</b><small>{weatherLabel(weather.code)} · 강수 {weather.rain}%</small></div></div>}</header>
    <div className="day-events">
      {orderedEvents.length ? orderedEvents.map((event) => <EventCard key={event.id} event={event} reload={reload} allowCompletion={allowCompletion} />) : <div className="empty-day"><span>비어 있는 날</span><small>장소나 일정을 여기로 드래그</small></div>}
    </div>
  </section>;
}

function EventCard({ event, reload, allowCompletion }: { event: TripEvent; reload: () => void; allowCompletion: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `event:${event.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;
  const icon = event.kind === 'flight' ? <Plane /> : event.kind === 'hotel' ? <BedDouble /> : event.kind === 'train' || event.kind === 'transfer' ? <Navigation /> : <MapPin />;
  const mapUrl = googleMapsEventUrl(event);
  const [timeDraft, setTimeDraft] = useState(event.start_time || '');
  useEffect(() => setTimeDraft(event.start_time || ''), [event.start_time]);
  async function changeTime(value: string) {
    const normalized = value.trim();
    if (normalized && !/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) { setTimeDraft(event.start_time || ''); return; }
    if (normalized === (event.start_time || '')) return;
    await patch(`/api/events/${event.id}`, { start_time: normalized || null }); reload();
  }
  async function remove() {
    if (event.source === 'booking' && !window.confirm('확정 예약 일정을 삭제할까요?')) return;
    await del(`/api/events/${event.id}`); reload();
  }
  async function toggleComplete() {
    await patch(`/api/events/${event.id}`, { completed_at: event.completed_at ? null : new Date().toISOString() });
    reload();
  }
  return <article ref={setNodeRef} style={style} className={`event-card kind-${event.kind} ${isDragging ? 'dragging' : ''} ${event.completed_at ? 'completed' : ''}`}>
    <button className="drag-handle" {...listeners} {...attributes}><GripVertical size={16} /></button>
    <div className="event-icon">{icon}</div>
    <div className="event-body"><EventVisual event={event} mapUrl={mapUrl}/><div className="event-title-row"><strong>{event.title}</strong><button className="mini-delete" onClick={remove} aria-label="삭제"><Trash2 size={13} /></button></div>
      <div className="event-time"><input className="event-time-24" type="text" inputMode="numeric" maxLength={5} value={timeDraft} placeholder="--:--" onChange={(e) => setTimeDraft(e.target.value)} onBlur={(e) => changeTime(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} aria-label={`${event.title} 시작 시간 24시간제`} />{event.end_time && <span>→ {event.end_time}</span>}{event.source === 'booking' && <span className="booking-lock">확정 예약</span>}</div>
      {allowCompletion && <button className={`event-completion-toggle ${event.completed_at ? 'done' : ''}`} onClick={toggleComplete}><Check size={13}/>{event.completed_at ? '완료됨 · 다시 열기' : '이 일정 완료'}</button>}
      {event.location && (mapUrl ? <a className="event-map-link" href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={12} /><span>{event.location}</span><ExternalLink size={10}/></a> : <p><MapPin size={12} /> {event.location}</p>)}
      {event.address && <button className="copy-address" onClick={() => navigator.clipboard?.writeText(event.address || '')}><Copy size={10}/> 주소 복사</button>}
      {event.notes && <small>{event.notes}</small>}
      {Boolean(event.meta && Object.keys(event.meta).length) && <div className="event-meta">
        {typeof event.meta?.transport === 'string' && <span><Route size={10}/>{event.meta.transport}</span>}
        {typeof event.meta?.walking === 'string' && <span>보행 {event.meta.walking}</span>}
        {typeof event.meta?.rain === 'string' && <span><CloudRain size={10}/>{event.meta.rain}</span>}
      </div>}
      <div className="event-source">{event.source === 'ai-import' ? <><Sparkles size={11}/> AI import</> : event.source === 'booking' ? 'booking' : event.source}</div>
    </div>
  </article>;
}

function EventVisual({ event, mapUrl }: { event: TripEvent; mapUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const icon = event.kind === 'flight' ? <Plane/> : event.kind === 'hotel' ? <BedDouble/> : event.kind === 'train' || event.kind === 'transfer' ? <Navigation/> : event.kind === 'reservation' ? <Utensils/> : <MapPin/>;
  const content = event.image_url && !failed
    ? <img src={event.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
    : <div className="event-visual-placeholder"><span>{icon}</span><small>{event.location || event.title}</small><em>{mapUrl ? 'Google Maps에서 위치 보기' : '일정 이미지 준비 중'}</em></div>;
  return mapUrl
    ? <a className="event-visual" href={mapUrl} target="_blank" rel="noreferrer" aria-label={`${event.title} 지도 열기`}>{content}</a>
    : <div className="event-visual">{content}</div>;
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

function DecisionBoard({ trip, reload }: { trip: Trip; reload: () => void }) {
  const restaurantsById = useMemo(() => new globalThis.Map(trip.restaurants.map((restaurant) => [restaurant.id, restaurant] as const)), [trip.restaurants]);
  const placeVisuals = useMemo(() => trip.places.filter((place) => place.research?.image_url), [trip.places]);
  function decisionImage(label: string) {
    const normalized = label.toLowerCase();
    return placeVisuals.find((place) => normalized.includes(place.name.toLowerCase()) || place.name.toLowerCase().includes(normalized))?.research?.image_url;
  }
  async function selectDecision(slotId: string, optionId: string) { await patch(`/api/decision-slots/${slotId}/select`, { option_id: optionId }); reload(); }
  async function selectRestaurant(slotId: string, restaurantId: string) { await patch(`/api/meal-slots/${slotId}/select`, { restaurant_id: restaurantId }); reload(); }
  const days = dateRange(trip.start_date, trip.end_date);
  return <section className="decision-board"><div className="decision-board-title"><div><p className="eyebrow">DECISION BOARD</p><h2>날짜별로 하나씩 결정하기</h2><p>이동 · 식사 · 식사 후 · 저녁 후를 한 덩어리로 보지 않고, 실제 선택해야 하는 순서대로 나눴습니다.</p></div></div>
    <div className="decision-days">{days.map((date, dayIndex) => {
      const decisionItems = (trip.decision_slots || []).filter((slot) => slot.date === date).map((slot) => ({ kind: 'decision' as const, time: slot.time || '99:99', order: slot.sort_order, slot }));
      const mealItems = (trip.meal_slots || []).filter((slot) => slot.date === date).map((slot) => ({ kind: 'meal' as const, time: slot.time || '99:99', order: slot.sort_order, slot }));
      const items = [...decisionItems, ...mealItems].sort((a, b) => a.time.localeCompare(b.time) || a.order - b.order);
      if (!items.length) return null;
      return <section className="decision-day" key={date}><header><span>DAY {dayIndex + 1}</span><h3>{formatDay(date)}</h3><b>{items.length}개 선택 섹션</b></header><div className="decision-section-list">{items.map((item) => {
        if (item.kind === 'meal') {
          const slot = item.slot;
          return <section className="decision-section meal-decision-section" key={`meal-${slot.id}`}><header><div><span>{slot.time || '시간 미정'} · 식사</span><h4>{slot.label}</h4><p>{slot.area || ''}</p></div><b>{slot.selected_restaurant_id ? `선택 · ${restaurantsById.get(slot.selected_restaurant_id)?.name || ''}` : '미선택'}</b></header><div className="decision-option-grid">{slot.option_ids.map((restaurantId) => { const restaurant = restaurantsById.get(restaurantId); if (!restaurant) return null; const selected = slot.selected_restaurant_id === restaurant.id; const planB = Boolean(slot.selected_restaurant_id) && !selected; return <article className={`decision-option-card restaurant ${selected ? 'selected' : ''} ${planB ? 'plan-b' : ''}`} key={restaurant.id}><OptionVisual imageUrl={restaurant.image_url} type="meal" label={restaurant.name}/><div className="decision-option-top"><span>{restaurant.city || '식당'}</span>{selected ? <b>현재 선택</b> : planB ? <em>PLAN B</em> : null}</div><h5>{restaurant.name}</h5><p>{restaurant.price_range || '예산 확인'} · {restaurant.hours || '영업시간 확인'}</p><small>{restaurant.notes}</small><div className="decision-links">{restaurant.google_maps_url && <a href={restaurant.google_maps_url} target="_blank" rel="noreferrer"><MapPin size={13}/>지도</a>}{restaurant.menu_url && <a href={restaurant.menu_url} target="_blank" rel="noreferrer"><Utensils size={13}/>메뉴</a>}{restaurant.reservation_url && <a href={restaurant.reservation_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>공식</a>}</div><button disabled={selected} onClick={() => selectRestaurant(slot.id, restaurant.id)}>{selected ? '선택됨' : '이 식당 선택'}</button></article>; })}</div></section>;
        }
        const slot = item.slot;
        return <section className={`decision-section type-${slot.section_type}`} key={slot.id}><header><div><span>{slot.time || '시간 미정'} · {decisionTypeLabel(slot.section_type)}</span><h4>{slot.title}</h4><p>{slot.subtitle}</p></div><b>{slot.region.toUpperCase()}</b></header><div className="decision-option-grid">{slot.options.map((option) => { const selected = slot.selected_option_id === option.id; const planB = Boolean(slot.selected_option_id) && !selected; return <article className={`decision-option-card ${selected ? 'selected' : ''} ${planB ? 'plan-b' : ''}`} key={option.id}><OptionVisual imageUrl={decisionImage(option.label)} type={slot.section_type} label={option.label}/><div className="decision-option-top"><span>{option.badge || decisionTypeLabel(slot.section_type)}</span>{selected ? <b>현재 선택</b> : planB ? <em>PLAN B</em> : option.recommended ? <b>추천</b> : null}</div><h5>{option.label}</h5>{option.route && <div className="decision-route">{option.route}</div>}<p>{[option.price, option.duration].filter(Boolean).join(' · ')}</p><small>{option.summary}</small><div className="decision-links">{option.map_url && <a href={option.map_url} target="_blank" rel="noreferrer"><MapPin size={13}/>길찾기</a>}{option.source_url && <a href={option.source_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>공식</a>}</div><button disabled={selected} onClick={() => selectDecision(slot.id, option.id)}>{selected ? '현재 선택' : '이 옵션 선택'}</button></article>; })}</div></section>;
      })}</div></section>;
    })}</div>
  </section>;
}

function OptionVisual({ imageUrl, type, label }: { imageUrl?: string | null; type: string; label: string }) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) return <img className="decision-option-visual" src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>;
  const icon = type === 'meal' ? <Utensils/> : type === 'transport' ? <Navigation/> : type === 'recovery' ? <BedDouble/> : <MapPin/>;
  return <div className={`decision-option-visual decision-option-placeholder type-${type}`}><span>{icon}</span><small>{label}</small></div>;
}

function VotePanel({ trip, plannerName, reload }: { trip: Trip; plannerName: string; reload: () => void }) {
  const [scheduleFor, setScheduleFor] = useState<Place | null>(null);
  const [schedule, setSchedule] = useState({ date: trip.start_date, start_time: '10:00' });
  const [filter, setFilter] = useState<'all'|'restaurant'|'place'>('all');
  const [regionFilter, setRegionFilter] = useState<'all'|'Kyoto'|'Osaka'>('all');
  const [viewMode, setViewMode] = useState<'schedule'|'theme'>('schedule');
  const restaurantsById = useMemo(() => new globalThis.Map(trip.restaurants.map((restaurant) => [restaurant.id, restaurant] as const)), [trip.restaurants]);
  const candidateEntries = useMemo(() => {
    const entries: Array<{ place: Place; restaurant: Restaurant | null; mealSlots: MealSlot[]; date: string | null; orderKey: string; theme: string; region: 'Kyoto'|'Osaka'; context: string }> = [];
    for (const place of trip.places) {
      const restaurant = place.restaurant_id ? restaurantsById.get(place.restaurant_id) || null : null;
      const region = candidateRegion(place, restaurant);
      if (restaurant) {
        const slots = (trip.meal_slots || []).filter((slot) => slot.option_ids.includes(restaurant.id));
        const dates = [...new Set(slots.map((slot) => slot.date))];
        if (!dates.length) {
          entries.push({ place, restaurant, mealSlots: [], date: null, orderKey: '99:99|999', theme: '식당', region, context: '식사 일정 미정' });
          continue;
        }
        for (const date of dates) {
          const dateSlots = slots.filter((slot) => slot.date === date).sort((a, b) => `${a.time || '99:99'}|${a.sort_order}`.localeCompare(`${b.time || '99:99'}|${b.sort_order}`));
          entries.push({
            place, restaurant, mealSlots: dateSlots, date,
            orderKey: `${dateSlots[0]?.time || '99:99'}|${String(dateSlots[0]?.sort_order || 999).padStart(3, '0')}`,
            theme: '식당', region,
            context: dateSlots.map((slot) => `${slot.time || ''} ${slot.label}`.trim()).join(' · '),
          });
        }
        continue;
      }

      const relatedEvents = trip.events.filter((event) => candidatePlaceMatchesEvent(place, event));
      const dates = [...new Set([...relatedEvents.map((event) => event.date), ...(place.research?.suggested_dates || [])])];
      if (!dates.length) {
        entries.push({ place, restaurant: null, mealSlots: [], date: null, orderKey: '99:99|999', theme: candidateThemeLabel(place), region, context: place.research?.note || '아직 일정에 넣지 않은 후보' });
        continue;
      }
      for (const date of dates) {
        const events = relatedEvents.filter((event) => event.date === date).sort((a, b) => compareDayEvents(a, b, relatedEvents));
        const first = events[0];
        const researchTime = candidateResearchSortTime(place.research?.best_time);
        entries.push({
          place, restaurant: null, mealSlots: [], date,
          orderKey: `${first?.start_time || researchTime || '99:99'}|${String(first?.sort_order || place.research?.sort_order || 999).padStart(3, '0')}`,
          theme: candidateThemeLabel(place), region,
          context: events.length ? events.map((event) => `${event.start_time || ''} ${event.title}`.trim()).join(' · ') : [place.research?.best_time, place.research?.note].filter(Boolean).join(' · '),
        });
      }
    }
    return entries;
  }, [restaurantsById, trip.events, trip.meal_slots, trip.places]);
  const filteredEntries = candidateEntries.filter((entry) => (filter === 'all' || (filter === 'restaurant' ? Boolean(entry.restaurant) : !entry.restaurant)) && (regionFilter === 'all' || entry.region === regionFilter));
  const regionCounts = useMemo(() => {
    const unique = new globalThis.Map<string, 'Kyoto'|'Osaka'>();
    for (const entry of candidateEntries) unique.set(entry.place.id, entry.region);
    return { Kyoto: [...unique.values()].filter((region) => region === 'Kyoto').length, Osaka: [...unique.values()].filter((region) => region === 'Osaka').length };
  }, [candidateEntries]);
  const dateSections = useMemo(() => {
    const dates = dateRange(trip.start_date, trip.end_date);
    const result = dates.map((date, index) => ({ date, dayNumber: index + 1, entries: filteredEntries.filter((entry) => entry.date === date).sort((a, b) => a.orderKey.localeCompare(b.orderKey) || a.place.name.localeCompare(b.place.name)) })).filter((section) => section.entries.length);
    const unscheduled = filteredEntries.filter((entry) => !entry.date).sort((a, b) => a.theme.localeCompare(b.theme) || a.place.name.localeCompare(b.place.name));
    if (unscheduled.length) result.push({ date: '', dayNumber: 0, entries: unscheduled });
    return result;
  }, [filteredEntries, trip.start_date, trip.end_date]);
  async function vote(place: Place, value: 1|-1) { await post(`/api/places/${place.id}/vote`, { voter: plannerName || 'friend', value }); reload(); }
  async function addSchedule() { if (!scheduleFor) return; await post(`/api/places/${scheduleFor.id}/schedule`, schedule); setScheduleFor(null); reload(); }
  async function selectMeal(slotId: string, restaurantId: string) { await patch(`/api/meal-slots/${slotId}/select`, { restaurant_id: restaurantId }); reload(); }
  function renderCandidate(entry: typeof candidateEntries[number], index: number) {
    const { place: p, restaurant, mealSlots } = entry;
    const mapUrl = restaurant?.google_maps_url || googleMapsPlaceSearchUrl(p);
    return <article className={`vote-card visual-vote-card ${restaurant ? 'restaurant-vote-card' : ''}`} key={`${p.id}-${entry.date || 'flex'}`}><CandidateVisual url={restaurant?.image_url || p.research?.image_url} category={restaurant ? 'restaurant' : p.category} label={p.name}/><div className="rank">{String(index+1).padStart(2,'0')}</div><div className="vote-body"><div className="candidate-context"><span className={`candidate-region ${entry.region.toLowerCase()}`}>{entry.region.toUpperCase()}</span><span>{entry.context}</span></div><div className="idea-top"><span>{restaurant ? 'restaurant' : p.category}</span><small>{p.saved_by ? `${p.saved_by} saved` : 'saved'}</small></div><h3>{p.name}</h3><p>{restaurant ? `${restaurant.price_range || ''} · ${restaurant.hours || ''}` : (p.notes || p.address)}</p>{restaurant?.dietary_notes && <div className="vote-diet">{restaurant.dietary_notes}</div>}{p.research?.source_url && !restaurant && <div className="vote-links research-link"><a href={p.research.source_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>리서치 출처</a></div>}{mealSlots.length > 0 && <div className="vote-meal-slots">{mealSlots.map((slot)=><div key={slot.id}><span>{formatMonthDay(slot.date)} {slot.label}</span><button disabled={slot.selected_restaurant_id===restaurant?.id} onClick={()=>restaurant&&selectMeal(slot.id,restaurant.id)}>{slot.selected_restaurant_id===restaurant?.id?'선택됨':'이 식당 선택'}</button></div>)}</div>}<div className="vote-links">{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={13}/>Google Maps</a>}{restaurant?.menu_url && <a href={restaurant.menu_url} target="_blank" rel="noreferrer"><Utensils size={13}/>메뉴 · 사진</a>}{restaurant?.reservation_url && <a href={restaurant.reservation_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>공식</a>}</div><div className="vote-actions"><button onClick={() => vote(p, 1)}><Heart size={15}/><strong>{p.vote_score}</strong></button>{!restaurant && <button onClick={() => setScheduleFor(p)}><CalendarDays size={15}/> 일정에 넣기</button>}{!restaurant && <button className="ghost-icon" onClick={async () => { await del(`/api/places/${p.id}`); reload(); }}><Trash2 size={14}/></button>}</div></div></article>;
  }
  function renderRegionBlock(entries: typeof candidateEntries, mode: 'schedule'|'theme') {
    return <div className="vote-region-groups">{(['Kyoto','Osaka'] as const).map((region) => { const regionEntries = entries.filter((entry) => entry.region === region); if (!regionEntries.length) return null; return <section className={`vote-region-group ${region.toLowerCase()}`} key={region}><div className="vote-region-head"><div><span>{region.toUpperCase()}</span><strong>{region === 'Kyoto' ? '교토' : '오사카'}</strong></div><b>{regionEntries.length}개</b></div>{mode === 'schedule' ? <div className="vote-grid">{regionEntries.map((entry, index) => renderCandidate(entry, index))}</div> : <div className="vote-theme-groups">{[...new Set(regionEntries.map((entry) => entry.theme))].map((theme) => { const themeEntries = regionEntries.filter((entry) => entry.theme === theme); return <section className="vote-theme-group" key={theme}><h4>{theme}<span>{themeEntries.length}</span></h4><div className="vote-grid">{themeEntries.map((entry, index) => renderCandidate(entry, index))}</div></section>; })}</div>}</section>; })}</div>;
  }
  return <div className="panel-page vote-page"><DecisionBoard trip={trip} reload={reload}/><details className="research-pool"><summary><span><strong>추가 후보 · 투표 풀</strong><small>아직 선택 섹션에 넣지 않은 리서치 후보까지 보기</small></span><ChevronRight size={18}/></summary><div className="research-pool-body"><div className="page-title"><div><p className="eyebrow">SHARED SHORTLIST</p><h2>추가 후보를 날짜·지역별로 비교</h2><p>결정 보드 밖의 후보를 더 살펴보거나 투표할 때 사용합니다.</p></div><div className="people-stack">{trip.participants.map((p) => <span key={p.id}>{p.name.slice(0,1)}</span>)}</div></div>
    <div className="vote-region-filter"><span>지역</span><button className={regionFilter==='all'?'active':''} onClick={()=>setRegionFilter('all')}>전체</button><button className={regionFilter==='Kyoto'?'active kyoto':''} onClick={()=>setRegionFilter('Kyoto')}>KYOTO · {regionCounts.Kyoto}</button><button className={regionFilter==='Osaka'?'active osaka':''} onClick={()=>setRegionFilter('Osaka')}>OSAKA · {regionCounts.Osaka}</button></div>
    <div className="vote-toolbar"><div className="vote-filters"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>전체 {trip.places.length}</button><button className={filter==='restaurant'?'active':''} onClick={()=>setFilter('restaurant')}>식당 {trip.places.filter((place)=>place.restaurant_id).length}</button><button className={filter==='place'?'active':''} onClick={()=>setFilter('place')}>관광 · 장소 {trip.places.filter((place)=>!place.restaurant_id).length}</button></div><div className="vote-view-toggle"><button className={viewMode==='schedule'?'active':''} onClick={()=>setViewMode('schedule')}><CalendarDays size={13}/> 일정 순서</button><button className={viewMode==='theme'?'active':''} onClick={()=>setViewMode('theme')}><Sparkles size={13}/> 테마별</button></div></div>
    <div className="vote-date-sections">{dateSections.map((section) => <section className="vote-date-section" key={section.date || 'unscheduled'}><header><div><span>{section.date ? `DAY ${section.dayNumber}` : 'FLEX'}</span><h3>{section.date ? formatDay(section.date) : '날짜 미정 후보'}</h3></div><b>{section.entries.length}개 후보</b></header>{renderRegionBlock(section.entries, viewMode)}</section>)}</div>
    {scheduleFor && <div className="modal-backdrop" onMouseDown={() => setScheduleFor(null)}><div className="modal small-modal" onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">ADD TO DAY PLAN</p><h2>{scheduleFor.name}</h2></div><button className="icon-btn" onClick={()=>setScheduleFor(null)}><X/></button></div><div className="form-row"><label>날짜<select value={schedule.date} onChange={(e)=>setSchedule({...schedule,date:e.target.value})}>{dateRange(trip.start_date,trip.end_date).map(d=><option key={d}>{d}</option>)}</select></label><label>시간<input type="time" value={schedule.start_time} onChange={(e)=>setSchedule({...schedule,start_time:e.target.value})}/></label></div><button className="primary full" onClick={addSchedule}>일정에 추가</button></div></div>}
  </div></details></div>;
}

function RestaurantPhoto({ url, kind }: { url?: string | null; kind: 'meal' | 'vote' }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <div className={`${kind === 'vote' ? 'vote-photo vote-photo-fallback' : 'meal-image-fallback'} photo-explicit-fallback`}><Utensils/><small>사진 미제공</small></div>;
  return <img className={kind === 'vote' ? 'vote-photo' : undefined} src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>;
}

function CandidateVisual({ url, category, label }: { url?: string | null; category: string; label: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) return <img className="vote-photo" src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>;
  const key = (category || '').toLowerCase();
  const icon = key === 'restaurant' || key === 'food' ? <Utensils/> : key === 'nature' ? <CloudRain/> : key === 'activity' ? <Sparkles/> : <MapPin/>;
  return <div className="vote-photo vote-photo-fallback candidate-photo-fallback"><span>{icon}</span><small>{label}</small></div>;
}

type AssistantChatMessage = {
  role: 'user'|'assistant';
  content: string;
  sections?: Array<{ title: string; items: string[] }>;
  ideas?: Array<{ name: string; category?: string; reason?: string; bestTime?: string; area?: string }>;
};

function FloatingTripAssistant({ trip, weather, plannerName, mode, reload }: { trip: Trip; weather: WeatherDay[]; plannerName: string; mode: WorkspaceMode; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([{ role: 'assistant', content: 'Kyoto · Osaka 전체 일정, 식당 후보, 투표, 이동, 준비물 상태를 같이 보고 있어요. 무엇을 조정할까요?' }]);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const weatherText = weather.map((day) => `${day.date} ${weatherLabel(day.code)} ${Math.round(day.max)}/${Math.round(day.min)}C rain ${day.rain}%`).join('; ');
  const savedNames = new Set(trip.places.map((place) => place.name));
  useEffect(() => { if (open) messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, open, loading]);

  async function ask(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    const history = messages.slice(-8).map((message) => ({ role: message.role, content: message.content }));
    setInput(''); setMessages((prev) => [...prev, { role: 'user', content: prompt }]); setLoading(true); setOpen(true);
    try {
      const result: any = await post(`/api/trips/${trip.id}/ai/ideas`, { prompt, weather: weatherText, history, mode });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: result.message || '확인했습니다.',
        sections: Array.isArray(result.sections) ? result.sections.filter((section: any) => section && typeof section.title === 'string' && Array.isArray(section.items)) : [],
        ideas: Array.isArray(result.ideas) ? result.ideas : [],
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `응답을 불러오지 못했습니다: ${error instanceof Error ? error.message : 'unknown error'}` }]);
    } finally { setLoading(false); }
  }
  async function saveIdea(idea: NonNullable<AssistantChatMessage['ideas']>[number]) {
    if (savedNames.has(idea.name)) return;
    await post(`/api/trips/${trip.id}/places`, { name: idea.name, category: idea.category || 'AI 추천', address: idea.area || null, notes: [idea.reason, idea.bestTime ? `추천 시간: ${idea.bestTime}` : ''].filter(Boolean).join(' · '), saved_by: plannerName || 'Oosu' });
    reload();
  }
  const quickPrompts = mode === 'trip'
    ? ['지금 다음 일정 알려줘', '비 오면 바로 뭘 바꿔?', '지금 식당 Plan B 뭐야?', '호텔까지 가장 편하게 가는 법']
    : ['첫날 도착 후 선택지 정리해줘', '비 오면 일정 어떻게 바꿔?', '아직 안 한 준비 뭐야?', '오늘 식당 후보 비교해줘'];
  return <>
    <button className={`assistant-fab ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-label="MyTrip Assistant 열기"><Sparkles size={18}/><span>AI Assistant</span></button>
    {open && <aside className={`assistant-panel mode-${mode}`} aria-label="MyTrip Assistant"><header><div><span className="assistant-orbit"><Sparkles size={17}/></span><div><strong>MyTrip Assistant</strong><small>{mode === 'trip' ? 'TRIP · 오늘 상황 우선' : 'PLAN · 전체 계획 우선'}</small></div></div><button onClick={() => setOpen(false)} aria-label="Assistant 닫기"><X size={20}/></button></header><div className="assistant-context-strip"><span>{mode.toUpperCase()}</span><span>KYOTO</span><span>OSAKA</span><b>{trip.events.length} 일정</b><b>{trip.places.length} 후보</b><b>{trip.checklist.filter((item) => item.status !== 'DONE').length} 준비 남음</b></div><div className="assistant-quick">{quickPrompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div><div className="assistant-messages" ref={messagesRef}>{messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'AI' : plannerName || '나'}</span><AssistantMessageBody content={message.content} />{message.sections?.length ? <div className="assistant-sections">{message.sections.map((section, sectionIndex) => <section key={`${section.title}-${sectionIndex}`}><h4>{section.title}</h4><ol>{section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ol></section>)}</div> : null}{message.ideas?.length ? <div className="assistant-ideas">{message.ideas.map((idea) => <article key={`${idea.name}-${idea.bestTime || ''}`}><div><strong>{idea.name}</strong>{idea.area && <small>{idea.area}</small>}</div>{idea.reason && <p>{idea.reason}</p>}<footer>{idea.bestTime && <span>{idea.bestTime}</span>}<button disabled={savedNames.has(idea.name)} onClick={() => saveIdea(idea)}><Heart size={13}/>{savedNames.has(idea.name) ? '후보에 있음' : '후보 저장'}</button></footer></article>)}</div> : null}</div>)}{loading && <div className="assistant-message assistant loading"><span>AI</span><div className="assistant-message-copy">현재 일정과 후보를 같이 확인하는 중…</div></div>}</div><div className="assistant-composer"><textarea rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') ask(); }} placeholder={mode === 'trip' ? '예: 지금 비 오는데 다음 일정 어떻게 바꿀까?' : '예: 9/14 비 오면 Kiyomizu를 줄이고 어디로 가?'} /><button onClick={() => ask()} disabled={loading || !input.trim()}><Send size={18}/></button><small>⌘/Ctrl + Enter · 현재 일정/식당/투표/준비물 상태를 자동 참조</small></div></aside>}
  </>;
}

function AssistantMessageBody({ content }: { content: string }) {
  const normalized = content.trim();
  const numbered = [...normalized.matchAll(/(?:^|\s)(\d+)\)\s*([^]+?)(?=(?:\s\d+\)\s)|$)/g)];
  if (numbered.length >= 2) {
    const firstListIndex = normalized.search(/(?:^|\s)1\)\s/);
    const intro = firstListIndex > 0 ? normalized.slice(0, firstListIndex).trim().replace(/[:：]\s*$/, '') : '';
    return <div className="assistant-message-copy">{intro && <p>{intro}</p>}<ol>{numbered.map((match) => <li key={`${match[1]}-${match.index}`}>{match[2].trim()}</li>)}</ol></div>;
  }
  const paragraphs = normalized.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean);
  return <div className="assistant-message-copy">{paragraphs.map((paragraph, index) => <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>)}</div>;
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

    <div className="baggage-rule"><Luggage size={18}/><div><strong>이번 여행 가방 운영</strong><span>이번 여행 짐은 기내용 캐리어 + 기내용 백팩에만 배정합니다. 출국편의 위탁 허용량이 있더라도 체크인 캐리어는 비워두고 사용하지 않습니다.</span></div></div>

    <section className="bag-planner print-section"><div className="packing-section-head"><div><p className="eyebrow">BAG PLAN</p><h3>가방별로 나눠 담기</h3></div><button className="secondary no-print" onClick={()=>setAddingBag(!addingBag)}><Plus size={14}/> 가방 추가</button></div>
      {addingBag && <div className="inline-add no-print"><input placeholder="가방 이름" value={bagForm.name} onChange={(e)=>setBagForm({...bagForm,name:e.target.value})}/><input type="number" min="0" step="0.1" placeholder="제한 kg" value={bagForm.weight_limit} onChange={(e)=>setBagForm({...bagForm,weight_limit:e.target.value})}/><button className="primary" onClick={addBag}>추가</button></div>}
      <div className="bag-grid">{(trip.packing_bags || []).map((bag)=>{const weight=bagWeight(bag.id);const count=trip.packing.filter((item)=>item.bag_id===bag.id).length;const ratio=bag.weight_limit ? Math.min(100,(weight/bag.weight_limit)*100) : 0;return <article className={`bag-card ${count===0?'empty':''}`} key={bag.id}><div className="bag-card-head"><div><Luggage size={18}/><span><strong>{bag.name}</strong><small>{bag.owner || '공용'}</small></span></div><b>{weight.toFixed(1)}{bag.weight_limit ? ` / ${bag.weight_limit}` : ''} kg</b></div>{bag.weight_limit ? <div className={`weight-meter ${weight>bag.weight_limit?'over':''}`}><i style={{width:`${ratio}%`}}/></div>:null}<p>{bag.notes}</p><small>{count}개 항목{bag.name==='체크인 캐리어'&&count===0 ? ' · 비워둠' : ''}</small></article>})}</div>
    </section>

    <section className="packing-checklist print-section"><div className="packing-section-head"><div><p className="eyebrow">CHECKLIST</p><h3>준비물 체크리스트</h3></div></div>
      <div className="inline-add item-add no-print"><input placeholder="새 준비물" value={itemForm.label} onChange={(e)=>setItemForm({...itemForm,label:e.target.value})}/><input placeholder="카테고리" value={itemForm.category} onChange={(e)=>setItemForm({...itemForm,category:e.target.value})}/><select value={itemForm.owner} onChange={(e)=>setItemForm({...itemForm,owner:e.target.value})}>{trip.participants.map((p)=><option key={p.id}>{p.name}</option>)}<option>공용</option></select><select value={itemForm.bag_id} onChange={(e)=>setItemForm({...itemForm,bag_id:e.target.value})}><option value="">가방 선택</option>{(trip.packing_bags||[]).map((bag)=><option key={bag.id} value={bag.id}>{bag.name}</option>)}</select><button className="primary" onClick={addItem}><Plus size={14}/> 추가</button></div>
      <div className="packing-groups">{Object.entries(groups).map(([category, items]) => <section key={category}><h3>{category}<span>{items?.filter((item)=>item.checked).length || 0}/{items?.length || 0}</span></h3>{items?.map((item: PackingItem)=><div className={`packing-item packing-item-rich ${item.checked?'done':''}`} key={item.id}><label className="packing-check"><input type="checkbox" checked={Boolean(item.checked)} onChange={async(e)=>{await patch(`/api/packing/${item.id}`,{checked:e.target.checked});reload();}}/><span className="check-ui">{item.checked ? <Check size={14}/> : null}</span></label><div className="packing-item-copy"><strong>{item.label}</strong><small>{item.reason}</small><span className="item-source">{item.source==='pdf-template'?'체크리스트 기반':item.source==='weather-ai'?'날씨 추천':'직접 추가'}{Boolean(item.checklist_ids?.length) ? ' · 출발 전 체크와 연동' : ''}</span></div><select className="packing-select" value={item.owner || '공용'} onChange={async(e)=>{await patch(`/api/packing/${item.id}`,{owner:e.target.value==='공용'?null:e.target.value});reload();}}><option>공용</option>{trip.participants.map((p)=><option key={p.id}>{p.name}</option>)}</select><select className="packing-select" value={item.bag_id || ''} onChange={async(e)=>{await patch(`/api/packing/${item.id}`,{bag_id:e.target.value||null});reload();}}><option value="">미배정</option>{(trip.packing_bags||[]).map((bag)=><option key={bag.id} value={bag.id}>{bag.name}</option>)}</select><label className="weight-input"><input type="number" min="0" step="0.05" defaultValue={Number(item.weight_kg||0)} onBlur={async(e)=>{await patch(`/api/packing/${item.id}`,{weight_kg:Number(e.target.value||0)});reload();}}/><span>kg</span></label><button className="ghost-icon no-print" onClick={async()=>{await del(`/api/packing/${item.id}`);reload();}}><Trash2 size={13}/></button></div>)}</section>)}</div>
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
function timeInTimeZone(timeZone:string){return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone}).format(new Date());}
function compareDayEvents(a:TripEvent,b:TripEvent,events:TripEvent[]){const aKey=dayEventSortKey(a,events),bKey=dayEventSortKey(b,events);return aKey.localeCompare(bKey)||Number(a.sort_order||0)-Number(b.sort_order||0);}
function dayEventSortKey(event:TripEvent,events:TripEvent[]){if(event.start_time)return `${event.start_time}|1`;const title=event.title.toLowerCase();if(event.kind==='hotel'&&title.includes('check-in')){const related=events.find((item)=>item.id!==event.id&&item.kind==='hotel'&&item.start_time&&((item.location&&event.location&&item.location===event.location)||(item.address&&event.address&&item.address===event.address)));if(related?.start_time)return `${related.start_time}|2`;}if(event.kind==='hotel'&&title.includes('check-out')){const hotelName=event.location||'';const nextTransport=[...events].filter((item)=>item.start_time&&(item.kind==='train'||item.kind==='transfer'||typeof item.meta?.transport==='string')&&(!hotelName||item.location?.split(/\s*→\s*/)[0]?.trim()===hotelName)).sort((a,b)=>(a.start_time||'99:99').localeCompare(b.start_time||'99:99'))[0];if(nextTransport?.start_time)return `${subtractMinute(nextTransport.start_time)}|0`;}return '99:99|9';}
function subtractMinute(value:string){const [h,m]=value.split(':').map(Number);const total=Math.max(0,h*60+m-1);return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;}
function eventDestination(event:TripEvent){if(event.address)return event.address;const parts=(event.location||'').split(/\s*→\s*/).map((part)=>part.trim()).filter(Boolean);if(parts.length>1)return parts[parts.length-1];return event.location||(event.lat&&event.lng?`${event.lat},${event.lng}`:'');}
function googleMapsEventUrl(event:TripEvent){const parts=(event.location||'').split(/\s*→\s*/).map((part)=>part.trim()).filter(Boolean);if(event.kind!=='flight'&&parts.length>1){const origin=parts[0],destination=parts[parts.length-1];const transport=`${event.kind} ${String(event.meta?.transport||'')}`.toLowerCase();const travelmode=transport.includes('train')||transport.includes('metro')||transport.includes('subway')||transport.includes('bus')||transport.includes('haruka')||transport.includes('keihan')||transport.includes('nankai')?'transit':'walking';return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${travelmode}`;}const query=event.address||eventDestination(event);return query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:'';}
function googleMapsPlaceSearchUrl(place:Place){const query=place.address||place.name;return query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:'';}
function candidatePlaceMatchesEvent(place:Place,event:TripEvent){const name=normalizeCandidateText(place.name);if(!name)return false;const fields=[event.title,event.location,event.address].map((value)=>normalizeCandidateText(value||'')).filter(Boolean);if(fields.some((field)=>field.includes(name)||(name.length>=6&&name.includes(field))))return true;const address=normalizeCandidateText(place.address||'');return Boolean(address&&fields.some((field)=>field===address||(address.length>=10&&field.includes(address))));}
function normalizeCandidateText(value:string){return value.toLowerCase().replace(/[·’'().,\-_/]/g,' ').replace(/\s+/g,' ').trim();}
function candidateRegion(place:Place,restaurant?:Restaurant|null):'Kyoto'|'Osaka'{const explicit=place.research?.region;if(explicit==='Kyoto'||explicit==='Osaka')return explicit;const city=(restaurant?.city||'').toLowerCase();if(city.includes('kyoto'))return'Kyoto';if(city.includes('osaka')||city.includes('kix'))return'Osaka';const text=`${place.name} ${place.address||''}`.toLowerCase();if(/kyoto|京都|gion|fushimi|arashiyama|higashiyama|nakagyo|shimogyo/.test(text))return'Kyoto';return'Osaka';}
function candidateResearchSortTime(value?:string|null){const match=(value||'').match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);return match?`${match[1].padStart(2,'0')}:${match[2]}`:'';}
function decisionTypeLabel(value:string){const labels:Record<string,string>={transport:'이동',meal:'식사',activity:'활동',recovery:'휴식'};return labels[value]||value;}
function candidateThemeLabel(place:Place){const category=(place.category||'기타').toLowerCase();const labels:Record<string,string>={nature:'Nature · 자연',shrine:'Shrine · 신사',temple:'Temple · 사찰',food:'Food · 먹거리',neighborhood:'Neighborhood · 동네',landmark:'Landmark · 명소',activity:'Activity · 체험',place:'기타 장소'};return labels[category]||place.category||'기타 장소';}
function weatherIcon(code:number){if(code>=95)return '⛈';if(code>=61)return '🌧';if(code>=51)return '🌦';if(code>=45)return '🌫';if(code>=2)return '⛅';return '☀️';}
function weatherLabel(code:number){if(code>=95)return '뇌우';if(code>=80)return '소나기';if(code>=61)return '비';if(code>=51)return '이슬비';if(code>=45)return '안개';if(code>=3)return '흐림';if(code>=1)return '구름 조금';return '맑음';}
function outfitForWeather(day:WeatherDay){if(day.rain>=60)return '통기성 상의 · 마르기 쉬운 하의 · 워킹화 · 우산';if(day.max>=29)return '반팔 · 얇은 하의 · 선스크린 · 모자';if(day.min<=20)return '반팔 + 얇은 셔츠/가디건 · 편한 팬츠';return '가벼운 상의 · 편한 팬츠 · 워킹화';}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c));}
