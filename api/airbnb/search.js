import { handleAirbnbSearch } from "../../mcp-server-airbnb/dist/index.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { location, checkin, checkout, adults } = req.body || {};
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    const result = await handleAirbnbSearch({
      location,
      checkin,
      checkout,
      adults: adults || 1,
      ignoreRobotsText: true,
    });

    if (result.isError) {
      return res.status(500).json({ error: JSON.parse(result.content[0].text) });
    }

    return res.status(200).json(JSON.parse(result.content[0].text));
  } catch (error) {
    console.error("Error in /api/airbnb/search:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
