export type TripSummary = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  emoji: string;
  event_count: number;
  place_count: number;
};

export type Participant = { id: string; name: string; gender?: string | null };

export type TripEvent = {
  id: string;
  trip_id: string;
  title: string;
  kind: 'flight' | 'hotel' | 'train' | 'activity' | 'reservation' | string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  source: string;
  sort_order: number;
  meta?: Record<string, unknown>;
};

export type Place = {
  id: string;
  name: string;
  category: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  saved_by?: string | null;
  vote_score: number;
  vote_count: number;
};

export type PackingItem = {
  id: string;
  label: string;
  category: string;
  owner?: string | null;
  bag_id?: string | null;
  quantity: number;
  weight_kg: number;
  source?: string | null;
  checked: number;
  reason?: string | null;
};

export type PackingBag = {
  id: string;
  name: string;
  kind: string;
  owner?: string | null;
  weight_limit?: number | null;
  tare_weight: number;
  notes?: string | null;
};

export type TripChecklistItem = {
  id: string;
  title: string;
  category: string;
  status: 'TODO' | 'DONE' | string;
  notes?: string | null;
  url?: string | null;
  sort_order: number;
};

export type Restaurant = {
  id: string;
  name: string;
  city?: string | null;
  planned_date?: string | null;
  planned_time?: string | null;
  hours?: string | null;
  price_range?: string | null;
  reservation_action: 'RESERVE NOW' | 'RESERVATION OPTIONAL' | 'WALK-IN ONLY' | string;
  reservation_status: 'TODO' | 'BOOKED' | 'WALK-IN' | string;
  reservation_channel?: string | null;
  reservation_url?: string | null;
  notes?: string | null;
  dietary_notes?: string | null;
  sort_order: number;
};

export type TripGuide = {
  id: string;
  section: string;
  title: string;
  subtitle?: string | null;
  details?: string | null;
  sort_order: number;
};

export type Trip = TripSummary & {
  participants: Participant[];
  events: TripEvent[];
  places: Place[];
  packing: PackingItem[];
  packing_bags: PackingBag[];
  checklist: TripChecklistItem[];
  restaurants: Restaurant[];
  guides: TripGuide[];
};

export type WeatherDay = { date: string; code: number; max: number; min: number; rain: number };
export type SearchPlace = { name: string; address: string; lat: number; lng: number; category: string; provider: string };
