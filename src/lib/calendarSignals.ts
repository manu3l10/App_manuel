import { ItineraryDetails, getItineraryDetails } from "./itineraryDetails";

export interface DaySignal {
  hasTrip: boolean;
  hasFlight: boolean;
  hasHotel: boolean;
}

interface TripLike {
  id: string | number;
  start_date?: string;
  end_date?: string;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function eachDateInRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const out: string[] = [];
  const cursor = fromDateKey(start);
  const endDate = fromDateKey(end);

  while (cursor <= endDate) {
    out.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function buildSignalsByDate(trips: TripLike[]): Record<string, DaySignal> {
  const map: Record<string, DaySignal> = {};

  const ensure = (dateKey: string): DaySignal => {
    if (!map[dateKey]) {
      map[dateKey] = { hasTrip: false, hasFlight: false, hasHotel: false };
    }
    return map[dateKey];
  };

  trips.forEach((trip) => {
    if (!trip.start_date || !trip.end_date) return;

    eachDateInRange(trip.start_date, trip.end_date).forEach((dateKey) => {
      ensure(dateKey).hasTrip = true;
    });

    const details: ItineraryDetails | null = getItineraryDetails(trip.id);
    if (!details) return;

    details.flights.forEach((flight) => {
      ensure(flight.date).hasFlight = true;
    });

    if (details.hotel) {
      eachDateInRange(details.hotel.checkIn, details.hotel.checkOut).forEach((dateKey) => {
        ensure(dateKey).hasHotel = true;
      });
    }
  });

  return map;
}
