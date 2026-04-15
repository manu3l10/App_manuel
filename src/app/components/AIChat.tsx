import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Mic, Plane } from "lucide-react";
import { useNavigate } from "react-router";
import { ReactNode } from "react";
import { ChatMessage } from "./ChatMessage";
import { useLanguage } from "../../contexts/LanguageContext";
import { ItineraryCard } from "./ItineraryCard";
import { HotelCard } from "./HotelCard";
import { RestaurantCard } from "./RestaurantCard";
import { MapPreview } from "./MapPreview";
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

export function AIChat() {
  const navigate = useNavigate();
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

  const suggestions = [
    t('chat.suggestion1'),
    t('chat.suggestion2'),
    t('chat.suggestion3'),
    t('chat.suggestion4'),
  ];

  const ejeCafeteroFlightsPayload: ChatCardPayload = {
    destination: "Eje Cafetero (Salento, Filandia y Pereira)",
    startDate: "2026-05-10",
    endDate: "2026-05-14",
    budget: "$440.000 COP (vuelos base)",
    details: {
      flights: [
        {
          date: "2026-05-10",
          route: "Bogotá (BOG) → Pereira (PEI)",
          airline: "LATAM",
          time: "07:20 - 08:18",
          price: "$210.000 COP",
        },
        {
          date: "2026-05-14",
          route: "Pereira (PEI) → Bogotá (BOG)",
          airline: "Avianca",
          time: "18:45 - 19:40",
          price: "$230.000 COP",
        },
      ],
      hotel: null,
    },
  };

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

  const saveProposalToItineraries = async (payload: ChatCardPayload) => {
    if (savingProposal) return;
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
      return;
    }

    saveItineraryDetails(insertedTrip.id, payload.details);
    setLastTripId(insertedTrip.id);

    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: "Listo. Guardé los vuelos en Mis itinerarios y ya quedaron marcados en el calendario por fecha.",
        card: (
          <div className="space-y-3">
            <button
              onClick={() => navigate("/calendar")}
              className="w-full md:w-auto bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
            >
              Ver Calendario
            </button>
            <p className="text-xs text-gray-300">
              Cuando quieras, seguimos con la segunda parte: selección y confirmación del hotel.
            </p>
          </div>
        ),
      },
    ]);

    setSavingProposal(false);
  };

  const saveHotelForLatestEjeTrip = async (option: HotelOption) => {
    if (savingHotel) return;
    setSavingHotel(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessages((prev) => [
        ...prev,
        { type: "ai", content: "Para guardar el hotel, primero debes iniciar sesión." },
      ]);
      setSavingHotel(false);
      return;
    }

    const lastTripId = getLastTripId();
    let targetTrip: any = null;

    if (lastTripId) {
      const { data: byIdTrip } = await supabase
        .from("trips")
        .select("id, destination, start_date, end_date")
        .eq("id", lastTripId)
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
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { type: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const lowerInput = input.toLowerCase();
      const isEjePrompt = lowerInput.includes("eje cafetero") || lowerInput.includes("salento") || lowerInput.includes("cafetero");
      const isHotelPrompt =
        lowerInput.includes("hotel") ||
        lowerInput.includes("hote") ||
        lowerInput.includes("hosped") ||
        lowerInput.includes("quedar");
      let aiResponse: any = {
        type: "ai",
        content: t('chat.aiResponsePrefix'),
      };

      if (lowerInput.includes("cartagena")) {
        aiResponse.card = (
          <div className="space-y-4">
            <ItineraryCard
              destination="Cartagena de Indias"
              duration="3 días"
              budget="$800.000 - $1.200.000 COP"
              days={[
                {
                  day: 1,
                  title: "Ciudad Amurallada y Getsemaní",
                  time: "Todo el día",
                  activities: [
                    "Caminata por el Centro Histórico",
                    "Atardecer en las Murallas (Café del Mar)",
                    "Cena en el barrio Getsemaní",
                  ],
                },
                {
                  day: 2,
                  title: "Islas del Rosario",
                  time: "8:00 - 16:00",
                  activities: [
                    "Tour en lancha a las islas",
                    "Snorkeling en aguas cristalinas",
                    "Almuerzo típico caribeño",
                  ],
                },
                {
                  day: 3,
                  title: "Castillo San Felipe y Popa",
                  time: "9:00 - 13:00",
                  activities: [
                    "Visita al Castillo de San Felipe",
                    "Vista panorámica desde el Convento de la Popa",
                  ],
                },
              ]}
            />
            <MapPreview location="Cartagena, Colombia" coordinates="10.3910° N, 75.4794° W" />
          </div>
        );
      } else if (lowerInput.includes("medellín") || lowerInput.includes("medellin")) {
        aiResponse.card = (
          <div className="space-y-4">
            <ItineraryCard
              destination="Medellín y Guatapé"
              duration="4 días"
              budget="$700.000 - $1.100.000 COP"
              days={[
                {
                  day: 1,
                  title: "Transformación Social",
                  time: "Tarde",
                  activities: ["Tour Comuna 13", "Metrocable", "Plaza Botero"],
                },
                {
                  day: 2,
                  title: "Pueblo de Zócalos",
                  time: "Todo el día",
                  activities: ["Piedra del Peñol (740 escalones)", "Pueblo de Guatapé", "Paseo en lancha"],
                },
              ]}
            />
          </div>
        );
      } else if (isHotelPrompt) {
        aiResponse.content =
          "Excelente. Aquí tienes 2 opciones bien rankeadas para hospedarte en el Eje Cafetero. Elige una y la guardo en tu calendario.";
        aiResponse.card = (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ejeCafeteroHotelOptions.map((option) => (
                <div key={option.name} className="space-y-3">
                  <HotelCard
                    name={option.name}
                    location={option.location}
                    rating={option.rating}
                    price={option.pricePerNight}
                    image={option.image}
                    amenities={option.amenities}
                  />
                  <div className="bg-white/10 rounded-xl border border-white/20 p-3 text-xs text-gray-200 space-y-1">
                    {option.highlights.map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </div>
                  <button
                    onClick={() => saveHotelForLatestEjeTrip(option)}
                    disabled={savingHotel}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingHotel ? "Guardando hotel..." : `Seleccionar ${option.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      } else if (isEjePrompt) {
        aiResponse.content =
          "Perfecto. Empezamos por partes: primero te muestro vuelos sugeridos para Eje Cafetero. Si aceptas, ahí mismo los guardo en Mis itinerarios.";
        aiResponse.card = (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-cyan-300">
                Vuelos sugeridos (Parte 1)
              </h4>
              {ejeCafeteroFlightsPayload.details.flights.map((flight) => (
                <div key={`${flight.date}-${flight.route}`} className="rounded-xl bg-white/10 p-3 flex items-start gap-3">
                  <Plane className="w-4 h-4 mt-0.5 text-cyan-300" />
                  <div>
                    <p className="text-sm font-medium">{flight.route}</p>
                    <p className="text-xs text-gray-300">
                      {flight.date} • {flight.airline} • {flight.time} • {flight.price}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-white/10">
                <button
                  onClick={() => saveProposalToItineraries(ejeCafeteroFlightsPayload)}
                  disabled={savingProposal}
                  className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingProposal ? "Guardando..." : "Aceptar vuelos y guardar en Mis itinerarios"}
                </button>
                <p className="text-xs text-gray-300 mt-2">
                  Solo se guardará cuando presiones Aceptar.
                </p>
              </div>
            </div>
          </div>
        );
      } else {
        aiResponse.content = "Si quieres, te armo un viaje completo al Eje Cafetero con vuelos y hotel para guardarlo directo en Mis itinerarios.";
        aiResponse.card = (
          <ItineraryCard
            destination="Eje Cafetero"
            duration="4 días"
            budget="$600.000 - $1.000.000 COP"
            days={[
              {
                day: 1,
                title: "Valle de Cocora",
                time: "Todo el día",
                activities: ["Caminata entre Palmas de Cera", "Salento (Calle Real)", "Miradores"],
              },
              {
                day: 2,
                title: "Cultura Cafetera",
                time: "9:00 - 17:00",
                activities: ["Tour en finca cafetera", "Proceso del café", "Cata de café especial"],
              },
            ]}
          />
        );
      }
      setMessages((prev) => [...prev, aiResponse]);

      if (!(isEjePrompt || isHotelPrompt)) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: "Aquí tienes algunas opciones recomendadas de alojamiento y gastronomía en la zona:",
              card: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <HotelCard
                    name="Casa San Agustín"
                    location="Centro Histórico"
                    rating={4.9}
                    price="$850.000"
                    image="https://images.unsplash.com/photo-1578683010236-d716f9a3f461?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb218ZW58MXx8fHwxNzczNzIxNzU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    amenities={["wifi", "breakfast", "pool"]}
                  />
                  <RestaurantCard
                    name="Carmen Restaurant"
                    cuisine="Contemporánea Colombiana"
                    location="El Poblado / Cartagena"
                    rating={4.8}
                    hours="12:00 - 23:00"
                    image="https://images.unsplash.com/photo-1717158776685-d4b7c346e1a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwZm9vZCUyMHBsYXR0ZXJ8ZW58MXx8fHwxNzczNjg1NDc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  />
                </div>
              ),
            },
          ]);
        }, 1000);
      }
    }, 1000);

    setInput("");
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
