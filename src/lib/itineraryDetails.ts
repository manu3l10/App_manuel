export interface FlightSegment {
  date: string;
  route: string;
  airline: string;
  time: string;
  price: string;
}

export interface HotelStay {
  name: string;
  location: string;
  checkIn: string;
  checkOut: string;
  pricePerNight: string;
  image?: string;
}

export interface ItineraryDetails {
  flights: FlightSegment[];
  hotel?: HotelStay | null;
}

const STORAGE_KEY = "mta_itinerary_details_v1";
const LAST_TRIP_KEY = "mta_last_trip_id_v1";

function getStorageMap(): Record<string, ItineraryDetails> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, ItineraryDetails>;
  } catch {
    return {};
  }
}

function setStorageMap(value: Record<string, ItineraryDetails>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function saveItineraryDetails(tripId: string | number, details: ItineraryDetails) {
  const map = getStorageMap();
  map[String(tripId)] = details;
  setStorageMap(map);
}

export function getItineraryDetails(tripId: string | number): ItineraryDetails | null {
  const map = getStorageMap();
  return map[String(tripId)] ?? null;
}

export function deleteItineraryDetails(tripId: string | number) {
  const map = getStorageMap();
  delete map[String(tripId)];
  setStorageMap(map);
}

export function setLastTripId(tripId: string | number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_TRIP_KEY, String(tripId));
}

export function getLastTripId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_TRIP_KEY);
}
