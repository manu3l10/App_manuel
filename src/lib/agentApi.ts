export type AgentFlightSegment = {
  date: string;
  route: string;
  airline: string;
  time: string;
  price: string;
};

export type AgentFlightOffer = {
  id: string;
  owner: string;
  totalAmount: string;
  totalCurrency: string;
  budget: string;
  destination: string;
  flights: AgentFlightSegment[];
  details: {
    destination: string;
    startDate: string;
    endDate: string;
    budget: string;
    details: {
      flights: AgentFlightSegment[];
      hotel: null;
    };
  };
};

export type AgentHotelResult = {
  name: string;
  location: string;
  rating: number;
  pricePerNight: string;
  image: string;
  amenities: string[];
  highlights: string[];
  link?: string;
  checkIn?: string;
  checkOut?: string;
};

export type AgentChatResponse = {
  reply: string;
  intent?: {
    requestType?: string;
  };
  data?: {
    flights?: AgentFlightOffer[];
    hotels?: AgentHotelResult[];
    actions?: AgentAction[];
    trips?: AgentTrip[];
    flightError?: string | null;
    hotelError?: string | null;
  };
  error?: string;
};

export type AgentTrip = {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget?: string | null;
};

export type AgentAction =
  | {
      type: "trip_cancelled";
      tripId: string;
    }
  | {
      type: "trip_updated";
      trip: AgentTrip;
    };

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL?.trim() || "/api/chat";
const AGENT_TIMEOUT_MS = 25000;

export async function sendAgentChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options?: { accessToken?: string | null }
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(AGENT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, accessToken: options?.accessToken ?? null }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("El agente tardó demasiado en responder. Intenta de nuevo.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const data = (await response.json()) as AgentChatResponse;
  if (!response.ok) {
    throw new Error(data.error || "No pude contactar el agente.");
  }

  return data;
}
