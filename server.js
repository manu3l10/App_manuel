import express from 'express';
import cors from 'cors';
import { handleAirbnbSearch } from './mcp-server-airbnb/dist/index.js';
import { Groq } from 'groq-sdk';
import 'dotenv/config';

const app = express();
const port = 3001; // Express server on port 3001, Vite usually on 5173

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

// Duffel flight search helper
async function handleDuffelSearch({ origin_iata, destination_iata, departure_date, return_date, adults }) {
  const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY;
  if (!DUFFEL_API_KEY) {
    throw new Error("Duffel API key is not configured in .env");
  }

  const slices = [
    {
      origin: origin_iata || "BOG",
      destination: destination_iata,
      departure_date: departure_date
    }
  ];

  if (return_date) {
    slices.push({
      origin: destination_iata,
      destination: origin_iata || "BOG",
      departure_date: return_date
    });
  }

  const response = await fetch("https://api.duffel.com/air/offer_requests", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DUFFEL_API_KEY}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: {
        slices: slices,
        passengers: Array.from({ length: adults || 1 }, () => ({ type: "adult" })),
        cabin_class: "economy"
      }
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.errors?.[0]?.message || "Failed to fetch from Duffel API");
  }

  const offers = json.data?.offers || [];
  
  // Sort offers by total_amount ascending (cheapest first)
  const sortedOffers = offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
  
  // Take top 3 offers
  const topOffers = sortedOffers.slice(0, 3).map((offer, index) => {
    const label = index === 0 ? "Opción Económica" : index === 1 ? "Opción Rápida" : "Opción Recomendada";
    const flights = offer.slices.map(slice => {
      const firstSeg = slice.segments[0];
      const lastSeg = slice.segments[slice.segments.length - 1];
      return {
        date: firstSeg.departing_at.slice(0, 10),
        route: `${firstSeg.origin.iata_code} → ${lastSeg.destination.iata_code}`,
        airline: firstSeg.operating_carrier?.name || offer.owner.name,
        time: `${firstSeg.departing_at.slice(11, 16)} - ${lastSeg.arriving_at.slice(11, 16)}`,
        price: `${offer.total_amount} ${offer.total_currency}`
      };
    });

    return {
      label,
      budget: `${offer.total_amount} ${offer.total_currency}`,
      flights
    };
  });

  return topOffers;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      tools: [
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
                  description: "Código IATA de origen de 3 letras (ej. 'BOG', 'MDE', 'CLO'). Por defecto 'BOG' si no se especifica." 
                },
                destination_iata: { 
                  type: "string", 
                  description: "Código IATA de destino de 3 letras (ej. 'CTG', 'SMR', 'ADZ', 'PEI')." 
                },
                departure_date: { 
                  type: "string", 
                  description: "Fecha de salida (ida) en formato YYYY-MM-DD" 
                },
                return_date: { 
                  type: "string", 
                  description: "Fecha de regreso (vuelta) en formato YYYY-MM-DD (opcional)" 
                },
                adults: { 
                  type: "number", 
                  description: "Número de adultos (por defecto 1)" 
                }
              },
              required: ["destination_iata", "departure_date"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "search_airbnb_prices",
            description: "Busca precios de alojamiento en Airbnb para un destino y fechas específicas.",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string", description: "El destino (ej. 'Madrid', 'Eje Cafetero', 'Cartagena')" },
                checkin: { type: "string", description: "Fecha de check-in en formato YYYY-MM-DD" },
                checkout: { type: "string", description: "Fecha de check-out en formato YYYY-MM-DD" }
              },
              required: ["location", "checkin", "checkout"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_trip_in_supabase",
            description: "Modifica un viaje existente en la base de datos Supabase y actualiza los detalles del itinerario.",
            parameters: {
              type: "object",
              properties: {
                trip_id: { type: "string", description: "El ID del viaje que se va a modificar" },
                destination: { type: "string", description: "El nuevo destino del viaje" },
                start_date: { type: "string", description: "La nueva fecha de inicio (YYYY-MM-DD)" },
                end_date: { type: "string", description: "La nueva fecha de fin (YYYY-MM-DD)" },
                budget: { type: "string", description: "El nuevo presupuesto estimado (opcional)" }
              },
              required: ["trip_id"]
            }
          }
        }
      ],
      tool_choice: "auto",
    });

    res.json(completion.choices[0].message);
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to search flights via Duffel API
app.post('/api/flights/search', async (req, res) => {
  try {
    const { origin_iata, destination_iata, departure_date, return_date, adults } = req.body;
    
    if (!destination_iata || !departure_date) {
      return res.status(400).json({ error: 'destination_iata and departure_date are required' });
    }

    console.log(`Buscando vuelos de ${origin_iata || 'BOG'} a ${destination_iata} para el ${departure_date}${return_date ? ` al ${return_date}` : ''}`);
    
    const results = await handleDuffelSearch({
      origin_iata: origin_iata || 'BOG',
      destination_iata,
      departure_date,
      return_date,
      adults: adults || 1
    });

    res.json({ searchResults: results });
  } catch (error) {
    console.error('Error in /api/flights/search:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Simple endpoint to test the Airbnb search
app.post('/api/airbnb/search', async (req, res) => {
  try {
    const { location, checkin, checkout, adults } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    console.log(`Buscando en Airbnb para: ${location}, desde ${checkin} hasta ${checkout}`);
    
    // Call the function directly from the MCP server code
    const result = await handleAirbnbSearch({
      location,
      checkin,
      checkout,
      adults: adults || 1,
      ignoreRobotsText: true
    });

    if (result.isError) {
      return res.status(500).json({ error: JSON.parse(result.content[0].text) });
    }

    res.json(JSON.parse(result.content[0].text));
  } catch (error) {
    console.error('Error in /api/airbnb/search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Backend API corriendo en http://localhost:${port}`);
});
