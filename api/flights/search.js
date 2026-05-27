import { handleDuffelSearch } from "../_lib/travelSearch.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    return res.status(200).json({ searchResults: results });
  } catch (error) {
    console.error("Error in /api/flights/search:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
