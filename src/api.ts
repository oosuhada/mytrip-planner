export type PendingMutation = {
  id: string;
  path: string;
  method: 'PATCH';
  body: unknown;
  created_at: number;
};

const DB_NAME = 'mytrip-offline';
const STORE = 'mutations';
const SYNC_EVENT = 'mytrip:sync-state';

function mutationId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openQueueDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function listPending(): Promise<PendingMutation[]> {
  if (!('indexedDB' in globalThis)) return [];
  const rows = await withStore<PendingMutation[]>('readonly', (store) => store.getAll());
  return rows.sort((a, b) => a.created_at - b.created_at);
}

async function queueMutation(path: string, body: unknown) {
  const existing = (await listPending().catch(() => [])).filter((item) => item.path === path && item.method === 'PATCH');
  const previousBody = existing.reduce<Record<string, unknown>>((merged, item) => ({ ...merged, ...((item.body || {}) as Record<string, unknown>) }), {});
  const mergedBody = { ...previousBody, ...((body || {}) as Record<string, unknown>) };
  for (const item of existing) await removeMutation(item.id);
  const pending: PendingMutation = { id: mutationId(), path, method: 'PATCH', body: mergedBody, created_at: Date.now() };
  await withStore('readwrite', (store) => store.put(pending));
  emitSyncState({ mutation: pending });
  return pending;
}

async function removeMutation(id: string) {
  await withStore('readwrite', (store) => store.delete(id));
}

async function emitSyncState(extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const pending = await listPending().catch(() => []);
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { pending: pending.length, online: navigator.onLine, ...extra } }));
}

async function request<T>(path: string, init?: RequestInit, allowQueue = true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    });
  } catch (error) {
    if (allowQueue && init?.method === 'PATCH' && path.startsWith('/api/')) {
      const body = init.body ? JSON.parse(String(init.body)) : null;
      await queueMutation(path, body);
      return { ok: true, queued: true } as T;
    }
    throw error;
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init, true);
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });

export async function pendingMutationCount() {
  return (await listPending()).length;
}

export function subscribeSyncState(listener: (detail: { pending: number; online: boolean; failed?: boolean; mutation?: PendingMutation }) => void) {
  const handler = (event: Event) => listener((event as CustomEvent).detail);
  window.addEventListener(SYNC_EVENT, handler);
  return () => window.removeEventListener(SYNC_EVENT, handler);
}

export async function flushQueuedMutations() {
  if (!navigator.onLine) { await emitSyncState(); return { flushed: 0, failed: 0 }; }
  const pending = await listPending();
  let flushed = 0;
  let failed = 0;
  for (const mutation of pending) {
    try {
      await request(mutation.path, { method: mutation.method, body: JSON.stringify(mutation.body) }, false);
      await removeMutation(mutation.id);
      flushed += 1;
    } catch {
      failed += 1;
      break;
    }
  }
  await emitSyncState({ failed: failed > 0 });
  return { flushed, failed };
}

function applyMutationToTrip<T extends Record<string, any>>(trip: T, mutation: PendingMutation) {
    const body = (mutation.body || {}) as Record<string, any>;
    let match = mutation.path.match(/^\/api\/events\/([^/]+)$/);
    if (match) {
      const event = trip.events?.find((item: any) => item.id === match![1]);
      if (event) Object.assign(event, body);
      return;
    }
    match = mutation.path.match(/^\/api\/meal-slots\/([^/]+)\/select$/);
    if (match) {
      const slot = trip.meal_slots?.find((item: any) => item.id === match![1]);
      if (slot) {
        slot.selected_restaurant_id = body.restaurant_id;
        const restaurant = trip.restaurants?.find((item: any) => item.id === body.restaurant_id);
        const place = trip.places?.find((item: any) => item.restaurant_id === body.restaurant_id);
        const event = slot.event_id ? trip.events?.find((item: any) => item.id === slot.event_id) : null;
        if (restaurant && event) Object.assign(event, {
          title: restaurant.name,
          location: restaurant.name,
          address: place?.address || null,
          lat: place?.lat ?? null,
          lng: place?.lng ?? null,
          notes: [restaurant.notes, restaurant.dietary_notes].filter(Boolean).join(' · '),
          event_status: 'PLANNED',
          completed_at: null,
        });
      }
      return;
    }
    match = mutation.path.match(/^\/api\/decision-slots\/([^/]+)\/select$/);
    if (match) {
      const slot = trip.decision_slots?.find((item: any) => item.id === match![1]);
      if (slot) {
        slot.selected_option_id = body.option_id;
        const option = slot.options?.find((item: any) => item.id === body.option_id);
        const event = slot.event_id ? trip.events?.find((item: any) => item.id === slot.event_id) : null;
        if (option && event && option.event_title) Object.assign(event, {
          title: option.event_title,
          kind: option.event_kind || event.kind,
          start_time: option.event_start_time || event.start_time,
          end_time: option.event_end_time || event.end_time,
          location: option.event_location || event.location,
          notes: option.event_notes || event.notes,
          meta: option.event_meta || event.meta,
          event_status: 'PLANNED',
          completed_at: null,
        });
      }
      return;
    }
    match = mutation.path.match(/^\/api\/checklist\/([^/]+)$/);
    if (match) {
      const item = trip.checklist?.find((row: any) => row.id === match![1]);
      if (item) item.status = body.status;
      return;
    }
    match = mutation.path.match(/^\/api\/restaurants\/([^/]+)$/);
    if (match) {
      const item = trip.restaurants?.find((row: any) => row.id === match![1]);
      if (item && body.reservation_status) item.reservation_status = body.reservation_status;
      return;
    }
    match = mutation.path.match(/^\/api\/packing\/([^/]+)$/);
    if (match) {
      const item = trip.packing?.find((row: any) => row.id === match![1]);
      if (item) Object.assign(item, body);
    }
}

export function applyQueuedMutationToTrip<T extends Record<string, any>>(source: T, mutation: PendingMutation): T {
  const trip = structuredClone(source);
  applyMutationToTrip(trip, mutation);
  return trip;
}

export async function applyPendingMutationsToTrip<T extends Record<string, any>>(source: T): Promise<T> {
  const pending = await listPending().catch(() => []);
  if (!pending.length) return source;
  const trip = structuredClone(source);
  for (const mutation of pending) {
    applyMutationToTrip(trip, mutation);
  }
  return trip;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushQueuedMutations().catch(() => emitSyncState({ failed: true })); });
  window.addEventListener('offline', () => { emitSyncState(); });
}
