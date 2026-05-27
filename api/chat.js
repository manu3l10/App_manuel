import { runTravelAgent } from "./_lib/travelAgent.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, accessToken } = req.body || {};
    const response = await runTravelAgent({ messages, accessToken });
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
