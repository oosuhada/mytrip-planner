import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { io } from 'socket.io-client';
import {
  ArrowLeft, BedDouble, CalendarDays, Check, ChevronRight, CloudRain, Compass, Copy, ExternalLink, GripVertical,
  ClipboardCheck, Heart, Hotel, Import, Luggage, Map, MapPin, MessageCircle, MoreHorizontal, Navigation, Plane,
  AlertTriangle, Download, FastForward, Maximize2, Menu, PanelLeftClose, PanelLeftOpen, Plus, Printer, RefreshCw, Route, Search, Send, ShoppingBag, Sparkles, Trash2, Users, Utensils, Vote, WifiOff, X,
} from 'lucide-react';
import { api, applyPendingMutationsToTrip, applyQueuedMutationToTrip, del, flushQueuedMutations, patch, pendingMutationCount, post, prepareOfflinePack, readOfflinePackInfo, readTripRevision, readTripSnapshot, readWeatherSnapshot, subscribeSyncState, writeTripRevision, writeTripSnapshot, writeWeatherSnapshot } from './api';
import type { OfflinePackInfo } from './api';
import type { MealSlot, PackingItem, Place, Restaurant, SearchPlace, Trip, TripEvent, TripSummary, WeatherDay, WeatherHour } from './types';

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
type TripPhraseCategoryId = 'all' | 'restaurant' | 'diet' | 'transport' | 'hotel' | 'shopping' | 'help' | 'airport' | 'convenience' | 'sightseeing' | 'health' | 'emergency';
type TripEventStatus = 'PLANNED' | 'DONE' | 'SKIPPED' | 'CANCELLED';
type TripLiveGroup = { id: string; title: string; events: TripEvent[] };

function tripEventStatus(event: TripEvent): TripEventStatus {
  const status = event.event_status as TripEventStatus | undefined;
  if (status && ['PLANNED', 'DONE', 'SKIPPED', 'CANCELLED'].includes(status)) return status;
  return event.completed_at ? 'DONE' : 'PLANNED';
}

function TripPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<Tab>('guide');
  const initialTabResolved = useRef(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('plan');
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [weatherHours, setWeatherHours] = useState<WeatherHour[]>([]);
  const [plannerName, setPlannerName] = useState(() => {
    const stored = localStorage.getItem('mytrip-name');
    return !stored || stored === 'Woosu' ? 'Oosu' : stored;
  });
  const [quickAdd, setQuickAdd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('mytrip-sidebar-open') !== '0');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncState, setSyncState] = useState({ online: navigator.onLine, pending: 0, failed: false });
  const [offlinePack, setOfflinePack] = useState<OfflinePackInfo | null>(null);
  const [offlinePacking, setOfflinePacking] = useState(false);
  const [offlinePackError, setOfflinePackError] = useState('');

  const load = useCallback(async (forceNetwork = false) => {
    const cached = await readTripSnapshot<Trip>(tripId).catch(() => null);
    if (cached) setTrip(await applyPendingMutationsToTrip(cached.value));
    if (!navigator.onLine) return;
    const cachedRevision = await readTripRevision(tripId).catch(() => null);
    let currentRevision: string | null = null;
    try {
      currentRevision = (await api<{ revision: string }>(`/api/trips/${tripId}/revision`)).revision;
      if (!forceNetwork && cached && cachedRevision?.value === currentRevision) return;
    } catch {
      if (cached) return;
    }
    const fresh = await api<Trip>(`/api/trips/${tripId}`);
    await writeTripSnapshot(tripId, fresh).catch(() => undefined);
    if (currentRevision) await writeTripRevision(tripId, currentRevision).catch(() => undefined);
    setTrip(await applyPendingMutationsToTrip(fresh));
  }, [tripId]);
  const reload = useCallback(() => load(true), [load]);
  const loadWeather = useCallback(async (currentTrip: Trip, forceNetwork = false) => {
    const cached = await readWeatherSnapshot<{ daily: WeatherDay[]; hourly: WeatherHour[] }>(currentTrip.id).catch(() => null);
    const cachedUsable = Boolean(cached?.value?.daily?.length);
    if (cachedUsable && cached) {
      setWeather(cached.value.daily || []);
      setWeatherHours(cached.value.hourly || []);
    }
    const today = todayInTimeZone('Asia/Tokyo');
    const active = today >= currentTrip.start_date && today <= currentTrip.end_date;
    const ttl = active ? 20 * 60 * 1000 : 2 * 60 * 60 * 1000;
    if (!navigator.onLine || (!forceNetwork && cachedUsable && cached && Date.now() - cached.updated_at < ttl)) {
      return cachedUsable && cached ? cached.value : { daily: [] as WeatherDay[], hourly: [] as WeatherHour[] };
    }
    const days = dateRange(currentTrip.start_date, currentTrip.end_date);
    const results = await Promise.allSettled(days.map(async (date) => {
      const anchor = weatherAnchorForDate(currentTrip, date);
      return api<{ daily: WeatherDay[]; hourly?: WeatherHour[] }>(`/api/weather?lat=${anchor.lat}&lng=${anchor.lng}&start=${date}&end=${date}`);
    }));
    const fulfilled = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const daily = fulfilled.flatMap((result) => result.daily).sort((a, b) => a.date.localeCompare(b.date));
    const hourly = fulfilled.flatMap((result) => result.hourly || []).sort((a, b) => a.time.localeCompare(b.time));
    if (daily.length) {
      await writeWeatherSnapshot(currentTrip.id, { daily, hourly }).catch(() => undefined);
      setWeather(daily);
      setWeatherHours(hourly);
      return { daily, hourly };
    }
    return cachedUsable && cached ? cached.value : { daily: [] as WeatherDay[], hourly: [] as WeatherHour[] };
  }, []);
  useEffect(() => {
    readOfflinePackInfo(tripId).then((snapshot) => setOfflinePack(snapshot?.value || null)).catch(() => undefined);
    pendingMutationCount().then((pending) => setSyncState((state) => ({ ...state, pending }))).catch(() => undefined);
    flushQueuedMutations().then(({ flushed }) => load(flushed > 0)).catch(() => load(false));
    socket.emit('trip:join', tripId);
    const refresh = (data: { tripId: string }) => data.tripId === tripId && reload();
    socket.on('trip:updated', refresh);
    const unsubscribe = subscribeSyncState((detail) => {
      setSyncState({ online: detail.online, pending: detail.pending, failed: Boolean(detail.failed) });
      if (detail.mutation) setTrip((current) => current ? applyQueuedMutationToTrip(current, detail.mutation!) : current);
      if (detail.flushed) reload().catch(() => undefined);
    });
    return () => { unsubscribe(); socket.emit('trip:leave', tripId); socket.off('trip:updated', refresh); };
  }, [tripId, load, reload]);

  useEffect(() => {
    if (!trip) return;
    loadWeather(trip).catch(() => undefined);
  }, [trip?.id, trip?.start_date, trip?.end_date, loadWeather]);

  async function saveOfflinePack() {
    if (!trip || offlinePacking || !navigator.onLine) return;
    setOfflinePacking(true);
    setOfflinePackError('');
    try {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
      const packWeather = weather.length ? { daily: weather, hourly: weatherHours } : await loadWeather(trip, true);
      const info = await prepareOfflinePack({ tripId: trip.id, trip, weather: packWeather.daily, weatherHours: packWeather.hourly });
      setOfflinePack(info);
    } catch (error) {
      setOfflinePackError(error instanceof Error ? error.message : '오프라인 저장에 실패했습니다.');
    } finally { setOfflinePacking(false); }
  }

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
        <OfflinePackBar info={offlinePack} saving={offlinePacking} online={syncState.online} error={offlinePackError} onSave={saveOfflinePack} />
        {(!syncState.online || syncState.pending > 0 || syncState.failed) && <div className={`sync-status-bar ${syncState.online ? 'syncing' : 'offline'}`}><span>{syncState.online ? <RefreshCw size={14}/> : <WifiOff size={14}/>}<b>{syncState.online ? (syncState.failed ? '동기화 재시도 필요' : '변경 동기화 중') : '오프라인'}</b>{syncState.pending > 0 && <em>{syncState.pending}개 변경 대기</em>}</span><small>{syncState.online ? '연결된 상태에서 자동 저장합니다.' : '일정 변경은 이 기기에 저장하고 연결되면 자동 반영합니다.'}</small></div>}
        <div className="content-area">
          {workspaceMode === 'trip' && tab === 'today' && <TripLivePanel trip={trip} weather={weather} weatherHours={weatherHours} reload={reload} onOpenTab={selectTab} />}
          {workspaceMode === 'trip' && tab === 'trip-weather' && <TripWeatherOutfitPanel trip={trip} weather={weather} />}
          {workspaceMode === 'trip' && tab === 'phrases' && <TripJapanesePanel />}
          {workspaceMode === 'plan' && tab === 'guide' && <TripGuidePanel trip={trip} reload={reload} />}
          {tab === 'schedule' && <ScheduleBoard trip={trip} weather={weather} reload={reload} tripMode={workspaceMode === 'trip'} />}
          {tab === 'map' && (workspaceMode === 'trip' ? <TripFieldMapPanel trip={trip} online={syncState.online} /> : <DiscoverPanel trip={trip} plannerName={plannerName} reload={reload} />)}
          {workspaceMode === 'plan' && tab === 'votes' && <VotePanel trip={trip} plannerName={plannerName} reload={reload} />}
          {workspaceMode === 'plan' && tab === 'packing' && <PackingPanel trip={trip} weather={weather} reload={reload} />}
          {workspaceMode === 'plan' && tab === 'inbox' && <InboxPanel trip={trip} weather={weather} plannerName={plannerName} reload={reload} />}
        </div>
      </section>
      {mobileMenuOpen && <MobileMenuDrawer trip={trip} mode={workspaceMode} tab={tab} plannerName={plannerName} onNameChange={updateName} onSelectMode={selectMode} onSelect={selectTab} onClose={() => setMobileMenuOpen(false)} />}
      {quickAdd && <QuickAdd trip={trip} onClose={() => setQuickAdd(false)} reload={reload} />}
      <FloatingTripAssistant trip={trip} weather={weather} plannerName={plannerName} mode={workspaceMode} reload={reload} />
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
  const today = todayInTimeZone('Asia/Seoul');
  const daysUntilDeparture = Math.round((plainDateUtc(trip.start_date) - plainDateUtc(today)) / 86400000);
  const pendingChecklist = trip.checklist.filter((item) => item.status !== 'DONE').sort((a, b) => checklistUrgencyScore(b) - checklistUrgencyScore(a));
  const urgentReservations = selectedRestaurants.filter((restaurant) => restaurant.reservation_action === 'RESERVE NOW' && restaurant.reservation_status !== 'BOOKED');
  const showDeparturePriority = daysUntilDeparture >= 0 && daysUntilDeparture <= 3 && (pendingChecklist.length > 0 || urgentReservations.length > 0);

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

    {showDeparturePriority && <section className="departure-priority" aria-label="출발 전 우선 처리">
      <header><div><AlertTriangle size={18}/><span><p className="eyebrow">DEPARTURE PRIORITY · D-{daysUntilDeparture}</p><h3>지금 먼저 끝낼 것</h3></span></div><b>{pendingChecklist.length} 준비 · {urgentReservations.length} 예약</b></header>
      <p>출발이 가까워져서 전체 준비 목록보다 예약·입국·통신·오프라인 준비를 먼저 보여줍니다.</p>
      <div className="departure-priority-list">
        {pendingChecklist.slice(0, 6).map((item) => <article key={item.id}><span className="priority-rank">{checklistUrgencyScore(item) >= 80 ? '필수' : '다음'}</span><div><strong>{item.title}</strong><small>{item.category}{item.notes ? ` · ${item.notes}` : ''}</small></div><button disabled={item.id === 'plan-task-restaurants'} onClick={() => toggleChecklist(item.id, item.status)}>{item.id === 'plan-task-restaurants' ? '아래 예약과 연동' : '완료'}</button></article>)}
        {urgentReservations.slice(0, 4).map((restaurant) => <article key={`urgent-${restaurant.id}`}><span className="priority-rank reserve">예약</span><div><strong>{restaurant.name}</strong><small>{restaurant.planned_date ? `${formatMonthDay(restaurant.planned_date)} ${restaurant.planned_time || ''}` : restaurant.city || ''} · RESERVE NOW</small></div><span className="priority-actions">{restaurant.reservation_url && <a href={restaurant.reservation_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>예약</a>}<button onClick={() => toggleReservation(restaurant.id, restaurant.reservation_status)}>예약 완료</button></span></article>)}
      </div>
    </section>}

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

function OfflinePackBar({ info, saving, online, error, onSave }: { info: OfflinePackInfo | null; saving: boolean; online: boolean; error: string; onSave: () => void }) {
  const stale = Boolean(info && Date.now() - info.saved_at > 12 * 60 * 60 * 1000);
  const savedAt = info ? new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(info.saved_at)) : '';
  const storage = info?.storage_bytes ? formatBytes(info.storage_bytes) : null;
  return <div className={`offline-pack-bar ${info ? 'ready' : 'empty'} ${!online ? 'offline' : ''} ${error ? 'error' : ''}`}>
    <div className="offline-pack-copy"><span className="offline-pack-icon">{error ? <AlertTriangle size={16}/> : info ? <Check size={16}/> : <Download size={16}/>}</span><span><strong>{error ? '오프라인 저장 확인 필요' : info ? '오프라인 사용 준비됨' : '여행 전체 오프라인 저장'}</strong><small>{error || (info ? `앱 · 일정 · 일본어 · ${info.weather_saved ? '날씨' : '날씨 제외'} · 좌표 기반 오프라인 동선 지도 저장` : 'Wi-Fi에서 한 번 저장하면 일본에서 데이터 없이 핵심 화면을 열 수 있습니다.')}</small></span></div>
    <div className="offline-pack-actions">{info && <span>{savedAt}{storage ? ` · ${storage}` : ''}{stale ? ' · 갱신 권장' : ''}</span>}<button onClick={onSave} disabled={saving || !online}>{saving ? '저장 중…' : !online ? (info ? '저장됨' : '연결 후 저장') : info ? '오프라인 갱신' : '지금 저장'}</button></div>
  </div>;
}

function TripLivePanel({ trip, weather, weatherHours, reload, onOpenTab }: { trip: Trip; weather: WeatherDay[]; weatherHours: WeatherHour[]; reload: () => void; onOpenTab: (tab: Tab) => void }) {
  const today = todayInTimeZone('Asia/Tokyo');
  const active = today >= trip.start_date && today <= trip.end_date;
  const focusDate = active ? today : trip.start_date;
  const now = active ? timeInTimeZone('Asia/Tokyo') : '00:00';
  const events = trip.events.filter((event) => event.date === focusDate).sort((a, b) => compareDayEvents(a, b, trip.events));
  const actionableEvents = events.filter((event) => tripEventStatus(event) === 'PLANNED');
  const currentEvent = actionableEvents.find((event) => event.start_time && event.end_time && event.start_time <= now && event.end_time >= now);
  const nextEventCandidate = currentEvent || actionableEvents.find((event) => (event.start_time || '99:99') >= now) || actionableEvents[0];
  const currentIndex = currentEvent ? events.findIndex((event) => event.id === currentEvent.id) : -1;
  const nextIndex = nextEventCandidate ? events.findIndex((event) => event.id === nextEventCandidate.id) : -1;
  const anchorIndex = Math.max(0, nextIndex >= 0 ? nextIndex : Math.max(0, events.length - 1));
  const contextIndex = currentIndex < 0 && nextIndex > 0 ? nextIndex - 1 : -1;
  const liveStartIndex = contextIndex >= 0 ? contextIndex : anchorIndex;
  const liveEvents = events.slice(liveStartIndex);
  const liveGroups = groupTripLiveEvents(liveEvents);
  const remainingCount = actionableEvents.length;
  const liveEventRef = useRef<HTMLDivElement | null>(null);
  const mealSlots = (trip.meal_slots || []).filter((slot) => slot.date === focusDate);
  const restaurants = new globalThis.Map(trip.restaurants.map((restaurant) => [restaurant.id, restaurant] as const));
  const decisions = (trip.decision_slots || []).filter((slot) => slot.date === focusDate);
  const reservationRows = mealSlots.map((slot) => ({ slot, restaurant: slot.selected_restaurant_id ? restaurants.get(slot.selected_restaurant_id) : undefined })).filter((row) => row.restaurant);
  const coreMealSlots = mealSlots.filter((slot) => slot.selected_restaurant_id && !/optional|snack|dessert/i.test(slot.meal_type || ''));
  const roamEvents = events.filter((event) => event.kind === 'activity' && !/입국|출국|보안|게이트|대욕장|호텔 휴식|ICN|KIX/i.test(event.title));
  const dayWeather = weather.find((item) => item.date === focusDate);
  const progressEvents = events.filter((event) => tripEventStatus(event) !== 'CANCELLED');
  const completedCount = progressEvents.filter((event) => tripEventStatus(event) === 'DONE').length;
  const skippedCount = progressEvents.filter((event) => tripEventStatus(event) === 'SKIPPED').length;
  const resolvedCount = completedCount + skippedCount;
  const elapsedUncheckedCount = active ? progressEvents.filter((event) => {
    const finish = event.end_time || event.start_time;
    return tripEventStatus(event) === 'PLANNED' && Boolean(finish && finish < now);
  }).length : 0;
  const dayProgress = progressEvents.length ? Math.min(100, Math.round((resolvedCount / progressEvents.length) * 100)) : 0;
  const walkingTarget = events.find((event) => typeof event.meta?.daily_walking === 'string')?.meta?.daily_walking;
  const nextEvent = nextIndex >= 0 ? events[nextIndex] : undefined;
  const nextHour = nextEvent?.start_time ? Number(nextEvent.start_time.slice(0, 2)) : Number(now.slice(0, 2));
  const nextWeatherWindow = weatherHours.filter((item) => item.time.startsWith(`${focusDate}T`)).filter((item) => {
    const hour = Number(item.time.slice(11, 13));
    return hour >= Math.max(0, nextHour - 1) && hour <= Math.min(23, nextHour + 2);
  });
  const nextWindowRain = nextWeatherWindow.length ? Math.max(...nextWeatherWindow.map((item) => item.rain || 0)) : null;
  const nextWindowTemp = nextWeatherWindow.length ? Math.round(nextWeatherWindow.reduce((sum, item) => sum + Number(item.temp || 0), 0) / nextWeatherWindow.length) : null;
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
  const fieldAlert = nextWindowRain !== null && nextWindowRain >= 60
    ? `다음 일정 시간대 비 ${nextWindowRain}% · 야외 일정은 Plan B 준비`
    : nextWindowRain !== null && nextWindowRain >= 30
      ? `다음 일정 시간대 비 ${nextWindowRain}% · 우산을 바로 꺼낼 수 있게`
    : dayWeather && dayWeather.max >= 30
      ? '더운 날씨 · 물 자주 마시고 실내 휴식 구간 유지'
      : '일정 사이 휴식을 남겨두고 무리하지 않기';
  const [supportView, setSupportView] = useState<'meals'|'planb'>('meals');
  const [commandView, setCommandView] = useState<'move'|'meal'|'hotel'>('move');
  const visibleSupportView = supportView === 'meals' && reservationRows.length
    ? 'meals'
    : decisions.length
      ? 'planb'
      : 'meals';
  function openPhraseCategory(category: TripPhraseCategoryId) {
    localStorage.setItem('mytrip-phrase-category', category);
    onOpenTab('phrases');
  }
  async function selectPlanB(slotId: string, optionId: string) {
    await patch(`/api/decision-slots/${slotId}/select`, { option_id: optionId });
    reload();
  }
  async function setEventStatus(event: TripEvent, status: TripEventStatus) {
    if (!active) return;
    await patch(`/api/events/${event.id}`, { event_status: tripEventStatus(event) === status ? 'PLANNED' : status });
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

    <section className="trip-day-rhythm" aria-label="오늘 먹고 돌아다니기">
      <header><div><Utensils size={16}/><span><p className="eyebrow">EAT · EXPLORE</p><h3>오늘 먹고 · 돌아다니기</h3></span></div><b>{coreMealSlots.length}끼 · {roamEvents.length}곳</b></header>
      <div className="trip-day-meals">{coreMealSlots.map((slot, index) => { const restaurant = slot.selected_restaurant_id ? restaurants.get(slot.selected_restaurant_id) : undefined; return <article key={slot.id}><span>{index + 1}끼 · {slot.time || '--:--'}</span><strong>{restaurant?.name || slot.label}</strong><small>{slot.label}</small></article>; })}</div>
      {roamEvents.length > 0 && <div className="trip-day-roam"><span><MapPin size={13}/>돌아다닐 곳</span>{roamEvents.map((event) => <button key={event.id} onClick={() => onOpenTab('schedule')}><b>{event.start_time || ''}</b>{event.title}</button>)}</div>}
    </section>

    <section className="trip-field-dashboard" aria-label="오늘 여행 현황">
      <div className="trip-field-progress">
        <div><span><Navigation size={15}/>오늘 처리</span><strong>{resolvedCount}/{progressEvents.length}</strong></div>
        <div className="trip-progress-track"><i style={{ width: `${dayProgress}%` }}/></div>
        <small>{active ? `${dayProgress}% 처리 · 완료 ${completedCount}${skippedCount ? ` · 건너뜀 ${skippedCount}` : ''}${elapsedUncheckedCount ? ` · 지난 미처리 ${elapsedUncheckedCount}` : ''}` : '미리보기에서는 상태를 바꿀 수 없습니다. 여행 시작 후 완료/건너뜀을 직접 기록합니다.'}</small>
      </div>
      <div className="trip-field-stat"><span><Route size={15}/>보행 목표</span><strong>{typeof walkingTarget === 'string' ? walkingTarget : '여유 있게'}</strong><small>10k steps 크게 넘기지 않기</small></div>
      <div className="trip-field-stat"><span><CloudRain size={15}/>다음 일정 날씨</span><strong>{nextWindowTemp !== null ? `${nextWindowTemp}° · 비 ${nextWindowRain}%` : dayWeather ? `${Math.round(dayWeather.max)}° / ${Math.round(dayWeather.min)}°` : '예보 확인 중'}</strong><small>{nextEvent?.start_time ? `${nextEvent.start_time} 전후 3시간` : rainLevel !== null ? `하루 강수 ${rainLevel}%` : '날씨 탭에서 확인'}</small></div>
      <div className="trip-field-alert"><CloudRain size={16}/><span>{fieldAlert}</span></div>
    </section>

    <section className="trip-now-section"><div className="trip-section-heading"><div><Navigation/><span><p className="eyebrow">NOW · NEXT</p><h3>지금부터 다음 일정</h3></span></div><div className="trip-scroll-controls"><b>{remainingCount > 0 ? `미처리 ${remainingCount}개 · ${liveGroups.length}개 묶음` : '오늘 일정 종료'}</b><button onClick={() => scrollLiveEvents(-1)} aria-label="이전 일정"><ArrowLeft size={15}/></button><button onClick={() => scrollLiveEvents(1)} aria-label="다음 일정"><ChevronRight size={15}/></button></div></div><div className="trip-live-events" ref={liveEventRef}>{liveGroups.map((group) => group.events.length > 1 ? <TripJourneyCard key={group.id} group={group} active={active} now={now} nextEventId={nextEvent?.id} onSetStatus={setEventStatus}/> : (() => { const event = group.events[0]; const mapUrl = googleMapsEventUrl(event); const status = tripEventStatus(event); const eventIndex = events.findIndex((item) => item.id === event.id); const isNow = active && status === 'PLANNED' && event.start_time && event.end_time && event.start_time <= now && event.end_time >= now; const liveLabel = status === 'DONE' ? 'DONE' : status === 'SKIPPED' ? 'SKIP' : status === 'CANCELLED' ? 'CANCEL' : isNow ? 'NOW' : eventIndex === contextIndex ? 'PREV' : eventIndex === nextIndex ? 'NEXT' : 'THEN'; return <article className={`trip-live-event status-${status.toLowerCase()} ${isNow ? 'now' : ''}`} key={event.id}><EventVisual event={event} mapUrl={mapUrl}/><div className="trip-live-event-copy"><div><span>{liveLabel}</span><b>{event.start_time || '--:--'}{event.end_time ? `–${event.end_time}` : ''}</b></div><h4>{event.title}</h4>{event.location && <p>{event.location}</p>}<div className="trip-live-actions trip-state-actions"><button disabled={!active} className={`trip-complete-action ${status === 'DONE' ? 'done' : ''}`} onClick={() => setEventStatus(event, 'DONE')}><Check size={14}/>{!active ? '여행 시작 후 체크' : status === 'DONE' ? '완료 취소' : '완료'}</button><button disabled={!active} className={status === 'SKIPPED' ? 'skip-active' : ''} onClick={() => setEventStatus(event, 'SKIPPED')}><FastForward size={13}/>{status === 'SKIPPED' ? '건너뜀 취소' : '건너뜀'}</button>{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={14}/>Google Maps</a>}</div></div></article>; })())}</div></section>

    <section className="trip-command-center">
      <div className="trip-section-heading"><div><Compass/><span><p className="eyebrow">FIELD COMMAND</p><h3>현장에서 바로 쓰기</h3></span></div><b>지도 · 식사 · 숙소를 한 번에</b></div>
      <div className="trip-command-switcher" role="tablist" aria-label="현장 정보 선택"><button className={commandView === 'move' ? 'active' : ''} onClick={() => setCommandView('move')}><Navigation size={14}/>다음 이동</button><button className={commandView === 'meal' ? 'active' : ''} onClick={() => setCommandView('meal')}><Utensils size={14}/>다음 식사</button><button className={commandView === 'hotel' ? 'active' : ''} onClick={() => setCommandView('hotel')}><BedDouble size={14}/>숙소</button></div>
      <div className="trip-command-focus">
        {commandView === 'move' && <article className="trip-command-card primary-card">
          <header><span><Navigation size={16}/>다음 이동</span>{nextEvent?.start_time && <b>{nextEvent.start_time}</b>}</header>
          <h4>{nextEvent?.title || '오늘 일정 종료'}</h4>
          {nextEvent?.location && <p>{nextEvent.location}</p>}
          {(nextTransport || nextWalking) && <small>{[nextTransport, nextWalking].filter(Boolean).join(' · ')}</small>}
          <footer>{nextMapUrl && <a href={nextMapUrl} target="_blank" rel="noreferrer"><MapPin size={14}/>지도 열기</a>}<button onClick={() => openPhraseCategory('transport')}><MessageCircle size={13}/>교통 일본어</button>{nextEvent?.address && <button onClick={() => navigator.clipboard?.writeText(nextEvent.address || '')}><Copy size={13}/>주소 복사</button>}</footer>
        </article>}
        {commandView === 'meal' && <article className="trip-command-card">
          <header><span><Utensils size={16}/>다음 식사</span>{nextMealSlot?.time && <b>{nextMealSlot.time}</b>}</header>
          <h4>{nextMeal?.name || nextMealSlot?.label || '식사 후보 확인'}</h4>
          <p>{nextMeal ? [nextMeal.price_range, nextMeal.hours].filter(Boolean).join(' · ') : '선택된 식당이 없어요.'}</p>
          {nextMeal?.dietary_notes && <small>{nextMeal.dietary_notes}</small>}
          <footer>{nextMeal?.google_maps_url && <a href={nextMeal.google_maps_url} target="_blank" rel="noreferrer"><MapPin size={14}/>식당 지도</a>}<button onClick={() => openPhraseCategory('restaurant')}><MessageCircle size={13}/>식당 일본어</button>{nextMeal?.menu_url && <a href={nextMeal.menu_url} target="_blank" rel="noreferrer"><Utensils size={13}/>메뉴</a>}</footer>
        </article>}
        {commandView === 'hotel' && <article className="trip-command-card">
          <header><span><BedDouble size={16}/>오늘 숙소</span></header>
          <h4>{currentHotel?.location || currentHotel?.title || '숙소 확인'}</h4>
          {currentHotel?.address && <p>{currentHotel.address}</p>}
          <small>피곤하거나 비가 세면 숙소 복귀를 우선</small>
          <footer>{hotelMapUrl && <a href={hotelMapUrl} target="_blank" rel="noreferrer"><MapPin size={14}/>숙소 지도</a>}<button onClick={() => openPhraseCategory('hotel')}><MessageCircle size={13}/>호텔 일본어</button>{currentHotel?.address && <button onClick={() => navigator.clipboard?.writeText(currentHotel.address || '')}><Copy size={13}/>주소 복사</button>}</footer>
        </article>}
      </div>
      <div className="trip-quick-actions" aria-label="TRIP 빠른 메뉴">
        <button onClick={() => onOpenTab('schedule')}><CalendarDays size={15}/><span>전체 일정</span></button>
        <button onClick={() => onOpenTab('trip-weather')}><CloudRain size={15}/><span>날씨 · 코디</span></button>
        <button onClick={() => openPhraseCategory('all')}><MessageCircle size={15}/><span>일본어 표현</span></button>
        {hotelMapUrl ? <a href={hotelMapUrl} target="_blank" rel="noreferrer"><BedDouble size={15}/><span>숙소로 이동</span></a> : <button onClick={() => onOpenTab('map')}><MapPin size={15}/><span>지도</span></button>}
      </div>
    </section>

    {(reservationRows.length > 0 || decisions.length > 0) && <section className="trip-support-hub">
      <div className="trip-section-heading"><div><MoreHorizontal/><span><p className="eyebrow">TODAY'S SUPPORT</p><h3>오늘 참고</h3></span></div><b>필요한 정보만 하나씩 보기</b></div>
      <div className="trip-support-tabs" role="tablist" aria-label="오늘 참고 정보">
        {reservationRows.length > 0 && <button className={visibleSupportView === 'meals' ? 'active' : ''} onClick={() => setSupportView('meals')}><Utensils size={14}/>식사 · 예약 <span>{reservationRows.length}</span></button>}
        {decisions.length > 0 && <button className={visibleSupportView === 'planb' ? 'active' : ''} onClick={() => setSupportView('planb')}><Route size={14}/>Plan B <span>{decisions.length}</span></button>}
      </div>
      {visibleSupportView === 'meals' && reservationRows.length > 0 && <div className="trip-support-content"><div className="trip-meal-live-grid">{reservationRows.map(({ slot, restaurant }) => restaurant && <article key={slot.id}><RestaurantPhoto url={restaurant.image_url} kind="meal"/><div><span>{slot.time || ''} · {slot.label}</span><h4>{restaurant.name}</h4><p>{restaurant.hours || '영업시간 확인'} · {restaurant.price_range || '예산 확인'}</p><div>{restaurant.google_maps_url && <a href={restaurant.google_maps_url} target="_blank" rel="noreferrer"><MapPin size={13}/>지도</a>}<button onClick={() => openPhraseCategory('restaurant')}><MessageCircle size={12}/>식당 일본어</button>{restaurant.menu_url && <a href={restaurant.menu_url} target="_blank" rel="noreferrer"><Utensils size={13}/>메뉴</a>}<b className={`status-pill ${restaurant.reservation_status === 'BOOKED' ? 'booked' : 'walkin'}`}>{restaurant.reservation_status}</b></div></div></article>)}</div></div>}
      {visibleSupportView === 'planb' && decisions.length > 0 && <div className="trip-support-content"><div className="trip-planb-list">{decisions.map((slot) => { const selected = slot.options.find((option) => option.id === slot.selected_option_id); const alternatives = slot.options.filter((option) => option.id !== slot.selected_option_id); if (!selected || !alternatives.length) return null; return <article key={slot.id}><header><span>{slot.time || ''} · {slot.title}</span><strong>{selected.label}</strong></header><div className="trip-planb-options">{alternatives.map((option) => <div key={option.id}><span><b>PLAN B</b>{option.label}<small>{[option.duration, option.price].filter(Boolean).join(' · ')}</small></span><button onClick={() => selectPlanB(slot.id, option.id)}>이걸로 변경</button></div>)}</div></article>; })}</div></div>}
    </section>}

  </div>;
}

function TripJourneyCard({ group, active, now, nextEventId, onSetStatus }: { group: TripLiveGroup; active: boolean; now: string; nextEventId?: string; onSetStatus: (event: TripEvent, status: TripEventStatus) => Promise<void> }) {
  const first = group.events[0];
  const last = group.events[group.events.length - 1];
  const currentStep = group.events.find((event) => tripEventStatus(event) === 'PLANNED' && event.start_time && event.end_time && event.start_time <= now && event.end_time >= now);
  const nextStep = currentStep || group.events.find((event) => event.id === nextEventId) || group.events.find((event) => tripEventStatus(event) === 'PLANNED');
  const done = group.events.filter((event) => tripEventStatus(event) === 'DONE').length;
  const skipped = group.events.filter((event) => tripEventStatus(event) === 'SKIPPED').length;
  const mapUrl = googleMapsJourneyUrl(group.events);
  const focusStatus = nextStep ? tripEventStatus(nextStep) : 'PLANNED';
  return <article className={`trip-live-event trip-journey-card ${currentStep ? 'now' : ''}`}>
    <header className="trip-journey-head"><span>{currentStep ? 'NOW ROUTE' : nextStep?.id === nextEventId ? 'NEXT ROUTE' : 'ROUTE'}</span><b>{first.start_time || '--:--'}–{last.end_time || last.start_time || '--:--'}</b></header>
    <h4>{group.title}</h4>
    <div className="trip-journey-summary"><span>{group.events.length} steps</span>{done > 0 && <span>{done} 완료</span>}{skipped > 0 && <span>{skipped} 건너뜀</span>}</div>
    {nextStep && <div className={`trip-journey-focus status-${focusStatus.toLowerCase()}`}><span>NEXT STEP</span><div><b>{nextStep.start_time || '--:--'}</b><strong>{nextStep.title}</strong>{nextStep.location && <small>{nextStep.location}</small>}</div><span className="journey-step-actions"><button disabled={!active} className={focusStatus === 'DONE' ? 'done' : ''} onClick={() => onSetStatus(nextStep, 'DONE')} aria-label={`${nextStep.title} 완료`}><Check size={13}/></button><button disabled={!active} className={focusStatus === 'SKIPPED' ? 'skip-active' : ''} onClick={() => onSetStatus(nextStep, 'SKIPPED')} aria-label={`${nextStep.title} 건너뜀`}><FastForward size={12}/></button></span></div>}
    <details className="trip-journey-details"><summary>전체 {group.events.length}단계 보기 <ChevronRight size={14}/></summary><div className="trip-journey-steps">{group.events.map((event, index) => { const status = tripEventStatus(event); return <div className={`trip-journey-step status-${status.toLowerCase()}`} key={event.id}><span className="journey-step-index">{index + 1}</span><div><b>{event.start_time || '--:--'}</b><strong>{event.title}</strong>{event.location && <small>{event.location}</small>}</div><span className="journey-step-actions"><button disabled={!active} className={status === 'DONE' ? 'done' : ''} onClick={() => onSetStatus(event, 'DONE')} aria-label={`${event.title} 완료`}><Check size={13}/></button><button disabled={!active} className={status === 'SKIPPED' ? 'skip-active' : ''} onClick={() => onSetStatus(event, 'SKIPPED')} aria-label={`${event.title} 건너뜀`}><FastForward size={12}/></button></span></div>; })}</div></details>
    {mapUrl && <a className="trip-journey-map" href={mapUrl} target="_blank" rel="noreferrer"><Navigation size={14}/>이 이동 전체 길찾기</a>}
  </article>;
}

const tripPhraseGroups = [
  { id: 'restaurant' as const, title: '식당', description: '입장 · 예약 · 주문 · 포장 · 계산', icon: <Utensils/>, items: [
    ['すみません、二人です。', '스미마센, 후타리 데스.', '실례합니다, 두 명이에요.'],
    ['予約しています。', '요야쿠 시테이마스.', '예약했습니다.'],
    ['おすすめは何ですか？', '오스스메와 난데스카?', '추천 메뉴가 뭐예요?'],
    ['お水を二つお願いします。', '오미즈오 후타츠 오네가이시마스.', '물 두 잔 부탁해요.'],
    ['持ち帰りできますか？', '모치카에리 데키마스카?', '포장할 수 있나요?'],
    ['別々に払えますか？', '베츠베츠니 하라에마스카?', '따로 계산할 수 있나요?'],
  ] },
  { id: 'diet' as const, title: '음식 제한', description: '우니 · 비생선 해산물 · 내장 · 매운맛 확인', icon: <Utensils/>, items: [
    ['魚の寿司は食べられます。', '사카나노 스시와 타베라레마스.', '생선 초밥은 먹을 수 있어요.'],
    ['ウニは食べられません。', '우니와 타베라레마센.', '우니는 먹을 수 없어요.'],
    ['魚以外の海鮮は食べられません。', '사카나 이가이노 카이센와 타베라레마센.', '생선 이외의 해산물은 먹을 수 없어요.'],
    ['貝類は入っていますか？', '카이루이와 하잇테이마스카?', '조개류가 들어 있나요?'],
    ['内臓は入っていますか？', '나이조와 하잇테이마스카?', '내장이 들어 있나요?'],
    ['これは辛いですか？', '코레와 카라이 데스카?', '이거 매운가요?'],
    ['辛くしないでください。', '카라쿠 시나이데 쿠다사이.', '맵지 않게 해주세요.'],
  ] },
  { id: 'transport' as const, title: '교통', description: '전철 · 버스 · 승강장 · 환승 · ICOCA', icon: <Navigation/>, items: [
    ['この電車は京都駅に行きますか？', '코노 덴샤와 교토에키니 이키마스카?', '이 전철은 교토역에 가나요?'],
    ['河原町五条で降りたいです。', '카와라마치 고조데 오리타이 데스.', '가와라마치고조에서 내리고 싶어요.'],
    ['ICOCAは使えますか？', '이코카와 츠카에마스카?', 'ICOCA를 사용할 수 있나요?'],
    ['この乗り場で合っていますか？', '코노 노리바데 앗테이마스카?', '이 승강장이 맞나요?'],
    ['何番ホームですか？', '난반 호-무 데스카?', '몇 번 승강장이에요?'],
    ['乗り換えはどこですか？', '노리카에와 도코데스카?', '환승은 어디에서 하나요?'],
    ['このバスは河原町五条に行きますか？', '코노 바스와 카와라마치 고조니 이키마스카?', '이 버스는 가와라마치고조에 가나요?'],
  ] },
  { id: 'hotel' as const, title: '호텔', description: '짐 보관 · 체크인 · 대욕장 · Wi-Fi', icon: <Hotel/>, items: [
    ['荷物を預けてもいいですか？', '니모츠오 아즈케테모 이이데스카?', '짐을 맡겨도 될까요?'],
    ['チェックインをお願いします。', '첵쿠인오 오네가이시마스.', '체크인 부탁드립니다.'],
    ['大浴場はどこですか？', '다이요쿠조와 도코데스카?', '대욕장은 어디인가요?'],
    ['タオルはどこですか？', '타오루와 도코데스카?', '수건은 어디에 있나요?'],
    ['チェックアウト後も荷物を預けられますか？', '첵쿠아우토 고모 니모츠오 아즈케라레마스카?', '체크아웃 후에도 짐을 맡길 수 있나요?'],
    ['Wi-Fiのパスワードは何ですか？', '와이파이노 파스와-도와 난데스카?', 'Wi-Fi 비밀번호가 뭐예요?'],
  ] },
  { id: 'shopping' as const, title: '쇼핑 · 결제', description: '카드 · IC 결제 · 수량 · 봉투 · 면세', icon: <ShoppingBag/>, items: [
    ['クレジットカードは使えますか？', '쿠레짓토 카-도와 츠카에마스카?', '신용카드 사용할 수 있나요?'],
    ['交通系ICカードは使えますか？', '코-츠-케이 아이시 카-도와 츠카에마스카?', '교통계 IC카드로 결제할 수 있나요?'],
    ['これを二つください。', '코레오 후타츠 쿠다사이.', '이거 두 개 주세요.'],
    ['袋を一枚ください。', '후쿠로오 이치마이 쿠다사이.', '봉투 한 장 주세요.'],
    ['免税できますか？', '멘제이 데키마스카?', '면세 가능한가요?'],
  ] },
  { id: 'help' as const, title: '도움 · 길찾기', description: '다시 말하기 · 화장실 · 약국 · 몸 상태', icon: <MessageCircle/>, items: [
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

type PhraseTuple = [string, string, string];

const tripPhraseAdditions: Partial<Record<Exclude<TripPhraseCategoryId, 'all'>, PhraseTuple[]>> = {
  restaurant: [
    ['メニューを見せてください。', '메뉴-오 미세테 쿠다사이.', '메뉴를 보여주세요.'],
    ['注文をお願いします。', '추-몬오 오네가이시마스.', '주문할게요.'],
    ['これは何ですか？', '코레와 난데스카?', '이건 무엇인가요?'],
    ['一番人気はどれですか？', '이치반 닌키와 도레데스카?', '가장 인기 있는 메뉴가 뭐예요?'],
    ['ご飯を少なめにできますか？', '고항오 스쿠나메니 데키마스카?', '밥 양을 적게 할 수 있나요?'],
    ['取り皿を二枚ください。', '토리자라오 니마이 쿠다사이.', '앞접시 두 개 주세요.'],
    ['お会計をお願いします。', '오카이케이오 오네가이시마스.', '계산 부탁합니다.'],
    ['現金だけですか？', '겐킨 다케데스카?', '현금만 가능한가요?'],
    ['ラストオーダーは何時ですか？', '라스토 오-다-와 난지데스카?', '라스트 오더가 몇 시인가요?'],
    ['何分くらい待ちますか？', '난푼 쿠라이 마치마스카?', '몇 분 정도 기다려야 하나요?'],
  ],
  diet: [
    ['エビやカニは入っていますか？', '에비야 카니와 하잇테이마스카?', '새우나 게가 들어 있나요?'],
    ['タコやイカは入っていますか？', '타코야 이카와 하잇테이마스카?', '문어나 오징어가 들어 있나요?'],
    ['魚だけなら大丈夫です。', '사카나 다케나라 다이조-부 데스.', '생선만이라면 괜찮아요.'],
    ['唐辛子は入っていますか？', '토-가라시와 하잇테이마스카?', '고추가 들어 있나요?'],
    ['わさび抜きでお願いします。', '와사비 누키데 오네가이시마스.', '와사비 빼주세요.'],
    ['ソースは別にしてください。', '소-스와 베츠니 시테 쿠다사이.', '소스는 따로 주세요.'],
    ['アレルギーではありませんが、食べられません。', '아레루기-데와 아리마센가, 타베라레마센.', '알레르기는 아니지만 먹지 못합니다.'],
    ['この料理には何が入っていますか？', '코노 료-리니와 나니가 하잇테이마스카?', '이 요리에는 무엇이 들어 있나요?'],
  ],
  transport: [
    ['京都駅までいくらですか？', '교토에키마데 이쿠라데스카?', '교토역까지 얼마인가요?'],
    ['ここで乗り換えですか？', '코코데 노리카에 데스카?', '여기서 환승하나요?'],
    ['次の駅は何ですか？', '츠기노 에키와 난데스카?', '다음 역은 어디인가요?'],
    ['この電車は快速ですか？', '코노 덴샤와 카이소쿠 데스카?', '이 전철은 쾌속인가요?'],
    ['普通電車はどれですか？', '후츠- 덴샤와 도레데스카?', '보통열차는 어느 것인가요?'],
    ['ICOCAにチャージできますか？', '이코카니 차-지 데키마스카?', 'ICOCA를 충전할 수 있나요?'],
    ['バスは前から乗りますか？', '바스와 마에카라 노리마스카?', '버스는 앞문으로 타나요?'],
    ['降りる時に払いますか？', '오리루 토키니 하라이마스카?', '내릴 때 요금을 내나요?'],
    ['この切符で大丈夫ですか？', '코노 킷푸데 다이조-부 데스카?', '이 표로 괜찮나요?'],
    ['終電は何時ですか？', '슈-덴와 난지데스카?', '막차가 몇 시인가요?'],
  ],
  hotel: [
    ['予約名は〇〇です。', '요야쿠메이와 ○○ 데스.', '예약자 이름은 ○○입니다.'],
    ['パスポートはこちらです。', '파스포-토와 코치라 데스.', '여권 여기 있습니다.'],
    ['部屋は何階ですか？', '헤야와 난가이 데스카?', '방은 몇 층인가요?'],
    ['朝食は何時からですか？', '초-쇼쿠와 난지카라 데스카?', '아침 식사는 몇 시부터인가요?'],
    ['チェックアウトは何時ですか？', '첵쿠아우토와 난지데스카?', '체크아웃은 몇 시인가요?'],
    ['タオルをもう一枚お願いします。', '타오루오 모- 이치마이 오네가이시마스.', '수건 한 장 더 부탁합니다.'],
    ['エアコンの使い方を教えてください。', '에아콘노 츠카이카타오 오시에테 쿠다사이.', '에어컨 사용법을 알려주세요.'],
    ['充電器を借りられますか？', '주-덴키오 카리라레마스카?', '충전기를 빌릴 수 있나요?'],
    ['大浴場は何時までですか？', '다이요쿠조-와 난지마데 데스카?', '대욕장은 몇 시까지인가요?'],
  ],
  shopping: [
    ['これを見せてください。', '코레오 미세테 쿠다사이.', '이것 좀 보여주세요.'],
    ['試着できますか？', '시챠쿠 데키마스카?', '입어봐도 되나요?'],
    ['もう少し小さいサイズはありますか？', '모- 스코시 치이사이 사이즈와 아리마스카?', '조금 더 작은 사이즈가 있나요?'],
    ['もう少し大きいサイズはありますか？', '모- 스코시 오-키이 사이즈와 아리마스카?', '조금 더 큰 사이즈가 있나요?'],
    ['これの黒はありますか？', '코레노 쿠로와 아리마스카?', '이 제품 검은색 있나요?'],
    ['レシートをください。', '레시-토오 쿠다사이.', '영수증 주세요.'],
    ['このカードで払います。', '코노 카-도데 하라이마스.', '이 카드로 결제할게요.'],
    ['現金で払います。', '겐킨데 하라이마스.', '현금으로 낼게요.'],
    ['返品できますか？', '헨핀 데키마스카?', '반품할 수 있나요?'],
    ['これは免税対象ですか？', '코레와 멘제이 타이쇼- 데스카?', '이건 면세 대상인가요?'],
  ],
  help: [
    ['地図で見せてください。', '치즈데 미세테 쿠다사이.', '지도에서 보여주세요.'],
    ['ここから歩いて何分ですか？', '코코카라 아루이테 난푼 데스카?', '여기서 걸어서 몇 분인가요?'],
    ['右ですか、左ですか？', '미기데스카, 히다리데스카?', '오른쪽인가요, 왼쪽인가요?'],
    ['近くにコンビニはありますか？', '치카쿠니 콘비니와 아리마스카?', '근처에 편의점이 있나요?'],
    ['写真を撮っていただけますか？', '샤신오 톳테 이타다케마스카?', '사진을 찍어주실 수 있나요?'],
  ],
};

const extraTripPhraseGroups = [
  { id: 'airport' as const, title: '공항 · 입국', description: '입국심사 · 수하물 · HARUKA · 탑승구', icon: <Plane/>, items: [
    ['国際線の出発口はどこですか？', '코쿠사이센노 슛파츠구치와 도코데스카?', '국제선 출발장은 어디인가요?'],
    ['入国審査はどこですか？', '뉴-코쿠 신사와 도코데스카?', '입국심사는 어디인가요?'],
    ['税関はどこですか？', '제이칸와 도코데스카?', '세관은 어디인가요?'],
    ['荷物受取はどこですか？', '니모츠 우케토리와 도코데스카?', '수하물 찾는 곳은 어디인가요?'],
    ['この列で合っていますか？', '코노 레츠데 앗테이마스카?', '이 줄이 맞나요?'],
    ['関西空港駅はどこですか？', '칸사이 쿠-코-에키와 도코데스카?', '간사이공항역은 어디인가요?'],
    ['HARUKAの切符売り場はどこですか？', '하루카노 킷푸 우리바와 도코데스카?', 'HARUKA 표 파는 곳은 어디인가요?'],
    ['京都行きのHARUKAはどこから乗りますか？', '교토유키노 하루카와 도코카라 노리마스카?', '교토행 HARUKA는 어디서 타나요?'],
    ['予約した切符を受け取りたいです。', '요야쿠시타 킷푸오 우케토리타이 데스.', '예약한 표를 수령하고 싶어요.'],
    ['このQRコードを使えますか？', '코노 큐-아-루 코-도오 츠카에마스카?', '이 QR 코드를 사용할 수 있나요?'],
    ['搭乗口は何番ですか？', '토-죠-구치와 난반 데스카?', '탑승구는 몇 번인가요?'],
    ['何時までに搭乗口に行けばいいですか？', '난지마데니 토-죠-구치니 이케바 이이데스카?', '몇 시까지 탑승구에 가면 되나요?'],
    ['預け荷物はありません。', '아즈케 니모츠와 아리마센.', '위탁수하물은 없습니다.'],
  ] as PhraseTuple[] },
  { id: 'convenience' as const, title: '편의점', description: '데우기 · 수저 · ATM · IC 충전', icon: <ShoppingBag/>, items: [
    ['おにぎりはどこですか？', '오니기리와 도코데스카?', '주먹밥은 어디에 있나요?'],
    ['電子レンジで温めてください。', '덴시렌지데 아타타메테 쿠다사이.', '전자레인지에 데워주세요.'],
    ['温めなくて大丈夫です。', '아타타메나쿠테 다이조-부 데스.', '데우지 않아도 괜찮아요.'],
    ['箸を二膳ください。', '하시오 니젠 쿠다사이.', '젓가락 두 벌 주세요.'],
    ['スプーンをください。', '스푸-응오 쿠다사이.', '숟가락 주세요.'],
    ['袋はいりません。', '후쿠로와 이리마센.', '봉투는 필요 없어요.'],
    ['水はどこですか？', '미즈와 도코데스카?', '물은 어디에 있나요?'],
    ['ATMはありますか？', '에이티에무와 아리마스카?', 'ATM이 있나요?'],
    ['交通系ICカードにチャージできますか？', '코-츠-케이 아이시 카-도니 차-지 데키마스카?', '교통계 IC카드를 충전할 수 있나요?'],
    ['ゴミ箱はどこですか？', '고미바코와 도코데스카?', '쓰레기통은 어디인가요?'],
  ] as PhraseTuple[] },
  { id: 'sightseeing' as const, title: '관광 · 사찰', description: '입장권 · 촬영 · 관람시간 · 코인락커', icon: <MapPin/>, items: [
    ['チケットを二枚ください。', '치켓토오 니마이 쿠다사이.', '표 두 장 주세요.'],
    ['当日券はありますか？', '토-지츠켄와 아리마스카?', '당일권이 있나요?'],
    ['入場は何時までですか？', '뉴-죠-와 난지마데 데스카?', '입장은 몇 시까지인가요?'],
    ['写真を撮ってもいいですか？', '샤신오 톳테모 이이데스카?', '사진을 찍어도 되나요?'],
    ['ここは撮影禁止ですか？', '코코와 사츠에이 킨시 데스카?', '여기는 촬영 금지인가요?'],
    ['御朱印はどこでいただけますか？', '고슈인와 도코데 이타다케마스카?', '고슈인은 어디서 받을 수 있나요?'],
    ['お守りはどこですか？', '오마모리와 도코데스카?', '부적은 어디에 있나요?'],
    ['この列は入場待ちですか？', '코노 레츠와 뉴-죠-마치 데스카?', '이 줄은 입장 대기줄인가요?'],
    ['所要時間はどのくらいですか？', '쇼요-지칸와 도노쿠라이 데스카?', '관람에 얼마나 걸리나요?'],
    ['再入場できますか？', '사이뉴-죠- 데키마스카?', '재입장할 수 있나요?'],
    ['出口はどこですか？', '데구치와 도코데스카?', '출구는 어디인가요?'],
    ['コインロッカーはありますか？', '코인 롯카-와 아리마스카?', '코인락커가 있나요?'],
  ] as PhraseTuple[] },
  { id: 'health' as const, title: '약국 · 몸상태', description: '두통 · 복통 · 물집 · 약 · 병원', icon: <Heart/>, items: [
    ['頭が痛いです。', '아타마가 이타이 데스.', '머리가 아파요.'],
    ['お腹が痛いです。', '오나카가 이타이 데스.', '배가 아파요.'],
    ['熱があります。', '네츠가 아리마스.', '열이 있어요.'],
    ['吐き気があります。', '하키케가 아리마스.', '메스꺼움이 있어요.'],
    ['足が痛いです。', '아시가 이타이 데스.', '발/다리가 아파요.'],
    ['靴ずれができました。', '쿠츠즈레가 데키마시타.', '신발 때문에 물집이 생겼어요.'],
    ['風邪薬はありますか？', '카제구스리와 아리마스카?', '감기약이 있나요?'],
    ['痛み止めはありますか？', '이타미도메와 아리마스카?', '진통제가 있나요?'],
    ['絆創膏はありますか？', '반소-코-와 아리마스카?', '반창고가 있나요?'],
    ['英語が話せる医師はいますか？', '에이고가 하나세루 이시와 이마스카?', '영어 가능한 의사가 있나요?'],
    ['病院に行きたいです。', '뵤-인니 이키타이 데스.', '병원에 가고 싶어요.'],
    ['この薬は一日何回ですか？', '코노 쿠스리와 이치니치 난카이 데스카?', '이 약은 하루에 몇 번 먹나요?'],
  ] as PhraseTuple[] },
  { id: 'emergency' as const, title: '분실 · 긴급', description: '경찰 · 구급차 · 여권 · 휴대폰 · 일행', icon: <AlertTriangle/>, items: [
    ['助けてください。', '타스케테 쿠다사이.', '도와주세요.'],
    ['警察を呼んでください。', '케이사츠오 욘데 쿠다사이.', '경찰을 불러주세요.'],
    ['救急車を呼んでください。', '큐-큐-샤오 욘데 쿠다사이.', '구급차를 불러주세요.'],
    ['財布をなくしました。', '사이후오 나쿠시마시타.', '지갑을 잃어버렸어요.'],
    ['パスポートをなくしました。', '파스포-토오 나쿠시마시타.', '여권을 잃어버렸어요.'],
    ['携帯電話をなくしました。', '케이타이 덴와오 나쿠시마시타.', '휴대폰을 잃어버렸어요.'],
    ['道に迷いました。', '미치니 마요이마시타.', '길을 잃었어요.'],
    ['友達とはぐれました。', '토모다치토 하구레마시타.', '일행과 떨어졌어요.'],
    ['盗まれました。', '누스마레마시타.', '도난당했어요.'],
    ['韓国大使館に連絡したいです。', '칸코쿠 타이시칸니 렌라쿠 시타이 데스.', '한국 대사관에 연락하고 싶어요.'],
    ['ここは安全ですか？', '코코와 안젠 데스카?', '여기는 안전한가요?'],
  ] as PhraseTuple[] },
];

const extendedTripPhraseGroups = [
  ...tripPhraseGroups.map((group) => ({ ...group, items: [...group.items, ...(tripPhraseAdditions[group.id] || [])] as PhraseTuple[] })),
  ...extraTripPhraseGroups,
];

function TripJapanesePanel() {
  const validIds = useMemo(() => new Set<TripPhraseCategoryId>(['all', ...extendedTripPhraseGroups.map((group) => group.id)]), []);
  const stored = localStorage.getItem('mytrip-phrase-category') as TripPhraseCategoryId | null;
  const [category, setCategory] = useState<TripPhraseCategoryId>(stored && validIds.has(stored) ? stored : 'all');
  const [displayPhrase, setDisplayPhrase] = useState<[string, string, string] | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');
  const categoryNavRef = useRef<HTMLElement | null>(null);
  const activeGroup = category === 'all' ? null : extendedTripPhraseGroups.find((group) => group.id === category) || null;
  const total = extendedTripPhraseGroups.reduce((sum, group) => sum + group.items.length, 0);
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = normalizedQuery ? extendedTripPhraseGroups.flatMap((group) => group.items
    .filter(([jp, sound, meaning]) => `${jp} ${sound} ${meaning} ${group.title}`.toLowerCase().includes(normalizedQuery))
    .map((item) => ({ group, item }))).slice(0, 40) : [];
  useEffect(() => {
    const active = categoryNavRef.current?.querySelector<HTMLElement>(`[data-phrase-category="${category}"]`);
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [category]);
  function selectCategory(next: TripPhraseCategoryId) {
    setCategory(next);
    setQuery('');
    localStorage.setItem('mytrip-phrase-category', next);
  }
  function copyPhrase(jp: string) {
    navigator.clipboard?.writeText(jp);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return <div className="trip-tool-page japanese-tool-page">
    <div className="trip-tool-intro"><div><p className="eyebrow">USEFUL JAPANESE</p><h2>일본어 표현</h2><p>상황을 고른 뒤 문장을 누르면 직원에게 보여주기 좋은 큰 화면으로 열립니다. 큰 화면에서 복사도 할 수 있습니다.</p></div><b>{total} phrases</b></div>
    <nav className="phrase-category-nav" aria-label="일본어 표현 상황 선택" ref={categoryNavRef}>
      <button data-phrase-category="all" className={category === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}><Sparkles size={14}/><span>전체</span><b>{extendedTripPhraseGroups.length}</b></button>
      {extendedTripPhraseGroups.map((group) => <button key={group.id} data-phrase-category={group.id} className={category === group.id ? 'active' : ''} onClick={() => selectCategory(group.id)}>{group.icon}<span>{group.title}</span><b>{group.items.length}</b></button>)}
    </nav>
    <label className="phrase-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 화장실, 와사비, HARUKA, 카드, 병원" aria-label="일본어 표현 검색"/>{query && <button onClick={() => setQuery('')} aria-label="검색 지우기"><X size={15}/></button>}</label>
    {normalizedQuery ? <section className="phrase-search-results" aria-label="일본어 표현 검색 결과">
      <div className="phrase-overview-head"><div><p className="eyebrow">SEARCH</p><h3>“{query.trim()}” 검색 결과</h3></div><span>{searchResults.length}개 표시</span></div>
      {searchResults.length ? <div className="phrase-detail-list">{searchResults.map(({ group, item: [jp, sound, meaning] }, index) => <button key={`${group.id}-${jp}`} className="phrase-detail-card" onClick={() => setDisplayPhrase([jp, sound, meaning])}><span className="phrase-number">{String(index + 1).padStart(2, '0')}</span><div><em className="phrase-source-tag">{group.title}</em><strong lang="ja">{jp}</strong><span>{sound}</span><small>{meaning}</small></div><Maximize2 size={16}/></button>)}</div> : <div className="phrase-empty-search">검색 결과가 없습니다. 한국어 뜻, 일본어, 발음, 상황 이름으로 검색할 수 있습니다.</div>}
    </section> : category === 'all' ? <section className="phrase-overview" aria-label="일본어 상황별 전체보기">
      <div className="phrase-overview-head"><div><p className="eyebrow">CHOOSE A SITUATION</p><h3>지금 필요한 상황을 선택</h3></div><span>{total}문장을 한 번에 펼치지 않습니다.</span></div>
      <div className="phrase-overview-grid">{extendedTripPhraseGroups.map((group) => {
        const preview = group.items[0];
        return <button key={group.id} className="phrase-overview-card" onClick={() => selectCategory(group.id)}><header><span>{group.icon}</span><div><strong>{group.title}</strong><small>{group.items.length}개 표현</small></div><ChevronRight size={18}/></header><p>{group.description}</p><div className="phrase-preview"><strong lang="ja">{preview[0]}</strong><span>{preview[2]}</span></div></button>;
      })}</div>
    </section> : activeGroup ? <section className="phrase-detail" aria-label={`${activeGroup.title} 일본어 표현`}>
      <header className="phrase-detail-head"><button onClick={() => selectCategory('all')}><ArrowLeft size={15}/>상황 전체</button><div><span>{activeGroup.icon}</span><div><p className="eyebrow">SITUATION</p><h3>{activeGroup.title}</h3><small>{activeGroup.description}</small></div></div><b>{activeGroup.items.length}개</b></header>
      {activeGroup.id === 'diet' && <button className="diet-show-card" onClick={() => setDisplayPhrase(['魚の寿司は食べられます。\nウニ、魚以外の海鮮、貝類、内臓は食べられません。\n辛くしないでください。', '사카나노 스시와 타베라레마스. 우니, 사카나 이가이노 카이센, 카이루이, 나이조와 타베라레마센. 카라쿠 시나이데 쿠다사이.', '생선 초밥은 먹을 수 있습니다. 우니·생선 외 해산물·조개류·내장은 먹을 수 없고, 맵지 않게 부탁드립니다.'])}><Maximize2 size={16}/><span><strong>음식 제한 한 장으로 보여주기</strong><small>직원에게 이 카드 하나만 보여줘도 됩니다.</small></span><ChevronRight size={17}/></button>}
      <div className="phrase-detail-list">{activeGroup.items.map(([jp, sound, meaning], index) => <button key={jp} className="phrase-detail-card" onClick={() => setDisplayPhrase([jp, sound, meaning])}><span className="phrase-number">{String(index + 1).padStart(2, '0')}</span><div><strong lang="ja">{jp}</strong><span>{sound}</span><small>{meaning}</small></div><Maximize2 size={16}/></button>)}</div>
    </section> : null}
    {displayPhrase && <div className="phrase-show-backdrop" onMouseDown={() => setDisplayPhrase(null)}><section className="phrase-show-card" onMouseDown={(event) => event.stopPropagation()}><header><span>SHOW TO STAFF</span><button onClick={() => setDisplayPhrase(null)} aria-label="닫기"><X size={22}/></button></header><div className="phrase-show-copy"><strong lang="ja">{displayPhrase[0]}</strong><span>{displayPhrase[1]}</span><p>{displayPhrase[2]}</p></div><button className="phrase-copy-large" onClick={() => copyPhrase(displayPhrase[0])}><Copy size={17}/>{copied ? '복사됨' : '일본어 복사'}</button></section></div>}
  </div>;
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
  const actionableTodayEvents = todayEvents.filter((event) => tripEventStatus(event) === 'PLANNED');
  const nowTime = timeInTimeZone('Asia/Tokyo');
  const current = actionableTodayEvents.find((event) => event.start_time && event.end_time && event.start_time <= nowTime && event.end_time >= nowTime);
  const next = current || actionableTodayEvents.find((event) => (event.start_time || '99:99') >= nowTime) || actionableTodayEvents[0];
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
        {days.map((date) => {
          const dayEvents = trip.events.filter((event) => event.date === date);
          const mealCount = trip.meal_slots.filter((slot) => slot.date === date && slot.selected_restaurant_id && !/optional|snack|dessert/i.test(slot.meal_type || '')).length;
          const roamCount = dayEvents.filter((event) => event.kind === 'activity' && !/입국|출국|보안|게이트|대욕장|호텔 휴식|ICN|KIX/i.test(event.title)).length;
          return <DayColumn key={date} date={date} index={days.indexOf(date)} active={date === selectedDay} events={dayEvents} weather={weather.find((w) => w.date === date)} mealCount={mealCount} roamCount={roamCount} reload={reload} allowCompletion={tripMode && tripIsActive} />;
        })}
      </div>
    </DndContext>
  </div>;
}

function DayColumn({ date, index, active, events, weather, mealCount, roamCount, reload, allowCompletion }: { date: string; index: number; active: boolean; events: TripEvent[]; weather?: WeatherDay; mealCount: number; roamCount: number; reload: () => void; allowCompletion: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  const walking = events.find((event) => typeof event.meta?.daily_walking === 'string')?.meta?.daily_walking;
  const orderedEvents = [...events].sort((a, b) => compareDayEvents(a, b, events));
  return <section className={`day-column ${active ? 'mobile-active' : ''} ${isOver ? 'drop-active' : ''}`} ref={setNodeRef} data-day-date={date}>
    <header><div><span>DAY {index + 1}</span><strong>{formatDay(date)}</strong><small className="day-rhythm-count"><Utensils size={11}/>{mealCount}끼 <MapPin size={11}/>{roamCount}곳</small>{typeof walking === 'string' && <small className="day-walking">보행 {walking}</small>}</div>{weather && <div className="day-weather"><span className="weather-symbol">{weatherIcon(weather.code)}</span><div><b>{Math.round(weather.max)}° / {Math.round(weather.min)}°</b><small>{weatherLabel(weather.code)} · 강수 {weather.rain}%</small></div></div>}</header>
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
  const status = tripEventStatus(event);
  async function setStatus(nextStatus: TripEventStatus) {
    await patch(`/api/events/${event.id}`, { event_status: status === nextStatus ? 'PLANNED' : nextStatus });
    reload();
  }
  return <article ref={setNodeRef} style={style} className={`event-card kind-${event.kind} status-${status.toLowerCase()} ${isDragging ? 'dragging' : ''}`}>
    <button className="drag-handle" {...listeners} {...attributes}><GripVertical size={16} /></button>
    <div className="event-icon">{icon}</div>
    <div className="event-body"><EventVisual event={event} mapUrl={mapUrl}/><div className="event-title-row"><strong>{event.title}</strong><button className="mini-delete" onClick={remove} aria-label="삭제"><Trash2 size={13} /></button></div>
      <div className="event-time"><input className="event-time-24" type="text" inputMode="numeric" maxLength={5} value={timeDraft} placeholder="--:--" onChange={(e) => setTimeDraft(e.target.value)} onBlur={(e) => changeTime(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} aria-label={`${event.title} 시작 시간 24시간제`} />{event.end_time && <span>→ {event.end_time}</span>}{event.source === 'booking' && <span className="booking-lock">확정 예약</span>}</div>
      {allowCompletion && <div className="event-status-actions"><button className={status === 'DONE' ? 'done' : ''} onClick={() => setStatus('DONE')}><Check size={13}/>{status === 'DONE' ? '완료 취소' : '완료'}</button><button className={status === 'SKIPPED' ? 'skip-active' : ''} onClick={() => setStatus('SKIPPED')}><FastForward size={13}/>{status === 'SKIPPED' ? '건너뜀 취소' : '건너뜀'}</button><button className={status === 'CANCELLED' ? 'cancel-active' : ''} onClick={() => setStatus('CANCELLED')}><X size={13}/>{status === 'CANCELLED' ? '취소 해제' : '취소'}</button></div>}
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

function TripFieldMapPanel({ trip, online }: { trip: Trip; online: boolean }) {
  const today = todayInTimeZone('Asia/Tokyo');
  const active = today >= trip.start_date && today <= trip.end_date;
  const focusDate = active ? today : trip.start_date;
  const now = active ? timeInTimeZone('Asia/Tokyo') : '00:00';
  const events = trip.events.filter((event) => event.date === focusDate).sort((a, b) => compareDayEvents(a, b, trip.events));
  const actionableEvents = events.filter((event) => tripEventStatus(event) === 'PLANNED');
  const [view, setView] = useState<'route'|'food'|'hotel'>('route');
  const mealEvents = events.filter((event) => event.kind === 'reservation');
  const hotelEvents = events.filter((event) => event.kind === 'hotel');
  const uniqueHotelEvents = [...new globalThis.Map(hotelEvents.map((event) => {
    const key = event.lat && event.lng ? `${Number(event.lat).toFixed(4)},${Number(event.lng).toFixed(4)}` : normalizeCandidateText(event.location || event.address || event.title);
    return [key, event] as const;
  })).values()];
  const visibleEvents = view === 'food' ? mealEvents : view === 'hotel' ? uniqueHotelEvents : events;
  const relatedPlaces = trip.places.filter((place) => events.some((event) => candidatePlaceMatchesEvent(place, event)));
  const mapTrip = { ...trip, events, places: relatedPlaces };
  const current = actionableEvents.find((event) => event.start_time && event.end_time && event.start_time <= now && event.end_time >= now);
  const next = current || actionableEvents.find((event) => (event.start_time || '99:99') >= now) || actionableEvents[0];
  const counts = {
    route: events.length,
    food: mealEvents.length,
    hotel: uniqueHotelEvents.length,
  };
  const mappedStops = events.filter((event) => event.lat && event.lng).length;
  const label = view === 'route' ? '오늘 전체 동선' : view === 'food' ? '오늘 식사' : '오늘 숙소';
  return <div className="trip-field-map-page">
    <section className="trip-map-toolbar">
      <div><p className="eyebrow">FIELD MAP · {formatDay(focusDate)}</p><h2>오늘 지도</h2><p>여행 중에는 후보 리서치 대신 오늘 일정과 바로 이동할 장소만 봅니다.</p></div>
      <div className="trip-map-tabs" role="tablist" aria-label="오늘 지도 보기">
        <button className={view === 'route' ? 'active' : ''} onClick={() => setView('route')}><Route size={14}/>동선 <span>{counts.route} · 지도 {mappedStops}</span></button>
        <button className={view === 'food' ? 'active' : ''} onClick={() => setView('food')}><Utensils size={14}/>식사 <span>{counts.food}</span></button>
        <button className={view === 'hotel' ? 'active' : ''} onClick={() => setView('hotel')}><BedDouble size={14}/>숙소 <span>{counts.hotel}</span></button>
      </div>
    </section>
    <div className="trip-map-layout">
      <div className="trip-map-stage">
        {online ? <TripMap trip={mapTrip} numbered /> : <OfflineRouteMap events={visibleEvents} />}
        {next && <div className="trip-map-focus-card"><span>{current ? 'NOW' : 'NEXT'} · {next.start_time || '시간 미정'}</span><strong>{next.title}</strong>{next.location && <small>{next.location}</small>}{googleMapsEventUrl(next) && <a href={googleMapsEventUrl(next)!} target="_blank" rel="noreferrer"><Navigation size={13}/>Google Maps로 이동</a>}</div>}
      </div>
      <aside className="trip-map-stop-panel">
        <header><div><span>{label}</span><strong>{visibleEvents.length}개</strong></div><small>목록은 이 패널 안에서만 스크롤됩니다.</small></header>
        <div className="trip-map-stop-list">{visibleEvents.map((event) => {
          const mapUrl = googleMapsEventUrl(event);
          const status = tripEventStatus(event);
          return <article className={`status-${status.toLowerCase()}`} key={event.id}><div><b>{event.start_time || '--:--'}</b><span>{status === 'DONE' ? 'DONE' : status === 'SKIPPED' ? 'SKIP' : status === 'CANCELLED' ? 'CANCEL' : event.kind === 'reservation' ? 'MEAL' : event.kind.toUpperCase()}</span></div><div><strong>{event.title}</strong>{event.location && <small>{event.location}</small>}</div>{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" aria-label={`${event.title} 지도 열기`}><ChevronRight size={17}/></a>}</article>;
        })}</div>
      </aside>
    </div>
  </div>;
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

function OfflineRouteMap({ events }: { events: TripEvent[] }) {
  const points = events.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng)).map((event, index) => ({
    event,
    index: index + 1,
    lat: Number(event.lat),
    lng: Number(event.lng),
  }));
  if (!points.length) return <div className="offline-route-map empty"><WifiOff size={22}/><strong>오프라인 좌표 없음</strong><span>일정 목록과 주소는 저장되어 있습니다.</span></div>;
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const latSpan = Math.max(.01, maxLat - minLat);
  const lngSpan = Math.max(.01, maxLng - minLng);
  const projected = points.map((point) => ({ ...point, x: 10 + ((point.lng - minLng) / lngSpan) * 80, y: 90 - ((point.lat - minLat) / latSpan) * 80 }));
  const polyline = projected.map((point) => `${point.x},${point.y}`).join(' ');
  return <div className="offline-route-map">
    <div className="offline-map-badge"><WifiOff size={13}/><span>OFFLINE ROUTE</span></div>
    <svg viewBox="0 0 100 100" role="img" aria-label="저장된 일정 좌표를 이용한 오프라인 동선 지도">
      {projected.length > 1 && <polyline points={polyline} fill="none" vectorEffect="non-scaling-stroke"/>}
      {projected.map((point) => <g key={point.event.id} transform={`translate(${point.x} ${point.y})`}><circle r="4.7"/><text textAnchor="middle" dominantBaseline="central">{point.index}</text></g>)}
    </svg>
    <div className="offline-map-note"><strong>{points.length}개 저장 좌표</strong><span>배경지도 없이 순서와 상대 위치만 표시합니다. 실제 길찾기는 연결 후 Google Maps를 사용하세요.</span></div>
  </div>;
}

function TripMap({ trip, numbered = false }: { trip: Trip; numbered?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const mapLibRef = useRef<typeof import('maplibre-gl') | null>(null);
  const markers = useRef<import('maplibre-gl').Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    if (!ref.current || mapRef.current) return;
    import('maplibre-gl').then((lib) => {
      if (disposed || !ref.current) return;
      mapLibRef.current = lib;
      const maplibregl = lib.default;
      const map = new maplibregl.Map({
        container: ref.current,
        style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] },
        center: [135.7681, 35.0116], zoom: 11,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      map.once('load', () => !disposed && setMapReady(true));
    }).catch(() => undefined);
    return () => { disposed = true; setMapReady(false); mapRef.current?.remove(); mapRef.current = null; mapLibRef.current = null; };
  }, []);
  useEffect(() => {
    const lib = mapLibRef.current;
    const map = mapRef.current;
    if (!map || !lib || !mapReady) return;
    markers.current.forEach((m) => m.remove()); markers.current = [];
    const points = [...trip.places.map((p) => ({ ...p, type: 'place' })), ...trip.events.filter((e) => e.lat && e.lng).map((e, index) => ({ ...e, name: e.title, category: e.kind, type: 'event', mapOrder: index + 1 }))].filter((p) => p.lat && p.lng) as any[];
    const bounds = new lib.LngLatBounds();
    points.forEach((p) => {
      const el = document.createElement('div'); el.className = `map-marker ${p.type} ${numbered && p.type === 'event' ? 'numbered' : ''}`; el.innerHTML = p.type === 'event' ? (numbered ? String(p.mapOrder) : '•') : '♥';
      const marker = new lib.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(new lib.Popup({ offset: 18 }).setHTML(`<strong>${escapeHtml(p.name)}</strong><br/><span>${escapeHtml(p.category || '')}</span>`)).addTo(map);
      markers.current.push(marker); bounds.extend([p.lng, p.lat]);
    });
    if (numbered) {
      const coords = trip.events.filter((event) => event.lat && event.lng && tripEventStatus(event) !== 'CANCELLED').map((event) => [Number(event.lng), Number(event.lat)]);
      if (coords.length > 1) {
        const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } };
        const source = map.getSource('trip-route') as import('maplibre-gl').GeoJSONSource | undefined;
        if (source) source.setData(data);
        else {
          map.addSource('trip-route', { type: 'geojson', data });
          map.addLayer({ id: 'trip-route-line', type: 'line', source: 'trip-route', paint: { 'line-color': '#466a55', 'line-width': 3, 'line-opacity': .68 } });
        }
      }
    }
    if (points.length) map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 700 });
  }, [trip.places, trip.events, numbered, mapReady]);
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
  actions?: AssistantAction[];
};
type AssistantAction =
  | { type: 'event_status'; event_id: string; status: TripEventStatus; label: string }
  | { type: 'select_meal'; slot_id: string; restaurant_id: string; label: string }
  | { type: 'select_decision'; slot_id: string; option_id: string; label: string };

function FloatingTripAssistant({ trip, weather, plannerName, mode, reload }: { trip: Trip; weather: WeatherDay[]; plannerName: string; mode: WorkspaceMode; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([{ role: 'assistant', content: 'Kyoto · Osaka 전체 일정, 식당 후보, 투표, 이동, 준비물 상태를 같이 보고 있어요. 무엇을 조정할까요?' }]);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
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
        actions: validAssistantActions(result.actions, trip, mode),
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
  async function applyAssistantAction(action: AssistantAction) {
    const key = assistantActionKey(action);
    if (appliedActions.has(key)) return;
    if (action.type === 'event_status') await patch(`/api/events/${action.event_id}`, { event_status: action.status });
    if (action.type === 'select_meal') await patch(`/api/meal-slots/${action.slot_id}/select`, { restaurant_id: action.restaurant_id });
    if (action.type === 'select_decision') await patch(`/api/decision-slots/${action.slot_id}/select`, { option_id: action.option_id });
    setAppliedActions((current) => new Set(current).add(key));
    reload();
  }
  const quickPrompts = mode === 'trip'
    ? ['지금 다음 일정 알려줘', '비 오면 바로 뭘 바꿔?', '지금 식당 Plan B 뭐야?', '호텔까지 가장 편하게 가는 법']
    : ['첫날 도착 후 선택지 정리해줘', '비 오면 일정 어떻게 바꿔?', '아직 안 한 준비 뭐야?', '오늘 식당 후보 비교해줘'];
  return <>
    <button className={`assistant-fab ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-label="MyTrip Assistant 열기"><Sparkles size={18}/><span>AI Assistant</span></button>
    {open && <aside className={`assistant-panel mode-${mode}`} aria-label="MyTrip Assistant"><header><div><span className="assistant-orbit"><Sparkles size={17}/></span><div><strong>MyTrip Assistant</strong><small>{mode === 'trip' ? 'TRIP · 오늘 상황 우선' : 'PLAN · 전체 계획 우선'}</small></div></div><button onClick={() => setOpen(false)} aria-label="Assistant 닫기"><X size={20}/></button></header><div className="assistant-context-strip"><span>{mode.toUpperCase()}</span><span>KYOTO</span><span>OSAKA</span><b>{trip.events.length} 일정</b><b>{trip.places.length} 후보</b><b>{trip.checklist.filter((item) => item.status !== 'DONE').length} 준비 남음</b></div><div className="assistant-quick">{quickPrompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div><div className="assistant-messages" ref={messagesRef}>{messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'AI' : plannerName || '나'}</span><AssistantMessageBody content={message.content} />{message.sections?.length ? <div className="assistant-sections">{message.sections.map((section, sectionIndex) => <section key={`${section.title}-${sectionIndex}`}><h4>{section.title}</h4><ol>{section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ol></section>)}</div> : null}{message.actions?.length ? <div className="assistant-actions">{message.actions.map((action) => { const key = assistantActionKey(action); const applied = appliedActions.has(key); return <article key={key}><div><Sparkles size={14}/><span><strong>{action.label}</strong><small>{assistantActionDescription(action, trip)}</small></span></div><button disabled={applied} onClick={() => applyAssistantAction(action)}>{applied ? <><Check size={13}/>적용됨</> : '이 변경 적용'}</button></article>; })}</div> : null}{message.ideas?.length ? <div className="assistant-ideas">{message.ideas.map((idea) => <article key={`${idea.name}-${idea.bestTime || ''}`}><div><strong>{idea.name}</strong>{idea.area && <small>{idea.area}</small>}</div>{idea.reason && <p>{idea.reason}</p>}<footer>{idea.bestTime && <span>{idea.bestTime}</span>}<button disabled={savedNames.has(idea.name)} onClick={() => saveIdea(idea)}><Heart size={13}/>{savedNames.has(idea.name) ? '후보에 있음' : '후보 저장'}</button></footer></article>)}</div> : null}</div>)}{loading && <div className="assistant-message assistant loading"><span>AI</span><div className="assistant-message-copy">현재 일정과 후보를 같이 확인하는 중…</div></div>}</div><div className="assistant-composer"><textarea rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') ask(); }} placeholder={mode === 'trip' ? '예: 지금 비 오는데 다음 일정 어떻게 바꿀까?' : '예: 9/14 비 오면 Kiyomizu를 줄이고 어디로 가?'} /><button onClick={() => ask()} disabled={loading || !input.trim()}><Send size={18}/></button><small>⌘/Ctrl + Enter · 제안된 일정 변경은 버튼을 눌러야 적용됩니다.</small></div></aside>}
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
function weatherAnchorForDate(trip:Trip,date:string){const mapped=trip.events.filter((event)=>event.date===date&&event.lat&&event.lng);const hotel=[...mapped].reverse().find((event)=>event.kind==='hotel'&&!/check-out/i.test(event.title))||mapped.find((event)=>event.kind==='hotel');const meal=mapped.find((event)=>event.kind==='reservation');const anchor=hotel||meal||mapped[Math.floor(mapped.length/2)]||trip.places.find((place)=>place.lat&&place.lng);return{lat:Number(anchor?.lat||35.0116),lng:Number(anchor?.lng||135.7681)};}
function checklistUrgencyScore(item:{title:string;category:string;notes?:string|null}){const text=`${item.category} ${item.title} ${item.notes||''}`;if(/Visit Japan|입국|여권|항공|보험|HARUKA|예약|eSIM|통신|오프라인|캡처/i.test(text))return 90;if(/준비물|우산|보조배터리|충전|워킹화|날씨/i.test(text))return 70;return 50;}
function assistantActionKey(action:AssistantAction){return action.type==='event_status'?`${action.type}:${action.event_id}:${action.status}`:action.type==='select_meal'?`${action.type}:${action.slot_id}:${action.restaurant_id}`:`${action.type}:${action.slot_id}:${action.option_id}`;}
function validAssistantActions(raw:unknown,trip:Trip,mode:WorkspaceMode):AssistantAction[]{if(!Array.isArray(raw))return[];const actions:AssistantAction[]=[];for(const item of raw.slice(0,3)){if(!item||typeof item!=='object')continue;const action=item as any;const label=typeof action.label==='string'&&action.label.trim()?action.label.trim().slice(0,80):'제안된 변경';if(action.type==='event_status'&&typeof action.event_id==='string'&&['PLANNED','DONE','SKIPPED','CANCELLED'].includes(action.status)){const event=trip.events.find((row)=>row.id===action.event_id);if(!event||tripEventStatus(event)===action.status)continue;if(mode!=='trip'&&(action.status==='DONE'||action.status==='SKIPPED'))continue;actions.push({type:'event_status',event_id:action.event_id,status:action.status,label});continue;}if(action.type==='select_meal'&&typeof action.slot_id==='string'&&typeof action.restaurant_id==='string'){const slot=trip.meal_slots.find((row)=>row.id===action.slot_id);if(slot?.option_ids.includes(action.restaurant_id)&&slot.selected_restaurant_id!==action.restaurant_id)actions.push({type:'select_meal',slot_id:action.slot_id,restaurant_id:action.restaurant_id,label});continue;}if(action.type==='select_decision'&&typeof action.slot_id==='string'&&typeof action.option_id==='string'){const slot=trip.decision_slots.find((row)=>row.id===action.slot_id);if(slot?.options.some((option)=>option.id===action.option_id)&&slot.selected_option_id!==action.option_id)actions.push({type:'select_decision',slot_id:action.slot_id,option_id:action.option_id,label});}}return actions;}
function assistantActionDescription(action:AssistantAction,trip:Trip){if(action.type==='event_status'){const event=trip.events.find((row)=>row.id===action.event_id);const status=action.status==='DONE'?'완료':action.status==='SKIPPED'?'건너뜀':action.status==='CANCELLED'?'취소':'예정';return `${event?.title||'일정'} → ${status}`;}if(action.type==='select_meal'){const slot=trip.meal_slots.find((row)=>row.id===action.slot_id);const restaurant=trip.restaurants.find((row)=>row.id===action.restaurant_id);return `${slot?.label||'식사'} → ${restaurant?.name||'식당'}`;}const slot=trip.decision_slots.find((row)=>row.id===action.slot_id);const option=slot?.options.find((row)=>row.id===action.option_id);return `${slot?.title||'Plan B'} → ${option?.label||'대안'}`;}
function formatDay(date:string){return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(plainDateUtc(date)));}
function formatMonthDay(date:string){const [,month,day]=date.split('-').map(Number);return `${month}/${day}`;}
function formatDateRange(start:string,end:string){const [year,month,day]=start.split('-').map(Number),[,endMonth,endDay]=end.split('-').map(Number);return `${year}. ${month}. ${day} — ${endMonth}. ${endDay}`;}
function formatBytes(value:number){if(value<1024)return`${value} B`;if(value<1024*1024)return`${(value/1024).toFixed(1)} KB`;return`${(value/1024/1024).toFixed(1)} MB`;}
function todayInTimeZone(timeZone:string){const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone}).formatToParts(new Date());const get=(type:string)=>parts.find((part)=>part.type===type)?.value;return `${get('year')}-${get('month')}-${get('day')}`;}
function timeInTimeZone(timeZone:string){return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone}).format(new Date());}
function compareDayEvents(a:TripEvent,b:TripEvent,events:TripEvent[]){const aKey=dayEventSortKey(a,events),bKey=dayEventSortKey(b,events);return aKey.localeCompare(bKey)||Number(a.sort_order||0)-Number(b.sort_order||0);}
function dayEventSortKey(event:TripEvent,events:TripEvent[]){if(event.start_time)return `${event.start_time}|1`;const title=event.title.toLowerCase();if(event.kind==='hotel'&&title.includes('check-in')){const related=events.find((item)=>item.id!==event.id&&item.kind==='hotel'&&item.start_time&&((item.location&&event.location&&item.location===event.location)||(item.address&&event.address&&item.address===event.address)));if(related?.start_time)return `${related.start_time}|2`;}if(event.kind==='hotel'&&title.includes('check-out')){const hotelName=event.location||'';const nextTransport=[...events].filter((item)=>item.start_time&&(item.kind==='train'||item.kind==='transfer'||typeof item.meta?.transport==='string')&&(!hotelName||item.location?.split(/\s*→\s*/)[0]?.trim()===hotelName)).sort((a,b)=>(a.start_time||'99:99').localeCompare(b.start_time||'99:99'))[0];if(nextTransport?.start_time)return `${subtractMinute(nextTransport.start_time)}|0`;}return '99:99|9';}
function subtractMinute(value:string){const [h,m]=value.split(':').map(Number);const total=Math.max(0,h*60+m-1);return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;}
function eventDestination(event:TripEvent){if(event.address)return event.address;const parts=(event.location||'').split(/\s*→\s*/).map((part)=>part.trim()).filter(Boolean);if(parts.length>1)return parts[parts.length-1];return event.location||(event.lat&&event.lng?`${event.lat},${event.lng}`:'');}
function eventOrigin(event:TripEvent){const parts=(event.location||'').split(/\s*→\s*/).map((part)=>part.trim()).filter(Boolean);return parts.length>1?parts[0]:(event.location||event.title);}
function tripMinutes(value?:string|null){if(!value||!/^[0-2]\d:[0-5]\d$/.test(value))return null;const [hour,minute]=value.split(':').map(Number);return hour*60+minute;}
function isJourneyStep(event:TripEvent){return event.kind==='train'||event.kind==='transfer'||/입국|출국|보안|gate|station|공항|역 이동|haruka|arex|지하철|버스/i.test(`${event.title} ${event.location||''}`);}
function groupTripLiveEvents(events:TripEvent[]):TripLiveGroup[]{const groups:TripLiveGroup[]=[];for(const event of events){const previous=groups.at(-1);const previousEvent=previous?.events.at(-1);const prevEnd=tripMinutes(previousEvent?.end_time||previousEvent?.start_time);const nextStart=tripMinutes(event.start_time);const closeEnough=prevEnd===null||nextStart===null||nextStart-prevEnd<=120;const canJoin=Boolean(previous&&previousEvent&&isJourneyStep(previousEvent)&&isJourneyStep(event)&&closeEnough&&tripEventStatus(previousEvent)!=='CANCELLED'&&tripEventStatus(event)!=='CANCELLED');if(canJoin){previous!.events.push(event);previous!.title=`${eventOrigin(previous!.events[0])} → ${eventDestination(event)||event.title}`;}else{groups.push({id:`group-${event.id}`,title:event.title,events:[event]});}}return groups;}
function googleMapsJourneyUrl(events:TripEvent[]){if(!events.length)return'';const origin=eventOrigin(events[0]);const destination=eventDestination(events[events.length-1]);if(!origin||!destination)return googleMapsEventUrl(events[0]);return`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`;}
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
