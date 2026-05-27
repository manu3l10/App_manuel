import express from "express";
import cors from "cors";
import "dotenv/config";
import { runTravelAgent } from "./api/_lib/travelAgent.js";
import { handleAirbnbPriceSearch, handleDuffelSearch } from "./api/_lib/travelSearch.js";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, accessToken } = req.body || {};
    const response = await runTravelAgent({ messages, accessToken });
    res.json(response);
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/flights/search", async (req, res) => {
  try {
    const { origin_iata, destination_iata, departure_date, return_date, adults } = req.body || {};

    if (!destination_iata || !departure_date) {
      return res.status(400).json({ error: "destination_iata and departure_date are required" });
    }

    const results = await handleDuffelSearch({
      origin_iata,
      destination_iata,
      departure_date,
      return_date,
      adults,
    });

    return res.json({ searchResults: results });
  } catch (error) {
    console.error("Error in /api/flights/search:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/airbnb/search", async (req, res) => {
  try {
    const { location, checkin, checkout, adults } = req.body || {};

    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    const result = await handleAirbnbPriceSearch({
      location,
      checkin,
      checkout,
      adults,
    });

    return res.json(result);
  } catch (error) {
    console.error("Error in /api/airbnb/search:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Backend API corriendo en http://localhost:${port}`);
});
