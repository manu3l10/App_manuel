import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Clock, Building2, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { buildSignalsByDate } from "../../lib/calendarSignals";
import { deleteItineraryDetails, FlightSegment, HotelStay, ItineraryDetails, getItineraryDetails } from "../../lib/itineraryDetails";

interface TripEvent {
  id: string | number;
  destination: string;
  dates: string;
  image: string;
  color: string;
  start_date: string;
  end_date: string;
  details?: ItineraryDetails | null;
}

interface SelectedDetails {
  title: string;
  destination: string;
  dates: string;
  flights: FlightSegment[];
  hotel: HotelStay | null;
}

const AIRPORT_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";
const HOTEL_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

export function Calendar() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [upcomingTrips, setUpcomingTrips] = useState<TripEvent[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<SelectedDetails | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' });

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOffset = (y: number, m: number) => {
    let day = new Date(y, m, 1).getDay();
    return day; // 0 for Sunday
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const daysInMonth = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);
  const firstDayOffset = getFirstDayOffset(year, month);

  useEffect(() => {
    const fetchTrips = async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, destination, start_date, end_date")
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Error fetching trips for calendar:", error);
        return;
      }

      const mapped: TripEvent[] = (data ?? []).map((item: any) => ({
        id: item.id,
        destination: item.destination,
        dates: `${item.start_date} - ${item.end_date}`,
        start_date: item.start_date,
        end_date: item.end_date,
        image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        color: "blue",
        details: getItineraryDetails(item.id),
      }));

      setUpcomingTrips(mapped);
    };

    fetchTrips();
  }, []);

  const signalsByDate = useMemo(
    () => buildSignalsByDate(upcomingTrips.map((trip) => ({
      id: trip.id,
      start_date: trip.start_date,
      end_date: trip.end_date,
    }))),
    [upcomingTrips]
  );

  const totalDestinations = useMemo(
    () => new Set(upcomingTrips.map((trip) => trip.destination)).size,
    [upcomingTrips]
  );

  const totalTravelDays = useMemo(() => {
    const toDate = (value: string) => new Date(`${value}T00:00:00`);
    return upcomingTrips.reduce((acc, trip) => {
      const start = toDate(trip.start_date);
      const end = toDate(trip.end_date);
      const diffMs = end.getTime() - start.getTime();
      const days = Number.isNaN(diffMs) ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return acc + Math.max(days, 0);
    }, 0);
  }, [upcomingTrips]);

  const getDateKey = (d: number) => {
    const m = String(month + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    return `${year}-${m}-${day}`;
  };

  const isDateWithinRange = (dateKey: string, start?: string, end?: string) => {
    if (!start || !end) return false;
    return dateKey >= start && dateKey <= end;
  };

  const openTripDetails = (trip: TripEvent) => {
    setSelectedDetails({
      title: "Detalle del viaje",
      destination: trip.destination,
      dates: trip.dates,
      flights: trip.details?.flights ?? [],
      hotel: trip.details?.hotel ?? null,
    });
  };

  const openDayDetails = (dateKey: string) => {
    const flightTrip = upcomingTrips.find((trip) =>
      trip.details?.flights?.some((flight) => flight.date === dateKey)
    );
    const hotelTrip = upcomingTrips.find((trip) =>
      isDateWithinRange(dateKey, trip.details?.hotel?.checkIn, trip.details?.hotel?.checkOut)
    );

    if (flightTrip) {
      setSelectedDetails({
        title: "Detalle del vuelo",
        destination: flightTrip.destination,
        dates: flightTrip.dates,
        flights: (flightTrip.details?.flights ?? []).filter((flight) => flight.date === dateKey),
        hotel: null,
      });
      return;
    }

    if (hotelTrip) {
      setSelectedDetails({
        title: "Detalle del hotel",
        destination: hotelTrip.destination,
        dates: hotelTrip.dates,
        flights: [],
        hotel: hotelTrip.details?.hotel ?? null,
      });
    }
  };

  const deleteTrip = async (tripId: string | number) => {
    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", tripId);

    if (error) {
      console.error("Error deleting trip from calendar:", error);
      return;
    }

    deleteItineraryDetails(tripId);
    setUpcomingTrips((prev) => prev.filter((trip) => trip.id !== tripId));
    setSelectedDetails(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-blue-100/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="font-semibold text-slate-900">{t('calendar.title')}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-6"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-blue-100/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h2 className="font-semibold text-slate-900 capitalize">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-blue-100/50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {[
              t('calendar.days.sun'), t('calendar.days.mon'), t('calendar.days.tue'),
              t('calendar.days.wed'), t('calendar.days.thu'), t('calendar.days.fri'),
              t('calendar.days.sat')
            ].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {daysInMonth.map((day) => {
              const dateKey = getDateKey(day);
              const signal = signalsByDate[dateKey];
              const hasFlight = Boolean(signal?.hasFlight);
              const hasHotel = Boolean(signal?.hasHotel);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openDayDetails(dateKey)}
                  className={`aspect-square relative flex items-center justify-center rounded-lg text-sm font-medium border transition-all ${
                    hasFlight
                      ? "bg-blue-500 text-white border-blue-600 shadow-md"
                      : hasHotel
                        ? "bg-gradient-to-br from-[#6f63d9] via-[#7d73e6] to-[#9088f0] text-white border-[#5f56c9] shadow-md"
                        : isToday
                          ? "bg-blue-100 text-blue-900 border-2 border-blue-500"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {day}
                  {(signal?.hasFlight || signal?.hasHotel) && (
                    <span className="absolute top-1 right-1 flex items-center gap-1">
                      {signal.hasFlight && <span className="text-sm leading-none">✈️</span>}
                      {signal.hasHotel && (
                        <span className="w-4 h-4 rounded-full bg-white/90 text-pink-700 flex items-center justify-center">
                          <Building2 className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg"
          >
            <p className="text-2xl font-semibold">{upcomingTrips.length}</p>
            <p className="text-sm opacity-90">Itinerarios</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg"
          >
            <p className="text-2xl font-semibold">{totalDestinations}</p>
            <p className="text-sm opacity-90">Destinos</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg"
          >
            <p className="text-2xl font-semibold">{totalTravelDays}</p>
            <p className="text-sm opacity-90">Días viajados</p>
          </motion.div>
        </div>

        {/* Upcoming Trips */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Próximos Viajes</h2>
          <div className="space-y-4">
            {upcomingTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-32 h-32 flex-shrink-0">
                    <img
                      src={trip.details?.hotel?.image || (trip.details?.hotel ? HOTEL_FALLBACK_IMAGE : trip.details?.flights?.length ? AIRPORT_IMAGE : trip.image)}
                      alt={trip.destination}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className={`w-4 h-4 text-${trip.color}-600`} />
                        <h3 className="font-semibold text-gray-900">{trip.destination}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{trip.dates}</span>
                      </div>
                      {trip.details?.flights?.length ? (
                        <div className="mt-2 space-y-2">
                          {trip.details.flights.map((flight) => (
                            <div key={`${trip.id}-${flight.date}-${flight.route}`} className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-1.5">
                              <img src={AIRPORT_IMAGE} alt="Aeropuerto" className="w-8 h-8 rounded-md object-cover" />
                              <p className="text-xs text-blue-700">
                                ✈️ {flight.date} • {flight.route} • {flight.time}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">Sin vuelos confirmados para este viaje.</p>
                      )}

                      {trip.details?.hotel && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#d8d4ff] bg-[#f2f0ff] p-1.5">
                          <img
                            src={trip.details.hotel.image || HOTEL_FALLBACK_IMAGE}
                            alt={trip.details.hotel.name}
                            className="w-8 h-8 rounded-md object-cover"
                          />
                          <p className="text-xs text-[#4d3ea8]">
                            🏨 {trip.details.hotel.name} • {trip.details.hotel.checkIn} al {trip.details.hotel.checkOut}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openTripDetails(trip)}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
                      >
                        Ver detalles
                      </button>
                      <button
                        onClick={() => deleteTrip(trip.id)}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{selectedDetails.title}</h3>
              <button
                onClick={() => setSelectedDetails(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-slate-800 font-medium">{selectedDetails.destination}</p>
              <p className="text-xs text-slate-500">{selectedDetails.dates}</p>
            </div>

            {selectedDetails.flights.length > 0 && (
              <div className="space-y-3">
                {selectedDetails.flights.map((flight) => (
                  <div key={`${flight.date}-${flight.route}`} className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <img src={AIRPORT_IMAGE} alt="Aeropuerto" className="w-full h-28 rounded-lg object-cover mb-2" />
                    <p className="text-sm font-medium text-blue-900">✈️ {flight.route}</p>
                    <p className="text-xs text-blue-800 mt-1">
                      {flight.date} • {flight.airline} • {flight.time}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">{flight.price}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedDetails.hotel && (
              <div className="space-y-3 mt-3">
                <div className="rounded-xl border border-[#d8d4ff] bg-[#f2f0ff] p-3">
                  <img
                    src={selectedDetails.hotel.image || HOTEL_FALLBACK_IMAGE}
                    alt={selectedDetails.hotel.name}
                    className="w-full h-28 rounded-lg object-cover mb-2"
                  />
                  <p className="text-sm font-medium text-[#3f2f97]">🏨 {selectedDetails.hotel.name}</p>
                  <p className="text-xs text-[#4d3ea8] mt-1">{selectedDetails.hotel.location}</p>
                  <p className="text-xs text-[#4d3ea8] mt-1">
                    {selectedDetails.hotel.checkIn} al {selectedDetails.hotel.checkOut}
                  </p>
                  <p className="text-xs text-[#5a49ba] mt-1">{selectedDetails.hotel.pricePerNight} por noche</p>
                </div>
              </div>
            )}

            {selectedDetails.flights.length === 0 && !selectedDetails.hotel && (
              <p className="text-sm text-slate-600">No hay detalles de vuelos u hotel para esta selección.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
