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

export type Trip = TripSummary & {
  participants: Participant[];
  events: TripEvent[];
  places: Place[];
  packing: PackingItem[];
  packing_bags: PackingBag[];
};

export type WeatherDay = { date: string; code: number; max: number; min: number; rain: number };
export type SearchPlace = { name: string; address: string; lat: number; lng: number; category: string; provider: string };
