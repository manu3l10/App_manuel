import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const tools = [
  {
    type: "function",
    function: {
      name: "search_flights",
      description: "Busca precios de vuelos usando la API de Duffel para rutas en Colombia.",
      parameters: {
        type: "object",
        properties: {
          origin_iata: {
            type: "string",
            description: "Codigo IATA de origen de 3 letras. Por defecto BOG si no se especifica.",
          },
          destination_iata: {
            type: "string",
            description: "Codigo IATA de destino de 3 letras.",
          },
          departure_date: {
            type: "string",
            description: "Fecha de salida en formato YYYY-MM-DD",
          },
          return_date: {
            type: "string",
            description: "Fecha de regreso en formato YYYY-MM-DD",
          },
          adults: {
            type: "number",
            description: "Numero de adultos",
          },
        },
        required: ["destination_iata", "departure_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_airbnb_prices",
      description: "Busca precios de alojamiento en Airbnb para un destino y fechas especificas.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Destino, ciudad o zona." },
          checkin: { type: "string", description: "Fecha de check-in en formato YYYY-MM-DD" },
          checkout: { type: "string", description: "Fecha de check-out en formato YYYY-MM-DD" },
        },
        required: ["location", "checkin", "checkout"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_trip_in_supabase",
      description: "Modifica un viaje existente en Supabase.",
      parameters: {
        type: "object",
        properties: {
          trip_id: { type: "string", description: "ID del viaje" },
          destination: { type: "string", description: "Nuevo destino" },
          start_date: { type: "string", description: "Nueva fecha de inicio YYYY-MM-DD" },
          end_date: { type: "string", description: "Nueva fecha de fin YYYY-MM-DD" },
          budget: { type: "string", description: "Presupuesto estimado" },
        },
        required: ["trip_id"],
      },
    },
  },
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body || {};
    if (!messages) {
      return res.status(400).json({ error: "Messages are required" });
    }

    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      tools,
      tool_choice: "auto",
    });

    return res.status(200).json(completion.choices[0].message);
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
