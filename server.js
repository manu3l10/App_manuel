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
            name: "search_airbnb_prices",
            description: "Busca precios de alojamiento en Airbnb para un destino y fechas específicas.",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string", description: "El destino (ej. 'Madrid', 'Eje Cafetero')" },
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

// Simple endpoint to test the search
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
