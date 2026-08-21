import { VehicleAmenityTags } from "../types/vehicle";

export interface DecodedVinResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyClass: string;
  classId: "suv" | "sedan" | "sprinter";
  maxPassengers: number;
  maxLuggage: number;
  color: string;
  engine: string;
  manufacturer: string;
  plantCountry: string;
  suggestedAmenities: VehicleAmenityTags;
}

/**
 * Standard luxury livery demo VINs for instant 1-tap testing
 */
export const SAMPLE_LUXURY_VINS = [
  {
    vin: "1GYS4HKL7RR123456",
    label: "2024 Cadillac Escalade ESV Sport Platinum",
    make: "CADILLAC",
    model: "Escalade ESV",
    year: 2024,
    classId: "suv" as const,
  },
  {
    vin: "W1K5G5GB8RA789012",
    label: "2024 Mercedes-Benz S 580 4MATIC",
    make: "MERCEDES-BENZ",
    model: "S-Class",
    year: 2024,
    classId: "sedan" as const,
  },
  {
    vin: "1GKS2CKL5RR345678",
    label: "2024 GMC Yukon XL Denali Ultimate",
    make: "GMC",
    model: "Yukon XL",
    year: 2024,
    classId: "suv" as const,
  },
  {
    vin: "WD3PF0CD7RP567890",
    label: "2024 Mercedes-Benz Sprinter 3500 Jet Edition",
    make: "MERCEDES-BENZ",
    model: "Sprinter",
    year: 2024,
    classId: "sprinter" as const,
  },
];

/**
 * Decodes a 17-character VIN using the US DOT NHTSA vPIC API with luxury livery attribute inference.
 */
export async function decodeVinNumber(rawVin: string): Promise<DecodedVinResult> {
  const vin = rawVin.trim().toUpperCase();

  if (vin.length !== 17) {
    throw new Error("Invalid VIN format. A standard Vehicle Identification Number must be exactly 17 characters.");
  }

  let year = new Date().getFullYear();
  let make = "CADILLAC";
  let model = "Escalade ESV";
  let trim = "Sport Platinum";
  let bodyClass = "Sport Utility Vehicle (SUV)";
  let engine = "6.2L V8 EcoTec3";
  let manufacturer = "General Motors LLC";
  let plantCountry = "UNITED STATES";

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });

    if (response.ok) {
      const data = await response.json();
      const results: { Variable: string; Value: string | null }[] = data.Results || [];

      const getVal = (name: string) => results.find((r) => r.Variable === name)?.Value || null;

      const apiMake = getVal("Make");
      const apiModel = getVal("Model");
      const apiYear = getVal("Model Year");
      const apiTrim = getVal("Trim") || getVal("Series");
      const apiBody = getVal("Body Class");
      const apiDisplacement = getVal("Displacement (L)");
      const apiCylinders = getVal("Engine Number of Cylinders");
      const apiMfg = getVal("Manufacturer Name");
      const apiCountry = getVal("Plant Country");

      if (apiMake) make = apiMake;
      if (apiModel) model = apiModel;
      if (apiYear && !isNaN(Number(apiYear))) year = Number(apiYear);
      if (apiTrim) trim = apiTrim;
      if (apiBody) bodyClass = apiBody;
      if (apiMfg) manufacturer = apiMfg;
      if (apiCountry) plantCountry = apiCountry;

      if (apiDisplacement && apiCylinders) {
        engine = `${parseFloat(apiDisplacement).toFixed(1)}L V${apiCylinders}`;
      }

      // If NHTSA returned incomplete make/model details for European WMI chassis codes
      if (!apiModel || !apiBody) {
        applyWmiTaxonomy(vin, (m, mo, tr, b) => {
          if (!apiMake) make = m;
          if (!apiModel) {
            model = mo;
            trim = tr;
          }
          if (!apiBody) bodyClass = b;
        });
      }
    }
  } catch (err) {
    console.warn("NHTSA live VIN API fallback invoked for:", vin, err);
    applyWmiTaxonomy(vin, (m, mo, tr, b) => {
      make = m;
      model = mo;
      trim = tr;
      bodyClass = b;
    });
  }

  // Determine KLS Luxe Vehicle Class
  const lowerMake = make.toLowerCase();
  const lowerModel = model.toLowerCase();
  const lowerBody = bodyClass.toLowerCase();

  let classId: "suv" | "sedan" | "sprinter" = "suv";
  let maxPassengers = 6;
  let maxLuggage = 6;

  if (
    lowerModel.includes("sprinter") || 
    lowerBody.includes("van") || 
    lowerModel.includes("transit") ||
    vin.startsWith("WD3") ||
    vin.startsWith("WD4")
  ) {
    classId = "sprinter";
    maxPassengers = 14;
    maxLuggage = 14;
  } else if (
    lowerModel.includes("s-class") || 
    lowerModel.includes("s580") || 
    lowerModel.includes("760") || 
    lowerModel.includes("sedan") || 
    lowerBody.includes("sedan") ||
    vin.startsWith("W1K") ||
    vin.startsWith("WDD") ||
    vin.startsWith("WDB") ||
    vin.startsWith("WBA")
  ) {
    classId = "sedan";
    maxPassengers = 3;
    maxLuggage = 3;
  } else {
    // Default to flagship SUV (Escalade ESV, Yukon XL, Suburban, Navigator)
    classId = "suv";
    maxPassengers = 6;
    maxLuggage = 6;
  }

  // Infer Luxury Amenities for KLS Luxe standards
  const isUltraLuxury = 
    lowerMake.includes("cadillac") || 
    lowerMake.includes("mercedes") || 
    lowerMake.includes("rolls") || 
    lowerMake.includes("bentley") || 
    trim.toLowerCase().includes("platinum") || 
    trim.toLowerCase().includes("denali");

  const suggestedAmenities: VehicleAmenityTags = {
    starlineHeadliner: isUltraLuxury,
    chilledSeats: true,
    massageSeats: isUltraLuxury,
    fijiWater: true,
    pellegrino: true,
    starlinkWifi: true,
    rearEntertainment: isUltraLuxury,
    burmesterAudio: lowerMake.includes("mercedes"),
    executivePartition: classId === "sprinter",
  };

  return {
    vin,
    year,
    make,
    model,
    trim,
    bodyClass,
    classId,
    maxPassengers,
    maxLuggage,
    color: "Black", // Industry standard executive livery
    engine,
    manufacturer,
    plantCountry,
    suggestedAmenities,
  };
}

/**
 * Intelligent WMI & VIN prefix taxonomy helper
 */
function applyWmiTaxonomy(
  vin: string,
  setter: (make: string, model: string, trim: string, bodyClass: string) => void
) {
  if (vin.startsWith("WD3") || vin.startsWith("WD4") || vin.includes("SP")) {
    setter("MERCEDES-BENZ", "Sprinter", "Executive Jet Edition", "Van");
  } else if (vin.startsWith("W1K") || vin.startsWith("WDD") || vin.startsWith("WDB")) {
    setter("MERCEDES-BENZ", "S-Class", "S 580 4MATIC", "Sedan");
  } else if (vin.startsWith("1GY") || vin.startsWith("1G6")) {
    setter("CADILLAC", "Escalade ESV", "Sport Platinum", "Sport Utility Vehicle (SUV)");
  } else if (vin.startsWith("1GK")) {
    setter("GMC", "Yukon XL", "Denali Ultimate", "Sport Utility Vehicle (SUV)");
  } else if (vin.startsWith("1GN")) {
    setter("CHEVROLET", "Suburban", "High Country", "Sport Utility Vehicle (SUV)");
  } else if (vin.startsWith("1LN")) {
    setter("LINCOLN", "Navigator L", "Black Label", "Sport Utility Vehicle (SUV)");
  }
}
