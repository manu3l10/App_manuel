import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, MapPin, Calendar, DollarSign, Star, Trash2, Plane, Building2, ChevronLeft, ChevronRight, X, Heart } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { ItineraryDetails, deleteItineraryDetails, getItineraryDetails, saveItineraryDetails, setLastTripId } from "../../lib/itineraryDetails";
import { buildSignalsByDate } from "../../lib/calendarSignals";
import { buildPlaceKey, listPlaceFavorites, togglePlaceFavorite } from "../../lib/placeFavorites";

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
  const [editingItinerary, setEditingItinerary] = useState<SavedItinerary | null>(null);
  const [viewingItinerary, setViewingItinerary] = useState<SavedItinerary | null>(null);
  const [favoritePlaceKeys, setFavoritePlaceKeys] = useState<Set<string>>(new Set());
  const [favoritePendingKey, setFavoritePendingKey] = useState<string | null>(null);

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
    fetchPlaceFavorites();
  }, []);

  const fetchPlaceFavorites = async () => {
    try {
      const data = await listPlaceFavorites(["hotel", "restaurant"]);
      setFavoritePlaceKeys(new Set(data.map((item) => item.place_key)));
    } catch (error) {
      console.error("Error fetching place favorites:", error);
    }
  };

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

  const persistItineraryDetails = (id: string | number, nextDetails: ItineraryDetails) => {
    saveItineraryDetails(id, nextDetails);
    setItineraries((prev) =>
      prev.map((item) => item.id === id ? { ...item, details: nextDetails } : item)
    );
    setEditingItinerary((prev) => prev && prev.id === id ? { ...prev, details: nextDetails } : prev);
  };

  const removeFlight = (itinerary: SavedItinerary, flightIndex: number) => {
    const details = itinerary.details ?? { flights: [], hotel: null };
    const nextDetails = {
      ...details,
      flights: details.flights.filter((_, index) => index !== flightIndex),
    };
    persistItineraryDetails(itinerary.id, nextDetails);
  };

  const removeHotel = (itinerary: SavedItinerary) => {
    const details = itinerary.details ?? { flights: [], hotel: null };
    persistItineraryDetails(itinerary.id, { ...details, hotel: null });
  };

  const askChatForChanges = (itinerary: SavedItinerary, type: "flights" | "hotel") => {
    setLastTripId(itinerary.id);
    navigate("/", {
      state: {
        chatRequest: {
          type,
          tripId: itinerary.id,
          destination: itinerary.destination,
          startDate: itinerary.startDate,
          endDate: itinerary.endDate,
        },
      },
    });
  };

  const getHotelFavoriteKey = (hotel: NonNullable<ItineraryDetails["hotel"]>) =>
    buildPlaceKey("hotel", hotel.name, hotel.location);

  const toggleHotelFavorite = async (itinerary: SavedItinerary) => {
    const hotel = itinerary.details?.hotel;
    if (!hotel) return;

    const placeKey = getHotelFavoriteKey(hotel);
    setFavoritePendingKey(placeKey);

    try {
      const result = await togglePlaceFavorite({
        itemType: "hotel",
        name: hotel.name,
        location: hotel.location,
        imageUrl: hotel.image ?? itinerary.image,
        rating: itinerary.rating ?? 4.7,
        description: `${hotel.pricePerNight} por noche. Check-in ${hotel.checkIn}, check-out ${hotel.checkOut}.`,
        metadata: {
          tripId: itinerary.id,
          destination: itinerary.destination,
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          pricePerNight: hotel.pricePerNight,
        },
      });

      setFavoritePlaceKeys((prev) => {
        const next = new Set(prev);
        if (result.favorited) {
          next.add(placeKey);
        } else {
          next.delete(placeKey);
        }
        return next;
      });
    } catch (error: any) {
      console.error("Error toggling hotel favorite:", error);
      window.alert(error?.message ?? "No se pudo actualizar el favorito.");
    } finally {
      setFavoritePendingKey(null);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div
        className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/", { state: { openMenu: true } })}
            className="p-2 hover:bg-purple-100/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-semibold text-gray-900">Mis Itinerarios</h1>
          <div className="w-10" />
        </div>
      </div>

      <div
        className="max-w-4xl mx-auto w-full overflow-x-hidden px-4 py-6"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1.5rem)" }}
      >
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
                          <div key={`${flight.date}-${flight.route}`} className="flex min-w-0 items-start gap-2 text-xs text-gray-700">
                            <Plane className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="break-words font-medium">{flight.date} • {flight.route}</p>
                              <p className="break-words">{flight.airline} • {flight.time} • {flight.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {itinerary.details.hotel ? (
                      <div className="pt-2 border-t border-purple-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-2">Hotel asignado</p>
                        <div className="flex min-w-0 items-start gap-2 text-xs text-gray-700">
                          <Building2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-pink-600" />
                          <div className="min-w-0">
                            <p className="break-words font-medium">{itinerary.details.hotel.name}</p>
                            <p className="break-words">
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
                  <button
                    onClick={() => setViewingItinerary(itinerary)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
                  >
                    Ver itinerario
                  </button>
                  <button
                    onClick={() => setEditingItinerary(itinerary)}
                    className="px-4 py-2.5 border border-purple-200 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors"
                  >
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

      {viewingItinerary && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center overflow-hidden px-3 py-3 sm:p-4"
          style={{
            paddingTop: "calc(var(--safe-top) + 0.75rem)",
            paddingBottom: "calc(var(--safe-bottom) + 0.75rem)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-3xl overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-2xl border border-purple-100"
            style={{ maxHeight: "calc(100dvh - var(--safe-top) - var(--safe-bottom) - 1.5rem)" }}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={viewingItinerary.details?.hotel?.image || viewingItinerary.image}
                alt={viewingItinerary.destination}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <button
                onClick={() => setViewingItinerary(null)}
                className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 text-slate-700 shadow-lg hover:bg-white"
                aria-label="Cerrar detalle"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-100">Detalle del itinerario</p>
                <h2 className="text-2xl font-semibold text-white">{viewingItinerary.destination}</h2>
                <p className="text-sm text-white/85">{viewingItinerary.dates}</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Plane className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-950">Vuelos guardados</h3>
                </div>

                {viewingItinerary.details?.flights?.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {viewingItinerary.details.flights.map((flight, index) => (
                      <div key={`${flight.date}-${flight.route}-${index}`} className="rounded-lg bg-white border border-blue-100 p-3">
                        <p className="font-medium text-slate-900">{flight.route}</p>
                        <p className="text-xs text-slate-600 mt-1">{flight.date}</p>
                        <p className="text-xs text-slate-600">{flight.airline} • {flight.time}</p>
                        <p className="text-xs font-medium text-blue-700 mt-1">{flight.price}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No hay vuelos confirmados para este itinerario.</p>
                )}
              </section>

              <section className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <h3 className="font-semibold text-purple-950">Hotel</h3>
                  </div>
                  {viewingItinerary.details?.hotel && (
                    <button
                      onClick={() => toggleHotelFavorite(viewingItinerary)}
                      disabled={favoritePendingKey === getHotelFavoriteKey(viewingItinerary.details.hotel)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-70 ${
                        favoritePlaceKeys.has(getHotelFavoriteKey(viewingItinerary.details.hotel))
                          ? "bg-pink-100 text-pink-700 border border-pink-200"
                          : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favoritePlaceKeys.has(getHotelFavoriteKey(viewingItinerary.details.hotel))
                            ? "fill-pink-500 text-pink-500"
                            : "text-purple-600"
                        }`}
                      />
                      {favoritePlaceKeys.has(getHotelFavoriteKey(viewingItinerary.details.hotel))
                        ? "En favoritos"
                        : "Añadir a favoritos"}
                    </button>
                  )}
                </div>

                {viewingItinerary.details?.hotel ? (
                  <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                    <img
                      src={viewingItinerary.details.hotel.image || viewingItinerary.image}
                      alt={viewingItinerary.details.hotel.name}
                      className="h-40 w-full rounded-lg object-cover"
                    />
                    <div className="rounded-lg bg-white border border-purple-100 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{viewingItinerary.details.hotel.name}</p>
                      <p className="text-xs mt-1">{viewingItinerary.details.hotel.location}</p>
                      <p className="text-xs mt-2">
                        Estadía: {viewingItinerary.details.hotel.checkIn} al {viewingItinerary.details.hotel.checkOut}
                      </p>
                      <p className="text-xs font-medium text-purple-700 mt-1">
                        {viewingItinerary.details.hotel.pricePerNight} por noche
                      </p>
                      <p className="text-xs text-slate-500 mt-3">
                        Guardado dentro de este viaje. Puedes marcarlo como favorito para encontrarlo luego en la sección Favoritos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Aún no hay hotel confirmado para este itinerario.</p>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      )}

      {editingItinerary && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center overflow-hidden px-3 py-3 sm:p-4"
          style={{
            paddingTop: "calc(var(--safe-top) + 0.75rem)",
            paddingBottom: "calc(var(--safe-bottom) + 0.75rem)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-2xl overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-2xl border border-purple-100"
            style={{ maxHeight: "calc(100dvh - var(--safe-top) - var(--safe-bottom) - 1.5rem)" }}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-purple-100 p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Editar itinerario</p>
                <h2 className="text-lg font-semibold text-slate-900">{editingItinerary.destination}</h2>
                <p className="text-sm text-slate-500">{editingItinerary.dates}</p>
              </div>
              <button
                onClick={() => setEditingItinerary(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                aria-label="Cerrar editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-blue-950">Vuelos seleccionados</h3>
                  </div>
                  <button
                    onClick={() => askChatForChanges(editingItinerary, "flights")}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    Cambiar vuelos
                  </button>
                </div>

                {editingItinerary.details?.flights?.length ? (
                  <div className="space-y-2">
                    {editingItinerary.details.flights.map((flight, index) => (
                      <div key={`${flight.date}-${flight.route}-${index}`} className="rounded-lg bg-white border border-blue-100 p-3 flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 text-sm text-slate-700">
                          <p className="break-words font-medium text-slate-900">{flight.route}</p>
                          <p className="mt-1 break-words text-xs">{flight.date} • {flight.airline} • {flight.time}</p>
                          <p className="text-xs text-blue-700 mt-1">{flight.price}</p>
                        </div>
                        <button
                          onClick={() => removeFlight(editingItinerary, index)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No hay vuelos confirmados para este itinerario.</p>
                )}
              </section>

              <section className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <h3 className="font-semibold text-purple-950">Hotel seleccionado</h3>
                  </div>
                  <button
                    onClick={() => askChatForChanges(editingItinerary, "hotel")}
                    className="px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
                  >
                    Cambiar hotel
                  </button>
                </div>

                {editingItinerary.details?.hotel ? (
                  <div className="rounded-lg bg-white border border-purple-100 p-3 flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 text-sm text-slate-700">
                      <p className="break-words font-medium text-slate-900">{editingItinerary.details.hotel.name}</p>
                      <p className="mt-1 break-words text-xs">
                        {editingItinerary.details.hotel.location} • {editingItinerary.details.hotel.checkIn} al {editingItinerary.details.hotel.checkOut}
                      </p>
                      <p className="text-xs text-purple-700 mt-1">{editingItinerary.details.hotel.pricePerNight} por noche</p>
                    </div>
                    <button
                      onClick={() => removeHotel(editingItinerary)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Aún no hay hotel confirmado para este itinerario.</p>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
