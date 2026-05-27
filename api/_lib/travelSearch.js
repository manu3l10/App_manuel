import { handleAirbnbSearch } from "../../mcp-server-airbnb/dist/index.js";

export async function handleDuffelSearch({ origin_iata, destination_iata, departure_date, return_date, adults }) {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    throw new Error("Duffel API key is not configured");
  }

  const origin = origin_iata || "BOG";
  const slices = [
    {
      origin,
      destination: destination_iata,
      departure_date,
    },
  ];

  if (return_date) {
    slices.push({
      origin: destination_iata,
      destination: origin,
      departure_date: return_date,
    });
  }

  const response = await fetch("https://api.duffel.com/air/offer_requests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        slices,
        passengers: Array.from({ length: adults || 1 }, () => ({ type: "adult" })),
        cabin_class: "economy",
      },
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.errors?.[0]?.message || "Failed to fetch from Duffel API");
  }

  const offers = json.data?.offers || [];
  return offers
    .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
    .slice(0, 3)
    .map((offer, index) => {
      const label = index === 0 ? "Opcion Economica" : index === 1 ? "Opcion Rapida" : "Opcion Recomendada";
      const flights = offer.slices.map((slice) => {
        const firstSeg = slice.segments[0];
        const lastSeg = slice.segments[slice.segments.length - 1];

        return {
          date: firstSeg.departing_at.slice(0, 10),
          route: `${firstSeg.origin.iata_code} -> ${lastSeg.destination.iata_code}`,
          airline: firstSeg.operating_carrier?.name || offer.owner.name,
          time: `${firstSeg.departing_at.slice(11, 16)} - ${lastSeg.arriving_at.slice(11, 16)}`,
          price: `${offer.total_amount} ${offer.total_currency}`,
        };
      });

      return {
        id: offer.id || `${destination_iata}-${index + 1}`,
        owner: offer.owner?.name || label,
        totalAmount: offer.total_amount,
        totalCurrency: offer.total_currency,
        budget: `${offer.total_amount} ${offer.total_currency}`,
        flights,
      };
    });
}

export async function handleAirbnbPriceSearch({ location, checkin, checkout, adults }) {
  const result = await handleAirbnbSearch({
    location,
    checkin,
    checkout,
    adults: adults || 1,
    ignoreRobotsText: true,
  });

  if (result.isError) {
    const parsedError = JSON.parse(result.content?.[0]?.text || "{}");
    throw new Error(parsedError?.error || "Airbnb search failed");
  }

  return JSON.parse(result.content?.[0]?.text || "[]");
}

