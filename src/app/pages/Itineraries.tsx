import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, MapPin, Calendar, DollarSign, Star, Trash2, Plane, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { ItineraryDetails, deleteItineraryDetails, getItineraryDetails } from "../../lib/itineraryDetails";
import { buildSignalsByDate } from "../../lib/calendarSignals";

interface SavedItinerary {
  id: string | number;
  destination: string;
  dates: string;
  budget: string;
  image: string;
  rating?: number;
  saved: boolean;
  details?: ItineraryDetails | null;
  startDate: string;
  endDate: string;
}

export function Itineraries() {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString("es-ES", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();

  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));

  const signalsByDate = useMemo(
    () =>
      buildSignalsByDate(
        itineraries.map((item) => ({
          id: item.id,
          start_date: item.startDate,
          end_date: item.endDate,
        }))
      ),
    [itineraries]
  );

  const getDateKey = (d: number) => {
    const m = String(month + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    return `${year}-${m}-${day}`;
  };

  const fetchItineraries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching itineraries:", error);
    } else {
      const mappedData = data.map((item: any) => ({
        id: item.id,
        destination: item.destination,
        dates: `${item.start_date} - ${item.end_date}`,
        startDate: item.start_date,
        endDate: item.end_date,
        budget: item.budget,
        image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZHZlbnR1cmUlMjB0cmF2ZWx8ZW58MXx8fHwxNzczODA1NjUwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        rating: 4.5,
        saved: true,
        details: getItineraryDetails(item.id),
      }));
      setItineraries(mappedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  const deleteItinerary = async (id: string | number) => {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting itinerary:", error);
    } else {
      deleteItineraryDetails(id);
      setItineraries(itineraries.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-purple-100/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-semibold text-gray-900">Mis Itinerarios</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Calendario de Viaje</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-purple-100/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <p className="text-sm font-medium text-slate-800 capitalize min-w-[140px] text-center">{monthName}</p>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-purple-100/50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {["D", "L", "M", "M", "J", "V", "S"].map((day, idx) => (
              <div key={`${day}-${idx}`} className="text-center text-xs font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`offset-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const signal = signalsByDate[getDateKey(day)];
              const hasFlight = Boolean(signal?.hasFlight);
              const hasHotel = Boolean(signal?.hasHotel);
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg border text-sm font-medium flex flex-col items-center justify-center gap-1 ${
                    hasFlight
                      ? "bg-blue-500 text-white border-blue-600"
                      : hasHotel
                        ? "bg-purple-500 text-white border-purple-600"
                        : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  <span>{day}</span>
                  {(signal?.hasFlight || signal?.hasHotel) && (
                    <span className="flex items-center gap-1">
                      {signal.hasFlight && <span className="text-[11px] leading-none">✈️</span>}
                      {signal.hasHotel && <Building2 className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1"><Plane className="w-3.5 h-3.5 text-blue-600" /> Vuelo</span>
            <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-pink-600" /> Hotel</span>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg"
          >
            <p className="text-2xl font-semibold">{loading ? "..." : itineraries.length}</p>
            <p className="text-sm opacity-90">Itinerarios</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg"
          >
            <p className="text-2xl font-semibold">0</p>
            <p className="text-sm opacity-90">Destinos</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg"
          >
            <p className="text-2xl font-semibold">0</p>
            <p className="text-sm opacity-90">Días viajados</p>
          </motion.div>
        </div>

        {/* Itineraries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {itineraries.map((itinerary, index) => (
            <motion.div
              key={itinerary.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/20 group"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={itinerary.image}
                  alt={itinerary.destination}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Delete button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteItinerary(itinerary.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </motion.button>

                {/* Rating */}
                {itinerary.rating && (
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{itinerary.rating}</span>
                  </div>
                )}

                {/* Destination */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-semibold text-lg">{itinerary.destination}</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>{itinerary.dates}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 text-pink-600" />
                    <span>{itinerary.budget}</span>
                  </div>
                </div>

                {itinerary.details && (
                  <div className="mb-4 space-y-3 rounded-xl bg-purple-50/80 border border-purple-100 p-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-2">Vuelos por fecha</p>
                      <div className="space-y-2">
                        {itinerary.details.flights.map((flight) => (
                          <div key={`${flight.date}-${flight.route}`} className="flex items-start gap-2 text-xs text-gray-700">
                            <Plane className="w-3.5 h-3.5 mt-0.5 text-blue-600" />
                            <div>
                              <p className="font-medium">{flight.date} • {flight.route}</p>
                              <p>{flight.airline} • {flight.time} • {flight.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {itinerary.details.hotel ? (
                      <div className="pt-2 border-t border-purple-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-2">Hotel asignado</p>
                        <div className="flex items-start gap-2 text-xs text-gray-700">
                          <Building2 className="w-3.5 h-3.5 mt-0.5 text-pink-600" />
                          <div>
                            <p className="font-medium">{itinerary.details.hotel.name}</p>
                            <p>
                              {itinerary.details.hotel.location} • {itinerary.details.hotel.checkIn} al {itinerary.details.hotel.checkOut}
                            </p>
                            <p>{itinerary.details.hotel.pricePerNight} por noche</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-purple-100">
                        <p className="text-xs text-gray-600">Hotel pendiente por confirmar.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow">
                    Ver itinerario
                  </button>
                  <button className="px-4 py-2.5 border border-purple-200 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors">
                    Editar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {itineraries.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay itinerarios guardados</h3>
            <p className="text-gray-600 mb-6">Comienza a planear tu próximo viaje con nuestro asistente IA</p>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              Crear itinerario
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
