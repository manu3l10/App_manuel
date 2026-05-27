import { Groq } from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { handleAirbnbPriceSearch, handleDuffelSearch } from "./travelSearch.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL_NAME = "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS = 4;

const tools = [
  {
    type: "function",
    function: {
      name: "list_user_trips",
      description: "Lista los viajes planeados del usuario autenticado para poder modificarlos o cancelarlos.",
      parameters: {
        type: "object",
        properties: {
          destination_query: {
            type: "string",
            description: "Filtro opcional por ciudad o destino. Ejemplo: Bogota.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_trip",
      description: "Cancela un viaje existente del usuario autenticado eliminandolo del calendario y sus itinerarios.",
      parameters: {
        type: "object",
        properties: {
          trip_id: {
            type: "string",
            description: "ID exacto del viaje que se quiere cancelar.",
          },
        },
        required: ["trip_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_trip_in_supabase",
      description: "Modifica un viaje existente del usuario autenticado.",
      parameters: {
        type: "object",
        properties: {
          trip_id: { type: "string", description: "ID del viaje" },
          destination: { type: "string", description: "Nuevo destino" },
          start_date: { type: "string", description: "Nueva fecha de inicio YYYY-MM-DD" },
          end_date: { type: "string", description: "Nueva fecha de fin YYYY-MM-DD" },
          budget: { type: "string", description: "Nuevo presupuesto" },
        },
        required: ["trip_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_flights",
      description: "Busca vuelos cuando ya se conocen destino y fechas.",
      parameters: {
        type: "object",
        properties: {
          origin_iata: {
            type: "string",
            description: "Codigo IATA de origen. Si no se especifica, usar BOG.",
          },
          destination_iata: {
            type: "string",
            description: "Codigo IATA de destino.",
          },
          destination_label: {
            type: "string",
            description: "Nombre del destino para mostrar al usuario.",
          },
          departure_date: {
            type: "string",
            description: "Fecha de ida en formato YYYY-MM-DD.",
          },
          return_date: {
            type: "string",
            description: "Fecha de regreso en formato YYYY-MM-DD.",
          },
          adults: {
            type: "number",
            description: "Numero de adultos.",
          },
        },
        required: ["destination_iata", "departure_date", "return_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_airbnb_prices",
      description: "Busca alojamientos cuando ya se conocen destino y fechas.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Destino, ciudad o zona." },
          checkin: { type: "string", description: "Fecha de check-in en formato YYYY-MM-DD." },
          checkout: { type: "string", description: "Fecha de check-out en formato YYYY-MM-DD." },
          adults: { type: "number", description: "Numero de adultos." },
        },
        required: ["location", "checkin", "checkout"],
      },
    },
  },
];

function buildSystemPrompt({ userProfile, tripSummary }) {
  const profileLines = userProfile
    ? [
        `Nombre: ${userProfile.fullName || "No disponible"}`,
        `Email: ${userProfile.email || "No disponible"}`,
        `Bio: ${userProfile.bio || "No disponible"}`,
      ]
    : ["Usuario no autenticado o sin perfil disponible."];

  return [
    "Eres el agente de My Travel Assistance.",
    "Objetivo: ayudar a planear, consultar, modificar o cancelar viajes del usuario paso a paso.",
    "Reglas obligatorias:",
    "- Responde en espanol claro y breve.",
    "- Haz una sola pregunta de aclaracion por turno cuando falte informacion importante.",
    "- Nunca ofrezcas vuelos ni hoteles sin fechas confirmadas.",
    "- Si el usuario pide modificar un viaje pero no dice que quiere modificar, pregunta primero: que deseas modificar.",
    "- Si el usuario pide cancelar o modificar un viaje existente, primero revisa los viajes planeados con list_user_trips antes de asumir.",
    "- Si hay varios viajes parecidos, pide confirmacion del viaje exacto antes de editar o cancelar.",
    "- Si ya tienes todo para ejecutar una accion, usa la herramienta correspondiente y luego confirma el resultado.",
    "- Cuando el usuario hable de sus viajes planeados, usa el contexto real de sus viajes; no inventes reservas.",
    "- Mantén un tono personal y coherente con el perfil del usuario cuando exista contexto.",
    "",
    "Perfil del usuario:",
    ...profileLines,
    "",
    "Resumen actual de viajes planeados:",
    tripSummary || "No hay viajes planeados registrados.",
  ].join("\n");
}

function formatTripForPrompt(trip) {
  return `- ID ${trip.id}: ${trip.destination} del ${trip.start_date} al ${trip.end_date} (presupuesto: ${trip.budget || "sin definir"})`;
}

function normalizeTripRecord(record) {
  return {
    id: String(record.id),
    destination: record.destination,
    start_date: record.start_date,
    end_date: record.end_date,
    budget: record.budget,
  };
}

function toToolResultContent(payload) {
  return JSON.stringify(payload);
}

function buildFlightData(args, offers) {
  const destination = args.destination_label || args.destination_iata;
  return offers.map((offer) => ({
    ...offer,
    destination,
    details: {
      destination,
      startDate: args.departure_date,
      endDate: args.return_date,
      budget: offer.budget,
      details: {
        flights: offer.flights,
        hotel: null,
      },
    },
  }));
}

function pickImage(result) {
  return (
    result?.image ||
    result?.images?.[0] ||
    result?.thumbnail ||
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
  );
}

function toPriceString(result) {
  return (
    result?.price?.displayPrice ||
    result?.price?.priceString ||
    result?.structuredDisplayPrice?.primaryLine?.price ||
    result?.structuredDisplayPrice?.primaryLine?.discountedPrice ||
    result?.pricingQuote?.structuredStayDisplayPrice?.primaryLine?.price ||
    result?.price ||
    "Precio no disponible"
  );
}

function toHighlights(result) {
  const items = [];
  if (Array.isArray(result?.structuredContent?.primaryLine)) {
    items.push(...result.structuredContent.primaryLine);
  }
  if (Array.isArray(result?.highlights)) {
    items.push(...result.highlights.map((item) => item?.title || item).filter(Boolean));
  }
  if (result?.roomType) items.push(result.roomType);
  if (result?.neighborhood) items.push(result.neighborhood);
  return items.slice(0, 4);
}

function normalizeHotelResults(rawResults, args) {
  const list = Array.isArray(rawResults)
    ? rawResults
    : Array.isArray(rawResults?.searchResults)
      ? rawResults.searchResults
      : Array.isArray(rawResults?.results)
        ? rawResults.results
        : Array.isArray(rawResults?.listings)
          ? rawResults.listings
          : [];

  return list.slice(0, 6).map((result, index) => ({
    name: result?.name || result?.title || `Alojamiento ${index + 1}`,
    location: result?.location || result?.city || args.location,
    rating: Number(result?.rating || result?.avgRatingLocalized || result?.avgRatingA11yLabel || 4.5) || 4.5,
    pricePerNight: toPriceString(result),
    image: pickImage(result),
    amenities: Array.isArray(result?.amenities) ? result.amenities.slice(0, 5) : [],
    highlights: toHighlights(result),
    link: result?.url || result?.listingUrl || result?.link,
    checkIn: args.checkin,
    checkOut: args.checkout,
  }));
}

function buildSupabaseClient(accessToken) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing for the agent.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

async function loadUserContext(accessToken) {
  if (!accessToken) {
    return {
      supabase: null,
      user: null,
      profile: null,
      trips: [],
    };
  }

  const supabase = buildSupabaseClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("No pude validar la sesion del usuario para operar viajes.");
  }

  const { data: trips, error: tripsError } = await supabase
    .from("trips")
    .select("id, destination, start_date, end_date, budget, created_at")
    .eq("user_id", user.id)
    .order("start_date", { ascending: true });

  if (tripsError) {
    throw new Error(tripsError.message || "No pude consultar los viajes del usuario.");
  }

  return {
    supabase,
    user,
    profile: {
      fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
      bio: user.user_metadata?.bio || "",
      email: user.email || "",
    },
    trips: (trips || []).map(normalizeTripRecord),
  };
}

function filterTrips(trips, destinationQuery) {
  if (!destinationQuery) return trips;
  const normalizedQuery = destinationQuery.toLowerCase();
  return trips.filter((trip) => trip.destination?.toLowerCase().includes(normalizedQuery));
}

async function executeTool({ toolCall, runtime }) {
  const args = JSON.parse(toolCall.function.arguments || "{}");
  const toolName = toolCall.function.name;

  switch (toolName) {
    case "list_user_trips": {
      const filteredTrips = filterTrips(runtime.trips, args.destination_query);
      return {
        toolResult: {
          trips: filteredTrips,
          count: filteredTrips.length,
        },
      };
    }

    case "cancel_trip": {
      if (!runtime.supabase || !runtime.user) {
        throw new Error("Debes iniciar sesion para cancelar viajes.");
      }

      const { data: deletedRows, error } = await runtime.supabase
        .from("trips")
        .delete()
        .eq("id", args.trip_id)
        .eq("user_id", runtime.user.id)
        .select("id, destination, start_date, end_date, budget");

      if (error) throw new Error(error.message || "No pude cancelar el viaje.");
      if (!deletedRows?.length) {
        throw new Error("No encontre ese viaje para cancelarlo.");
      }

      runtime.trips = runtime.trips.filter((trip) => trip.id !== String(args.trip_id));
      const deletedTrip = normalizeTripRecord(deletedRows[0]);
      runtime.actions.push({ type: "trip_cancelled", tripId: deletedTrip.id });
      return {
        toolResult: {
          cancelled: true,
          trip: deletedTrip,
        },
      };
    }

    case "update_trip_in_supabase": {
      if (!runtime.supabase || !runtime.user) {
        throw new Error("Debes iniciar sesion para modificar viajes.");
      }

      if (args.start_date && args.end_date && args.end_date <= args.start_date) {
        throw new Error("La fecha de regreso debe ser posterior a la fecha de ida.");
      }

      const updates = {};
      if (args.destination) updates.destination = args.destination;
      if (args.start_date) updates.start_date = args.start_date;
      if (args.end_date) updates.end_date = args.end_date;
      if (args.budget) updates.budget = args.budget;

      if (!Object.keys(updates).length) {
        throw new Error("No recibí cambios concretos para aplicar al viaje.");
      }

      const { data: updatedRows, error } = await runtime.supabase
        .from("trips")
        .update(updates)
        .eq("id", args.trip_id)
        .eq("user_id", runtime.user.id)
        .select("id, destination, start_date, end_date, budget")
        .single();

      if (error || !updatedRows) {
        throw new Error(error?.message || "No pude actualizar el viaje.");
      }

      const updatedTrip = normalizeTripRecord(updatedRows);
      runtime.trips = runtime.trips.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip));
      runtime.actions.push({ type: "trip_updated", trip: updatedTrip });
      return {
        toolResult: {
          updated: true,
          trip: updatedTrip,
        },
      };
    }

    case "search_flights": {
      const offers = await handleDuffelSearch(args);
      const flights = buildFlightData(args, offers);
      runtime.data.flights = flights;
      return {
        toolResult: {
          flights,
          count: flights.length,
        },
      };
    }

    case "search_airbnb_prices": {
      const rawHotels = await handleAirbnbPriceSearch(args);
      const hotels = normalizeHotelResults(rawHotels, args);
      runtime.data.hotels = hotels;
      return {
        toolResult: {
          hotels,
          count: hotels.length,
        },
      };
    }

    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
}

function toGroqMessages(systemPrompt, messages) {
  return [
    {
      role: "system",
      content: systemPrompt,
    },
    ...messages,
  ];
}

export async function runTravelAgent({ messages, accessToken }) {
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error("Messages are required");
  }

  const userContext = await loadUserContext(accessToken);
  const runtime = {
    ...userContext,
    actions: [],
    data: {},
  };

  const systemPrompt = buildSystemPrompt({
    userProfile: userContext.profile,
    tripSummary: userContext.trips.map(formatTripForPrompt).join("\n"),
  });

  const conversation = toGroqMessages(systemPrompt, messages);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      messages: conversation,
      tools,
      tool_choice: "auto",
    });

    const assistantMessage = completion.choices[0]?.message;
    if (!assistantMessage) {
      throw new Error("El agente no devolvio una respuesta.");
    }

    const toolCalls = assistantMessage.tool_calls || [];
    if (!toolCalls.length) {
      return {
        reply: assistantMessage.content || "No tuve nada nuevo que agregar.",
        data: {
          ...runtime.data,
          actions: runtime.actions,
          trips: runtime.trips,
        },
      };
    }

    conversation.push({
      role: "assistant",
      content: assistantMessage.content || "",
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      const { toolResult } = await executeTool({ toolCall, runtime });
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toToolResultContent(toolResult),
      });
    }
  }

  throw new Error("El agente excedio el numero de pasos permitidos.");
}
