export interface FlightStatus {
  flightNumber: string;
  airline: string;
  status: "ON_TIME" | "DELAYED" | "LANDED" | "CANCELLED" | "IN_AIR";
  origin: { code: string; city: string };
  destination: { code: string; city: string };
  scheduledArrival: string; // ISO or formatted
  estimatedArrival: string;
  delayMinutes: number;
  terminal: string;
  gate: string;
  baggageClaim: string;
  pickupAdjustmentRecommendedMinutes: number;
}

/**
 * Resolves live or realistic flight tracking data for airport pickups.
 */
export function getFlightStatus(flightNumber: string, scheduledPickupDate?: Date): FlightStatus {
  const cleanNumber = flightNumber.toUpperCase().trim();
  
  // Deterministic calculation based on flight number hash for realistic demo persistence
  let hash = 0;
  for (let i = 0; i < cleanNumber.length; i++) {
    hash = (hash << 5) - hash + cleanNumber.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  
  const isDelayed = absHash % 3 === 0; // 33% chance of delay for realistic testing
  const delayMinutes = isDelayed ? (absHash % 45) + 15 : 0; // 15 to 60 mins delay
  
  const baseTime = scheduledPickupDate || new Date();
  const estimatedTime = new Date(baseTime.getTime() + delayMinutes * 60 * 1000);
  
  let status: FlightStatus["status"] = "ON_TIME";
  if (delayMinutes > 0) status = "DELAYED";
  else if (absHash % 5 === 0) status = "LANDED";
  else status = "IN_AIR";

  const airlines: Record<string, string> = {
    DL: "Delta Air Lines",
    AA: "American Airlines",
    UA: "United Airlines",
    AS: "Alaska Airlines",
    B6: "JetBlue Airways",
    AF: "Air France",
    BA: "British Airways",
    LH: "Lufthansa",
  };

  const code = cleanNumber.slice(0, 2);
  const airlineName = airlines[code] || "Commercial Airline";

  return {
    flightNumber: cleanNumber,
    airline: airlineName,
    status,
    origin: { code: "JFK", city: "New York" },
    destination: { code: "LAX", city: "Los Angeles" },
    scheduledArrival: baseTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    estimatedArrival: estimatedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    delayMinutes,
    terminal: `Terminal ${(absHash % 7) + 1}`,
    gate: `${String.fromCharCode(65 + (absHash % 5))}${(absHash % 30) + 1}`,
    baggageClaim: `Carousel ${(absHash % 6) + 1}`,
    pickupAdjustmentRecommendedMinutes: delayMinutes,
  };
}
