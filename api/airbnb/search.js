import { handleAirbnbPriceSearch } from "../_lib/travelSearch.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in /api/airbnb/search:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
