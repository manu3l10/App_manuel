import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Mic, Plane } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { ReactNode } from "react";
import { ChatMessage } from "./ChatMessage";
import { useLanguage } from "../../contexts/LanguageContext";
import { ItineraryCard } from "./ItineraryCard";
import { HotelCard } from "./HotelCard";
import { supabase } from "../../lib/supabase";
import { HotelStay, ItineraryDetails, getItineraryDetails, getLastTripId, saveItineraryDetails, setLastTripId } from "../../lib/itineraryDetails";

type ChatCardPayload = {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  details: ItineraryDetails;
};

type ChatMessageItem = {
  type: "user" | "ai";
  content: string;
  card?: ReactNode;
};

type HotelOption = {
  name: string;
  location: string;
  rating: number;
  pricePerNight: string;
  image: string;
  amenities: string[];
  highlights: string[];
};

type FlightOption = {
  label: string;
  flights: ItineraryDetails["flights"];
  budget: string;
};

type ChatChangeRequest = {
  type: "flights" | "hotel";
  tripId: string | number;
  destination: string;
  startDate: string;
  endDate: string;
};

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL?.trim() || "/api/chat";
const API_BASE_URL = AGENT_API_URL.replace(/\/api\/chat\/?$/, "");
const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

const buildAirbnbSearchUrl = (location: string, checkin?: string, checkout?: string) => {
  const slug = (location || "Colombia")
    .replace(/,\s*/g, "--")
    .replace(/\s+/g, "-");
  const url = new URL(`https://www.airbnb.com/s/${encodeURIComponent(slug)}/homes`);

  if (checkin) url.searchParams.set("checkin", checkin);
  if (checkout) url.searchParams.set("checkout", checkout);
  url.searchParams.set("adults", "1");

  return url.toString();
};

const normalizeAirbnbUrl = (rawUrl: unknown, args: { location?: string; checkin?: string; checkout?: string }) => {
  if (typeof rawUrl === "string" && rawUrl.startsWith("https://")) return rawUrl;
  if (typeof rawUrl === "string" && rawUrl.startsWith("/")) return `https://www.airbnb.com${rawUrl}`;

  return buildAirbnbSearchUrl(args.location || "Colombia", args.checkin, args.checkout);
};

export function AIChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      type: "ai",
      content: lang === 'es'
        ? "✨ Hola, soy tu asistente personal de viajes. ¿A dónde te gustaría viajar?"
        : "✨ Hi, I'm your personal travel assistant. Where would you like to travel?",
    },
  ]);
  const [savingProposal, setSavingProposal] = useState(false);
  const [savingHotel, setSavingHotel] = useState(false);
  const pendingChatActionRef = useRef(false);
  const completedChatActionsRef = useRef<Set<string>>(new Set());

  const suggestions = [
    lang === "es"
      ? "Viajar al Eje Cafetero"
      : "Travel to the Coffee Region",
  ];

  const buildEjeCafeteroFlightsPayload = (startDate: string, endDate: string): ChatCardPayload => ({
    destination: "Eje Cafetero (Salento, Filandia y Pereira)",
    startDate,
    endDate,
    budget: "$398.000 - $515.000 COP (vuelos)",
    details: {
      flights: [
        {
          date: startDate,
          route: "Bogotá (BOG) → Pereira (PEI)",
          airline: "JetSMART",
          time: "09:10 - 10:08",
          price: "$189.000 COP",
        },
        {
          date: endDate,
          route: "Pereira (PEI) → Bogotá (BOG)",
          airline: "JetSMART",
          time: "20:05 - 21:02",
          price: "$209.000 COP",
        },
      ],
      hotel: null,
    },
  });

  const ejeCafeteroHotelOptions: HotelOption[] = [
    {
      name: "Hotel Bosques del Saman",
      location: "Pereira, Risaralda",
      rating: 4.8,
      pricePerNight: "$230.000 COP",
      image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      amenities: ["wifi", "breakfast"],
      highlights: ["Desayuno incluido", "Piscina climatizada", "A 15 min del aeropuerto"],
    },
    {
      name: "Hacienda Cafetera La Palma",
      location: "Salento, Quindio",
      rating: 4.7,
      pricePerNight: "$225.000 COP",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      amenities: ["wifi", "breakfast", "gym"],
      highlights: ["Vista al paisaje cafetero", "Tour de cafe incluido", "Check-in flexible"],
    },
  ];

  const buildEjeCafeteroFlightAlternatives = (startDate: string, endDate: string): FlightOption[] => [
      {
        label: "Opción flexible",
        budget: "$398.000 COP",
        flights: [
          {
            date: startDate,
            route: "Bogotá (BOG) → Pereira (PEI)",
            airline: "JetSMART",
            time: "09:10 - 10:08",
            price: "$189.000 COP",
          },
          {
            date: endDate,
            route: "Pereira (PEI) → Bogotá (BOG)",
            airline: "JetSMART",
            time: "20:05 - 21:02",
            price: "$209.000 COP",
          },
        ],
      },
      {
        label: "Opción cómoda",
        budget: "$515.000 COP",
        flights: [
          {
            date: startDate,
            route: "Bogotá (BOG) → Armenia (AXM)",
            airline: "Avianca",
            time: "06:35 - 07:34",
            price: "$255.000 COP",
          },
          {
            date: endDate,
            route: "Armenia (AXM) → Bogotá (BOG)",
            airline: "LATAM",
            time: "17:25 - 18:24",
            price: "$260.000 COP",
          },
        ],
      },
    ];

  const runChatActionOnce = async (
    actionKey: string,
    action: () => void | Promise<void>,
    options: { keepCompletedOnError?: boolean } = {}
  ) => {
    if (pendingChatActionRef.current || completedChatActionsRef.current.has(actionKey)) return;

    pendingChatActionRef.current = true;
    completedChatActionsRef.current.add(actionKey);

    try {
      await action();
    } catch (error) {
      if (!options.keepCompletedOnError) {
        completedChatActionsRef.current.delete(actionKey);
      }
      throw error;
    } finally {
      pendingChatActionRef.current = false;
    }
  };

  const DatePickerCard = ({ onConfirm }: { onConfirm: (startDate: string, endDate: string) => void }) => {
    const today = new Date().toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [error, setError] = useState("");

    const handleConfirm = () => {
      if (!startDate || !endDate) {
        setError("Selecciona fecha de ida y fecha de regreso.");
        return;
      }

      if (endDate <= startDate) {
        setError("La fecha de regreso debe ser posterior a la ida.");
        return;
      }

      setError("");
      void onConfirm(startDate, endDate);
    };

    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white space-y-4">
        <div>
          <h4 className="font-semibold text-sm uppercase tracking-wide text-cyan-300">
            Fechas para Eje Cafetero
          </h4>
          <p className="text-xs text-gray-300 mt-1">
            Por ahora el demo solo arma vuelos hacia el Eje Cafetero. Elige tus fechas y te muestro 2 opciones.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-gray-300">Fecha de ida</span>
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-300">Fecha de regreso</span>
            <input
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </label>
        </div>
        {error && <p className="text-xs text-red-200">{error}</p>}
        <button
          onClick={handleConfirm}
          className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
        >
          Buscar vuelos para estas fechas
        </button>
      </div>
    );
  };

  const HotelOptionsCard = ({
    request,
    intro,
  }: {
    request: ChatChangeRequest;
    intro?: string;
  }) => {
    const [expandedHotels, setExpandedHotels] = useState<Record<string, boolean>>({});

    return (
      <div className="space-y-4">
        {intro && <p className="text-sm text-gray-200">{intro}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ejeCafeteroHotelOptions.map((option) => {
            const expansionKey = `${request.tripId}-${option.name}`;
            const expanded = Boolean(expandedHotels[expansionKey]);

            return (
              <div key={option.name} className="space-y-3">
                <HotelCard
                  name={option.name}
                  location={option.location}
                  rating={option.rating}
                  price={option.pricePerNight}
                  image={option.image}
                  amenities={option.amenities}
                  detailsOpen={expanded}
                  onDetailsClick={() =>
                    setExpandedHotels((prev) => ({
                      ...prev,
                      [expansionKey]: !prev[expansionKey],
                    }))
                  }
                />
                <div className="bg-white/10 rounded-xl border border-white/20 p-3 text-xs text-gray-200 space-y-2">
                  <p>Check-in: {request.startDate}</p>
                  <p>Check-out: {request.endDate}</p>
                  <button
                    onClick={() =>
                      setExpandedHotels((prev) => ({
                        ...prev,
                        [expansionKey]: !prev[expansionKey],
                      }))
                    }
                    className="text-cyan-200 font-semibold hover:text-cyan-100 transition-colors"
                  >
                    {expanded ? "Ver menos" : "Ver más"}
                  </button>
                  {expanded && (
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <p className="font-semibold text-cyan-100">Incluye:</p>
                      {option.highlights.map((item) => (
                        <p key={item}>• {item}</p>
                      ))}
                      <p>• Incluye fechas seleccionadas en tu itinerario</p>
                      <p>• Precio por noche: {option.pricePerNight}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => saveHotelOptionForTrip(request, option)}
                  disabled={savingHotel}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingHotel ? "Guardando hotel..." : `Seleccionar ${option.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const saveFlightAlternativeForTrip = (request: ChatChangeRequest, option: FlightOption) => {
    void runChatActionOnce(`change-flights:${request.tripId}`, () => {
    const previousDetails = getItineraryDetails(request.tripId) ?? { flights: [], hotel: null };
    saveItineraryDetails(request.tripId, {
      ...previousDetails,
      flights: option.flights,
    });
    setLastTripId(request.tripId);
    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: `Listo. Reemplacé los vuelos por la ${option.label.toLowerCase()} en tu itinerario.`,
        card: (
          <button
            onClick={() => navigate("/itineraries")}
            className="w-full md:w-auto bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
          >
            Ver itinerario actualizado
          </button>
        ),
      },
    ]);
    });
  };

  const saveHotelOptionForTrip = (request: ChatChangeRequest, option: HotelOption) => {
    // At click time, resolve the real tripId (may have been created AFTER the card rendered)
    const resolvedTripId = request.tripId !== "temp_trip" ? request.tripId : (getLastTripId() ?? request.tripId);
    const actionKey = `change-hotel:${resolvedTripId}:${option.name}`;
    void runChatActionOnce(actionKey, () => {
      const previousDetails = getItineraryDetails(resolvedTripId) ?? { flights: [], hotel: null };
      const hotel: HotelStay = {
        name: option.name,
        location: option.location,
        checkIn: request.startDate,
        checkOut: request.endDate,
        pricePerNight: option.pricePerNight,
        image: option.image,
      };
      saveItineraryDetails(resolvedTripId, {
        ...previousDetails,
        hotel,
      });
      setLastTripId(resolvedTripId);
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `🏨 Listo. Guardé el hotel "${option.name}" en tu itinerario. Ya aparece en el calendario.`,
          card: (
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/itineraries")}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
              >
                Ver mis viajes
              </button>
              <button
                onClick={() => navigate("/calendar")}
                className="flex-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
              >
                Ver calendario
              </button>
            </div>
          ),
        },
      ]);
    });
  };

  const buildFlightChangeCard = (request: ChatChangeRequest) => (
    <div className="space-y-4">
      {buildEjeCafeteroFlightAlternatives(request.startDate, request.endDate).map((option) => (
        <div key={option.label} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-cyan-300">{option.label}</h4>
            <span className="text-xs text-gray-300">{option.budget}</span>
          </div>
          {option.flights.map((flight) => (
            <div key={`${option.label}-${flight.date}-${flight.route}`} className="rounded-xl bg-white/10 p-3 flex items-start gap-3">
              <Plane className="w-4 h-4 mt-0.5 text-cyan-300" />
              <div>
                <p className="text-sm font-medium">{flight.route}</p>
                <p className="text-xs text-gray-300">
                  {flight.date} • {flight.airline} • {flight.time} • {flight.price}
                </p>
              </div>
            </div>
          ))}
          <button
            onClick={() => saveFlightAlternativeForTrip(request, option)}
            className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
          >
            Usar estos vuelos
          </button>
        </div>
      ))}
    </div>
  );

  const showFlightOptionsForDates = (startDate: string, endDate: string) => {
    void runChatActionOnce(`show-flights:${startDate}:${endDate}`, () => {
    const options = buildEjeCafeteroFlightAlternatives(startDate, endDate);
    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: `Listo. Para viajar al Eje Cafetero del ${startDate} al ${endDate}, encontré estas 2 opciones de vuelos. Elige una para guardarla en Mis itinerarios.`,
        card: (
          <div className="space-y-4">
            {options.map((option) => (
              <div key={option.label} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-cyan-300">{option.label}</h4>
                  <span className="text-xs text-gray-300">{option.budget}</span>
                </div>
                {option.flights.map((flight) => (
                  <div key={`${option.label}-${flight.date}-${flight.route}`} className="rounded-xl bg-white/10 p-3 flex items-start gap-3">
                    <Plane className="w-4 h-4 mt-0.5 text-cyan-300" />
                    <div>
                      <p className="text-sm font-medium">{flight.route}</p>
                      <p className="text-xs text-gray-300">
                        {flight.date} • {flight.airline} • {flight.time} • {flight.price}
                      </p>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    saveProposalToItineraries({
                      ...buildEjeCafeteroFlightsPayload(startDate, endDate),
                      budget: option.budget,
                      details: {
                        flights: option.flights,
                        hotel: null,
                      },
                    })
                  }
                  disabled={savingProposal}
                  className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingProposal ? "Guardando..." : "Aceptar estos vuelos"}
                </button>
              </div>
            ))}
          </div>
        ),
      },
    ]);
    });
  };

  const buildHotelChangeCard = (request: ChatChangeRequest) => (
    <HotelOptionsCard request={request} />
  );

  const showHotelOptionsForTrip = (request: ChatChangeRequest) => {
    void runChatActionOnce(`show-hotels:${request.tripId}`, () => {
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: "Sí, quiero agendar hotel",
      },
      {
        type: "ai",
        content: `En las fechas que seleccionaste, del ${request.startDate} al ${request.endDate}, hay estas dos opciones de hoteles.`,
        card: (
          <HotelOptionsCard
            request={request}
            intro="Puedes abrir Ver más para revisar lo que incluye cada hotel antes de seleccionarlo."
          />
        ),
      },
    ]);
    });
  };

  const declineHotelsForNow = (actionKey = "decline-hotels") => {
    void runChatActionOnce(actionKey, () => {
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: "No, por ahora no",
      },
      {
        type: "ai",
        content: "Está bien. Quedo atento por si luego quieres agregar hotel u organizar otra parte del viaje.",
      },
    ]);
    });
  };

  useEffect(() => {
    const request = (location.state as any)?.chatRequest as ChatChangeRequest | undefined;
    if (!request?.tripId) return;

    setLastTripId(request.tripId);
    const nextMessage: ChatMessageItem = request.type === "flights"
      ? {
          type: "ai",
          content: `Traje más opciones de vuelos para ${request.destination}. Elige una para reemplazar los vuelos actuales.`,
          card: buildFlightChangeCard(request),
        }
      : {
          type: "ai",
          content: `Traje más opciones de hotel para ${request.destination}. Elige una para reemplazar el hotel actual.`,
          card: buildHotelChangeCard(request),
        };

    setMessages((prev) => [...prev, nextMessage]);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

  const saveProposalToItineraries = async (payload: ChatCardPayload) => {
    if (savingProposal) return;
    const actionKey = `save-flights:${payload.startDate}:${payload.endDate}`;
    if (pendingChatActionRef.current || completedChatActionsRef.current.has(actionKey)) return;

    pendingChatActionRef.current = true;
    completedChatActionsRef.current.add(actionKey);
    setSavingProposal(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "Para guardar el viaje, primero debes iniciar sesión en tu cuenta.",
        },
      ]);
      setSavingProposal(false);
      pendingChatActionRef.current = false;
      completedChatActionsRef.current.delete(actionKey);
      return;
    }

    const { data: insertedTrip, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        destination: payload.destination,
        start_date: payload.startDate,
        end_date: payload.endDate,
        budget: payload.budget,
      })
      .select("id")
      .single();

    if (error || !insertedTrip?.id) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "No pude guardar este viaje ahora. Intenta de nuevo en unos segundos.",
        },
      ]);
      setSavingProposal(false);
      pendingChatActionRef.current = false;
      completedChatActionsRef.current.delete(actionKey);
      return;
    }

    saveItineraryDetails(insertedTrip.id, payload.details);
    setLastTripId(insertedTrip.id);

    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: `✈️ ¡Vuelos guardados en tu itinerario! Si quieres agregar hotel, selecciona una opción de las tarjetas de alojamiento que aparecen arriba.`,
        card: (
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/itineraries")}
              className="flex-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
            >
              Ver mis viajes
            </button>
            <button
              onClick={() => navigate("/calendar")}
              className="flex-1 bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/15 transition-colors"
            >
              Ver calendario
            </button>
          </div>
        ),
      },
    ]);

    setSavingProposal(false);
    pendingChatActionRef.current = false;
  };

  const saveHotelForLatestEjeTrip = async (option: HotelOption) => {
    if (savingHotel) return;
    const actionKey = `save-latest-hotel:${option.name}`;
    if (pendingChatActionRef.current || completedChatActionsRef.current.has(actionKey)) return;

    pendingChatActionRef.current = true;
    completedChatActionsRef.current.add(actionKey);
    setSavingHotel(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessages((prev) => [
        ...prev,
        { type: "ai", content: "Para guardar el hotel, primero debes iniciar sesión." },
      ]);
      setSavingHotel(false);
      pendingChatActionRef.current = false;
      completedChatActionsRef.current.delete(actionKey);
      return;
    }

    const lastTripId = getLastTripId();
    let targetTrip: any = null;

    if (lastTripId) {
      const { data: byIdTrip } = await supabase
        .from("trips")
        .select("id, destination, start_date, end_date")
        .eq("id", lastTripId)
        .eq("user_id", user.id)
        .single();
      if (byIdTrip) {
        targetTrip = byIdTrip;
      }
    }

    if (!targetTrip) {
      const { data: trips, error } = await supabase
        .from("trips")
        .select("id, destination, start_date, end_date, created_at")
        .eq("user_id", user.id)
        .ilike("destination", "%Eje Cafetero%")
        .order("created_at", { ascending: false });

      if (error || !trips?.length) {
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: "No encontré un viaje del Eje Cafetero para asociar hotel. Primero acepta los vuelos.",
          },
        ]);
        setSavingHotel(false);
        pendingChatActionRef.current = false;
        completedChatActionsRef.current.delete(actionKey);
        return;
      }

      targetTrip = trips.find((trip: any) => {
        const details = getItineraryDetails(trip.id);
        return Boolean(details?.flights?.length);
      });
    }

    if (!targetTrip) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "Primero acepta y guarda los vuelos para poder registrar el hotel.",
        },
      ]);
      setSavingHotel(false);
      pendingChatActionRef.current = false;
      completedChatActionsRef.current.delete(actionKey);
      return;
    }

    const previousDetails = getItineraryDetails(targetTrip.id) ?? { flights: [], hotel: null };
    const hotel: HotelStay = {
      name: option.name,
      location: option.location,
      checkIn: targetTrip.start_date,
      checkOut: targetTrip.end_date,
      pricePerNight: option.pricePerNight,
      image: option.image,
    };

    saveItineraryDetails(targetTrip.id, {
      ...previousDetails,
      hotel,
    });
    setLastTripId(targetTrip.id);

    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: `Perfecto. Guardé el hotel "${option.name}" en tu viaje del Eje Cafetero. Ya aparece marcado en el calendario.`,
        card: (
          <button
            onClick={() => navigate("/calendar")}
            className="w-full md:w-auto bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
          >
            Ver Calendario
          </button>
        ),
      },
    ]);

    setSavingHotel(false);
    pendingChatActionRef.current = false;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { type: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    
    const currentInput = input;
    setInput("");

    // Set up chat history for Groq
    let chatHistory = [
      { 
        role: "system", 
        content: "Eres un asistente de viajes avanzado enfocado en planificar viajes en Colombia. Tu tarea principal es ayudar a los usuarios con sus vuelos y alojamientos. Tienes acceso a herramientas para buscar vuelos en tiempo real usando Duffel (search_flights), alojamientos reales en Airbnb (search_airbnb_prices) y modificar viajes existentes en la base de datos Supabase (update_trip_in_supabase). Cuando el usuario te pida ir a un destino en Colombia con fechas específicas, debes buscar tanto vuelos como alojamientos (Airbnb) llamando a ambas herramientas. Si el usuario no te da una ciudad de origen para los vuelos, asume Bogotá (BOG) como origen predeterminado. Siempre asume el año 2026 para las fechas de viaje. Presenta un resumen cordial y deja que las tarjetas del sistema rendericen los detalles de vuelos y alojamientos. Responde siempre en español." 
      },
      ...messages.map(m => ({ role: m.type === "ai" ? "assistant" : "user", content: m.content || "" })),
      { role: "user", content: currentInput }
    ];

    setMessages(prev => [...prev, { type: "ai", content: "Pensando..." }]);

    const runChatLoop = async (history: any[]) => {
      try {
        const res = await fetch(AGENT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history })
        });
        const msg = await res.json();
        
        if (msg.tool_calls) {
           let newHistory = [...history, msg];
           
           const pendingOutputs: { role: string, tool_call_id: string, name: string, content: string }[] = [];
           const newAiMessages: ChatMessageItem[] = [];

           // Let user know we are searching
           setMessages(prev => [
             ...prev.filter(p => p.content !== "Pensando..." && p.content !== "Procesando opciones..." && p.content !== "Procesando respuesta final..."),
             { type: "ai", content: "Buscando información de vuelos y alojamientos..." }
           ]);

           for (const tool of msg.tool_calls) {
              const name = tool.function.name;
              const args = JSON.parse(tool.function.arguments);
              
              if (name === "search_flights") {
                 try {
                   const flightsRes = await fetch(buildApiUrl('/api/flights/search'), {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                       origin_iata: args.origin_iata,
                       destination_iata: args.destination_iata,
                       departure_date: args.departure_date,
                       return_date: args.return_date,
                       adults: args.adults
                     })
                   });
                   const flightsData = await flightsRes.json();
                   const results = flightsData.searchResults || [];
                   
                   pendingOutputs.push({
                     role: "tool",
                     tool_call_id: tool.id,
                     name: name,
                     content: JSON.stringify(results)
                   });

                   if (results.length > 0) {
                     const cardNode = (
                       <div className="space-y-4 max-w-xl">
                         {results.map((option: any) => (
                           <div key={option.label} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white space-y-3 shadow-xl">
                             <div className="flex items-center justify-between gap-3">
                               <h4 className="font-semibold text-sm uppercase tracking-wide text-cyan-300">{option.label}</h4>
                               <span className="text-xs text-gray-300 font-mono">{option.budget}</span>
                             </div>
                             {option.flights.map((flight: any, fIdx: number) => (
                               <div key={`${option.label}-${fIdx}`} className="rounded-xl bg-white/10 p-3 flex items-start gap-3 border border-white/5">
                                 <Plane className="w-4 h-4 mt-0.5 text-cyan-300" />
                                 <div className="flex-1">
                                   <p className="text-sm font-medium">{flight.route}</p>
                                   <p className="text-xs text-gray-300 mt-0.5">
                                     {flight.date} • {flight.airline} • {flight.time}
                                   </p>
                                 </div>
                               </div>
                             ))}
                             <button
                               onClick={() =>
                                 saveProposalToItineraries({
                                   destination: `${args.destination_iata} (Duffel)`,
                                   startDate: args.departure_date,
                                   endDate: args.return_date || args.departure_date,
                                   budget: option.budget,
                                   details: {
                                     flights: option.flights,
                                     hotel: null,
                                   },
                                 })
                               }
                               disabled={savingProposal}
                               className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                             >
                               {savingProposal ? "Guardando..." : "Aceptar estos vuelos"}
                             </button>
                           </div>
                         ))}
                       </div>
                     );
                     
                     newAiMessages.push({
                       type: "ai",
                       content: `✈️ Encontré estas opciones de vuelos reales en Duffel para ir a ${args.destination_iata}:`,
                       card: cardNode
                     });
                   } else {
                     newAiMessages.push({
                       type: "ai",
                       content: `✈️ No encontré vuelos disponibles de ${args.origin_iata || 'BOG'} a ${args.destination_iata} en las fechas seleccionadas.`
                     });
                   }
                 } catch (fErr) {
                   console.error("Flight search failed:", fErr);
                   pendingOutputs.push({
                     role: "tool",
                     tool_call_id: tool.id,
                     name: name,
                     content: JSON.stringify({ error: String(fErr) })
                   });
                   newAiMessages.push({
                     type: "ai",
                     content: `✈️ Hubo un error al buscar vuelos: ${fErr instanceof Error ? fErr.message : String(fErr)}`
                   });
                 }
              }
              
              else if (name === "search_airbnb_prices") {
                 try {
                   const airbnbRes = await fetch(buildApiUrl('/api/airbnb/search'), {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ location: args.location, checkin: args.checkin, checkout: args.checkout })
                   });
                   const airbnbData = await airbnbRes.json();
                   const results = airbnbData.searchResults?.slice(0, 3) || [];
                   
                   pendingOutputs.push({
                     role: "tool",
                     tool_call_id: tool.id,
                     name: name,
                     content: JSON.stringify(results)
                   });

                   if (results.length > 0) {
                     const cardNode = (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                         {results.map((r: any) => {
                            const airbnbUrl = normalizeAirbnbUrl(r.url, args);
                            const desc = typeof r.demandStayListing?.description === 'string' ? r.demandStayListing.description : "Alojamiento increíble";
                            const loc = typeof r.structuredContent?.primaryLine?.body === 'string' ? r.structuredContent.primaryLine.body : args.location;
                            const priceLabel = r.structuredDisplayPrice?.primaryLine?.accessibilityLabel || r.structuredDisplayPrice?.secondaryLine?.accessibilityLabel || "Ver precio";
                            
                            let priceStr = "$150.000 COP";
                            const match = priceLabel.match(/\$[0-9,.]+/);
                            if (match) {
                              priceStr = match[0];
                            } else {
                              priceStr = priceLabel;
                            }

                            const hotelImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

                            const hotelOption: HotelOption = {
                              name: desc.split(" in ")[0].slice(0, 45),
                              location: loc,
                              rating: 4.8,
                              pricePerNight: priceStr,
                              image: hotelImage,
                              amenities: ["wifi", "breakfast"],
                              highlights: ["Excelente ubicación", "Wifi de alta velocidad", priceLabel]
                            };

                            const tripRequest: ChatChangeRequest = {
                              type: "hotel",
                              tripId: getLastTripId() || "temp_trip",
                              destination: args.location,
                              startDate: args.checkin,
                              endDate: args.checkout
                            };

                            return (
                              <div key={r.id} className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-2 hover:bg-white/10 transition-colors shadow-lg">
                                <HotelCard
                                  name={hotelOption.name}
                                  location={hotelOption.location}
                                  rating={hotelOption.rating}
                                  price={hotelOption.pricePerNight}
                                  image={hotelOption.image}
                                  amenities={hotelOption.amenities}
                                />
                                <div className="flex gap-2 p-1">
                                  <a 
                                    href={airbnbUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="flex-1 text-center bg-white/10 hover:bg-white/15 border border-white/20 text-white py-2 rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Ver en Airbnb
                                  </a>
                                  <button
                                    onClick={() => saveHotelOptionForTrip(tripRequest, hotelOption)}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg text-xs font-medium hover:shadow-lg transition-all"
                                  >
                                    Seleccionar
                                  </button>
                                </div>
                              </div>
                            );
                         })}
                       </div>
                     );
                     
                     newAiMessages.push({
                       type: "ai",
                       content: `🏨 Encontré estos alojamientos recomendados en Airbnb para ${args.location}:`,
                       card: cardNode
                     });
                   } else {
                     newAiMessages.push({
                       type: "ai",
                       content: `🏨 No encontré alojamientos en Airbnb para ${args.location} en las fechas especificadas.`
                     });
                   }
                 } catch (aErr) {
                   console.error("Airbnb search failed:", aErr);
                   pendingOutputs.push({
                     role: "tool",
                     tool_call_id: tool.id,
                     name: name,
                     content: JSON.stringify({ error: String(aErr) })
                   });
                   newAiMessages.push({
                     type: "ai",
                     content: `🏨 Hubo un error al buscar alojamientos: ${aErr instanceof Error ? aErr.message : String(aErr)}`
                   });
                 }
              }
              
              else if (name === "update_trip_in_supabase") {
                 try {
                   const updates: any = {};
                   if (args.destination) updates.destination = args.destination;
                   if (args.start_date) updates.start_date = args.start_date;
                   if (args.end_date) updates.end_date = args.end_date;
                   if (args.budget) updates.budget = args.budget;
                   
                   const { error } = await supabase.from('trips').update(updates).eq('id', args.trip_id);
                   
                   pendingOutputs.push({
                     role: "tool",
                     tool_call_id: tool.id,
                     name: name,
                     content: JSON.stringify({ success: !error, error: error?.message })
                   });
                   
                   newAiMessages.push({
                     type: "ai",
                     content: error 
                       ? `❌ Error al actualizar viaje: ${error.message}`
                       : `✅ ¡Tu viaje ha sido actualizado con éxito!`
                   });
                 } catch (uErr) {
                   console.error("Update trip failed:", uErr);
                   pendingOutputs.push({
                     role: "tool",
                     tool_call_id: tool.id,
                     name: name,
                     content: JSON.stringify({ error: String(uErr) })
                   });
                 }
              }
           }

           newHistory.push(...pendingOutputs);

           setMessages(prev => {
             const filtered = prev.filter(p => p.content !== "Buscando información de vuelos y alojamientos...");
             return [...filtered, ...newAiMessages, { type: "ai", content: "Procesando respuesta final..." }];
           });

           await runChatLoop(newHistory);
        } else if (msg.content) {
           setMessages(prev => {
             const filtered = prev.filter(p => p.content !== "Pensando..." && p.content !== "Procesando opciones..." && p.content !== "Procesando respuesta final...");
             return [...filtered, { type: "ai", content: msg.content }];
           });
        }
      } catch(err) {
        console.error(err);
        setMessages(prev => [...prev.filter(p => p.content !== "Pensando..." && p.content !== "Procesando opciones..." && p.content !== "Procesando respuesta final..."), { type: "ai", content: "Hubo un error al comunicarme con el asistente de inteligencia artificial." }]);
      }
    };
    
    await runChatLoop(chatHistory);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header - Smaller on mobile */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-[8px] md:text-[10px] font-bold">MTA</span>
          </motion.div>
          <div>
            <h2 className="font-semibold text-white text-sm md:text-base">{t('chat.header')}</h2>
            <p className="text-[10px] md:text-xs text-gray-400">{t('chat.subheader')}</p>
          </div>
        </div>
      </div>

      {/* Messages Area - Responsive padding */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            type={message.type}
            content={message.content}
            card={message.card}
          />
        ))}
      </div>

      {/* Input Area - Adjusted for mobile keyboards */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-t border-white/10 bg-slate-900/40 backdrop-blur-xl">
        {/* Suggestions - Horizontal scroll on mobile */}
        <AnimatePresence>
          {messages.length <= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 md:mb-4 flex overflow-x-auto no-scrollbar pb-1 gap-2 mask-linear-right"
            >
              <div className="flex gap-2 min-w-max pr-4">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] md:text-sm font-medium text-white/90 transition-all whitespace-nowrap"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input - More compact on mobile */}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={t('chat.inputPlaceholder')}
            className="w-full pl-4 pr-24 md:pr-28 py-3.5 md:py-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-white text-sm md:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 md:gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Voz"
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 md:p-3 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 rounded-lg md:rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
              aria-label="Enviar"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
