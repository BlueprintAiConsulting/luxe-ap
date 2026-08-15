"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db, auth } from "@/lib/firebase/client";
import { doc, getDoc, getDocs, collection, query, where, Timestamp } from "firebase/firestore";
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  User, 
  MapPin, 
  LogOut, 
  Car, 
  Bus, 
  Shield, 
  Star, 
  Plane, 
  Clock, 
  Navigation,
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon,
  Tag
} from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { QuoteInput, PriceBreakdown, CreateReservationInput, Address, defaultPreferences } from "@/lib/types";
import { useJsApiLoader, Autocomplete, GoogleMap, DirectionsRenderer } from "@react-google-maps/api";
import { calculatePrice } from "../../../../functions/src/pricing/index";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_mock");

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const libraries: ("places")[] = ["places"];

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const isSetup = clientSecret.startsWith("seti_");
    const confirmFn = isSetup ? stripe.confirmSetup : stripe.confirmPayment;
    const { error: submitError } = await confirmFn({
      elements,
      confirmParams: { return_url: `${window.location.origin}/dashboard` },
    });
    if (submitError) {
      setError(submitError.message || "Payment failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="text-red-400 text-xs p-3 bg-red-950/60 border border-red-800 rounded-xl">
          {error}
        </div>
      )}
      <button 
        disabled={!stripe || loading} 
        className="w-full bg-accent text-neutral-950 py-4 rounded-2xl font-bold text-sm flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 transition-all shadow-lg active:scale-[0.98]"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : "Submit Payment"}
      </button>
    </form>
  );
}

const steps = ["Trip Type", "Logistics", "Passengers", "Vehicle", "Driver", "Preferences", "Review", "Payment"];
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function BookPage() {
  const { user } = useAuth();
  const router = useRouter();
  const functions = getFunctions(app);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firestore Data
  const [ruleSet, setRuleSet] = useState<any>(null);

  // Form State
  const [tripType, setTripType] = useState<"point_to_point" | "hourly" | "airport_arrival" | "airport_departure">("point_to_point");
  
  // Logistics
  const [pickupAddressObj, setPickupAddressObj] = useState<Address | null>(null);
  const [dropoffAddressObj, setDropoffAddressObj] = useState<Address | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  
  // Google Maps
  const [pickupAutocomplete, setPickupAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [dropoffAutocomplete, setDropoffAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Passengers
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [flightNumber, setFlightNumber] = useState("");

  // Vehicle
  const [availableClasses, setAvailableClasses] = useState<{id: string, name: string, capacity: number}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [quote, setQuote] = useState<PriceBreakdown | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // Billing
  const [promoCode, setPromoCode] = useState("");

  // Driver
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<{id: string, name: string, rating: number, bio: string, photoUrl?: string, yearsExperience?: number, languages?: string[]}[]>([]);

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const snap = await getDocs(query(collection(db, "drivers"), where("active", "==", true), where("bookable", "==", true)));
        setDrivers(snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.displayName || `${data.firstName} ${data.lastName || ""}`.trim(),
            rating: data.rating || 5.0,
            bio: data.bio || "",
            photoUrl: data.photoUrl || null,
            yearsExperience: data.yearsExperience || 5,
            languages: data.languages || ["English"],
          };
        }));
      } catch (e) {
        console.error(e);
      }
    };
    loadDrivers();
  }, []);

  // Preferences
  const [preferences, setPreferences] = useState({
    beverage: "no_preference",
    conversation: "no_preference",
    greeting: "no_preference"
  });
  const [savedFullPreferences, setSavedFullPreferences] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const saved = userSnap.data()?.preferences;
        if (saved) {
          setSavedFullPreferences(saved);
          setPreferences({
            beverage: saved.beverage?.preference || "no_preference",
            conversation: saved.conversation || "no_preference",
            greeting: saved.greeting?.style || "no_preference",
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadPrefs();
  }, [user]);

  useEffect(() => {
    const fetchRuleSet = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
          const ruleSetId = settingsSnap.data().activePricingRuleSetId;
          const rulesSnap = await getDoc(doc(db, "pricingRuleSets", ruleSetId));
          if (rulesSnap.exists()) {
            const data = rulesSnap.data();
            setRuleSet(data);
            
            if (data.classRates) {
              const classes = Object.entries(data.classRates).map(([id, rate]: [string, any]) => {
                let capacity = 3;
                if (id === "suv") { capacity = 6; }
                if (id === "sprinter") { capacity = 12; }
                return { id, name: rate.name || id, capacity };
              });
              setAvailableClasses(classes);
              setSelectedClassId(classes[0]?.id || "");
            }
          }
        }
      } catch (err) {
        console.error("Failed to load pricing rules", err);
      }
    };
    fetchRuleSet();
  }, []);

  // Set default dates (tomorrow at 09:00) if empty
  useEffect(() => {
    if (!pickupDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPickupDate(tomorrow.toISOString().split("T")[0]);
      setPickupTime("09:00");
    }
  }, [pickupDate]);

  const extractAirportCode = (place: google.maps.places.PlaceResult): string | null => {
    const name = place.name || "";
    const match = name.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : null;
  };

  const placeToAddress = (place: google.maps.places.PlaceResult): Address => {
    const get = (type: string) =>
      place.address_components?.find(c => c.types.includes(type))?.long_name || "";
    const getShort = (type: string) =>
      place.address_components?.find(c => c.types.includes(type))?.short_name || "";

    const streetNumber = get("street_number");
    const route = get("route");
    const isAirport = place.types?.includes("airport") || false;

    return {
      line1: isAirport ? (place.name || place.formatted_address || "") : `${streetNumber} ${route}`.trim() || place.formatted_address || "",
      line2: null,
      city: get("locality") || get("sublocality") || get("postal_town"),
      state: getShort("administrative_area_level_1"),
      postalCode: get("postal_code"),
      lat: place.geometry?.location?.lat() || 0,
      lng: place.geometry?.location?.lng() || 0,
      formatted: place.formatted_address || place.name || "",
      placeId: place.place_id || null,
      airportCode: isAirport ? extractAirportCode(place) : null,
      notes: null,
    };
  };

  const calculateRoute = useCallback(() => {
    if (pickupAddressObj && (dropoffAddressObj || tripType === "hourly") && window.google) {
      if (tripType === "hourly") return;
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route({
        origin: { lat: pickupAddressObj.lat, lng: pickupAddressObj.lng },
        destination: { lat: dropoffAddressObj!.lat, lng: dropoffAddressObj!.lng },
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const leg = result.routes[0].legs[0];
          setDistanceMeters(leg.distance?.value || 0);
          setDurationSeconds(leg.duration?.value || 0);
        } else {
          console.error("Directions request failed", status);
        }
      });
    }
  }, [pickupAddressObj, dropoffAddressObj, tripType]);

  useEffect(() => {
    calculateRoute();
  }, [pickupAddressObj, dropoffAddressObj, calculateRoute]);

  const onPickupPlaceChanged = () => {
    if (pickupAutocomplete !== null) {
      const place = pickupAutocomplete.getPlace();
      if (place.geometry) {
        const addr = placeToAddress(place);
        setPickupAddress(addr.formatted);
        setPickupAddressObj(addr);
      }
    }
  };

  const onDropoffPlaceChanged = () => {
    if (dropoffAutocomplete !== null) {
      const place = dropoffAutocomplete.getPlace();
      if (place.geometry) {
        const addr = placeToAddress(place);
        setDropoffAddress(addr.formatted);
        setDropoffAddressObj(addr);
      }
    }
  };

  const getDynamicPrice = (classId: string) => {
    if (!ruleSet) return null;
    let pDate = new Date();
    if (pickupDate && pickupTime) {
      pDate = new Date(`${pickupDate}T${pickupTime}`);
    }
    
    const input: QuoteInput = {
      tripType,
      pickupAt: Timestamp.fromDate(pDate) as any,
      timezone: timezone,
      classId,
      estimatedDistanceMiles: Math.max(5, distanceMeters * 0.000621371),
      estimatedDurationMinutes: Math.max(15, durationSeconds / 60),
      hours: tripType === "hourly" ? 2 : null,
      airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || null) : null,
      airportZoneId: null,
      extraStopCount: 0,
      greetingStyle: preferences.greeting as any,
      childSeatCount: 0,
      waitMinutes: 0,
      tollsCents: 0,
      parkingCents: 0,
      outOfAreaMiles: 0,
    };
    try {
      const breakdown = calculatePrice(input, ruleSet, new Date(), undefined);
      return breakdown.estimatedTotalCents;
    } catch (e) {
      return null;
    }
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && !pickupAddress) {
      setError("Please enter a pickup address.");
      return;
    }
    if (currentStep === 2 && ruleSet) {
      let pDate = new Date();
      if (pickupDate && pickupTime) pDate = new Date(`${pickupDate}T${pickupTime}`);
      
      const input: QuoteInput = {
        tripType,
        pickupAt: Timestamp.fromDate(pDate) as any,
        timezone: timezone,
        classId: selectedClassId || availableClasses[0]?.id || "sedan",
        estimatedDistanceMiles: Math.max(5, distanceMeters * 0.000621371),
        estimatedDurationMinutes: Math.max(15, durationSeconds / 60),
        hours: tripType === "hourly" ? 2 : null,
        airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || null) : null,
        airportZoneId: null,
        extraStopCount: 0,
        greetingStyle: preferences.greeting as any,
        childSeatCount: 0,
        waitMinutes: 0,
        tollsCents: 0,
        parkingCents: 0,
        outOfAreaMiles: 0,
      };
      try {
        const breakdown = calculatePrice(input, ruleSet, new Date(), undefined);
        setQuote(breakdown);
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentStep(c => Math.min(c + 1, steps.length - 1));
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    if (ruleSet) {
      let pDate = new Date();
      if (pickupDate && pickupTime) pDate = new Date(`${pickupDate}T${pickupTime}`);
      const input: QuoteInput = {
        tripType,
        pickupAt: Timestamp.fromDate(pDate) as any,
        timezone: timezone,
        classId,
        estimatedDistanceMiles: Math.max(5, distanceMeters * 0.000621371),
        estimatedDurationMinutes: Math.max(15, durationSeconds / 60),
        hours: tripType === "hourly" ? 2 : null,
        airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || null) : null,
        airportZoneId: null,
        extraStopCount: 0,
        greetingStyle: preferences.greeting as any,
        childSeatCount: 0,
        waitMinutes: 0,
        tollsCents: 0,
        parkingCents: 0,
        outOfAreaMiles: 0,
      };
      try {
        const breakdown = calculatePrice(input, ruleSet, new Date(), undefined);
        setQuote(breakdown);
      } catch (e) {}
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(c => Math.max(c - 1, 0));
  };

  const handleConfirm = async () => {
    if (!quote) return;
    setLoading(true);
    setError(null);

    try {
      const createReservation = httpsCallable(functions, "createReservation");
      let pDate = new Date();
      if (pickupDate && pickupTime) pDate = new Date(`${pickupDate}T${pickupTime}`);

      const quoteInput: QuoteInput = {
        tripType,
        pickupAt: Timestamp.fromDate(pDate) as any,
        timezone: timezone,
        classId: selectedClassId,
        estimatedDistanceMiles: Math.max(5, distanceMeters * 0.000621371),
        estimatedDurationMinutes: Math.max(15, durationSeconds / 60),
        hours: tripType === "hourly" ? 2 : null,
        airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || null) : null,
        airportZoneId: null,
        extraStopCount: 0,
        greetingStyle: preferences.greeting as any,
        childSeatCount: 0,
        waitMinutes: 0,
        tollsCents: 0,
        parkingCents: 0,
        outOfAreaMiles: 0,
      };

      const idempotencyKey = "idempotency_" + Math.random().toString(36).substring(7);
      
      const fallbackPickup: Address = pickupAddressObj || {
        line1: pickupAddress || "Beverly Hills, CA",
        line2: null,
        city: "Los Angeles",
        state: "CA",
        postalCode: "90210",
        lat: 34.0736,
        lng: -118.4004,
        formatted: pickupAddress || "Beverly Hills, CA",
        placeId: null,
        airportCode: null,
        notes: null
      };

      const resInput: CreateReservationInput = {
        idempotencyKey,
        quote: quoteInput,
        requestedDriverId: selectedDriverId,
        pickup: fallbackPickup,
        dropoff: dropoffAddressObj || null,
        stops: [],
        passengers,
        luggage,
        flightNumber: flightNumber || null,
        promoCode: promoCode || null,
        preferences: {
          ...(savedFullPreferences || defaultPreferences),
          beverage: { ...(savedFullPreferences?.beverage || defaultPreferences.beverage), preference: preferences.beverage },
          conversation: preferences.conversation,
          greeting: { ...(savedFullPreferences?.greeting || defaultPreferences.greeting), style: preferences.greeting }
        },
        notes: null
      };

      const res = await createReservation(resInput);
      const data = res.data as { reservationId: string; clientSecret: string; confirmationCode: string };
      
      if (data.clientSecret && data.clientSecret !== "mock_client_secret_for_emulator") {
        setClientSecret(data.clientSecret);
        setCurrentStep(7);
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      setError(e.message || "Failed to create reservation");
    } finally {
      setLoading(false);
    }
  };

  const activePriceEstimate = selectedClassId ? getDynamicPrice(selectedClassId) : (quote?.estimatedTotalCents || null);

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-accent selection:text-neutral-950 pb-36 pt-4 px-3 sm:px-6 max-w-2xl mx-auto">
      
      {/* Top Header & Step Progress Bar */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl pt-2 pb-4 border-b border-neutral-800/80 mb-6">
        <div className="flex items-center justify-between mb-3">
          <button 
            type="button"
            aria-label="Go to previous step"
            onClick={handleBack} 
            disabled={currentStep === 0} 
            className="w-10 h-10 -ml-1 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent font-mono">
              <Sparkles size={11} /> Step {currentStep + 1} of {steps.length}
            </div>
            <div className="text-xs font-bold text-neutral-400 capitalize">
              {steps[currentStep]}
            </div>
          </div>

          <button 
            type="button"
            aria-label="Sign out"
            onClick={() => {
              import("firebase/auth").then(({ signOut }) => signOut(auth));
            }} 
            className="w-10 h-10 -mr-1 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-red-400 active:scale-95 transition-all"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Linear Gold Step Progress Tracker */}
        <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-accent transition-all duration-300 ease-out" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} 
          />
        </div>
      </div>

      {/* Main Step Body Card */}
      <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
        
        {error && (
          <div className="bg-red-950/60 border border-red-800/80 text-red-200 text-xs p-4 rounded-2xl flex items-start gap-2.5">
            <div className="w-1.5 h-full bg-red-500 rounded-full shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* STEP 1: Trip Type */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Select Service Type</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">Choose the journey style tailored to your schedule</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { type: "point_to_point", label: "Point to Point", desc: "Direct A-to-B executive transfer", icon: Navigation },
                { type: "hourly", label: "Hourly As-Directed", desc: "Private chauffeur on standby (2hr min)", icon: Clock },
                { type: "airport_arrival", label: "Airport Arrival", desc: "Flight tracking with inside meet & greet", icon: Plane },
                { type: "airport_departure", label: "Airport Departure", desc: "Prompt curbside dropoff at terminal", icon: Plane },
              ].map(({ type, label, desc, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTripType(type as any)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] flex items-start gap-3.5 ${
                    tripType === type 
                      ? "bg-accent/10 border-accent text-white shadow-lg ring-1 ring-accent/30" 
                      : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tripType === type ? "bg-accent/20 text-accent" : "bg-neutral-900 text-neutral-400"}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      {label}
                      {tripType === type && <CheckCircle2 size={14} className="text-accent" />}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5 font-medium">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Logistics */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Route & Schedule</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">Input your itinerary for automated route estimation</p>
            </div>

            {isLoaded ? (
              <div className="space-y-3">
                {/* Embedded Dark Luxury Map */}
                <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-inner">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '180px' }}
                    center={pickupAddressObj ? { lat: pickupAddressObj.lat, lng: pickupAddressObj.lng } : defaultCenter}
                    zoom={12}
                    options={{ 
                      disableDefaultUI: true,
                      styles: [
                        { elementType: "geometry", stylers: [{ color: "#18181b" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#18181b" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#a1a1aa" }] },
                        { featureType: "road", elementType: "geometry", stylers: [{ color: "#27272a" }] },
                        { featureType: "water", elementType: "geometry", stylers: [{ color: "#09090b" }] },
                      ]
                    }}
                  >
                    {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false }} />}
                  </GoogleMap>
                </div>

                {/* Pickup Address */}
                <div>
                  <label htmlFor="pickup-address" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Pickup Location
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent" />
                    <Autocomplete onLoad={setPickupAutocomplete} onPlaceChanged={onPickupPlaceChanged}>
                      <input 
                        id="pickup-address"
                        type="text" 
                        value={pickupAddress} 
                        onChange={e => setPickupAddress(e.target.value)} 
                        placeholder="Enter pickup address or airport" 
                        className="w-full pl-10 pr-3.5 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-neutral-600 font-medium" 
                      />
                    </Autocomplete>
                  </div>
                </div>

                {/* Dropoff Address */}
                {tripType !== 'hourly' && (
                  <div>
                    <label htmlFor="dropoff-address" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Dropoff Destination
                    </label>
                    <div className="relative">
                      <Navigation size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <Autocomplete onLoad={setDropoffAutocomplete} onPlaceChanged={onDropoffPlaceChanged}>
                        <input 
                          id="dropoff-address"
                          type="text" 
                          value={dropoffAddress} 
                          onChange={e => setDropoffAddress(e.target.value)} 
                          placeholder="Enter destination address" 
                          className="w-full pl-10 pr-3.5 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-neutral-600 font-medium" 
                        />
                      </Autocomplete>
                    </div>
                  </div>
                )}

                {/* Date & Time Row */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="pickup-date" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <div className="relative">
                      <CalendarIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                      <input 
                        id="pickup-date" 
                        type="date" 
                        value={pickupDate} 
                        onChange={e => setPickupDate(e.target.value)} 
                        className="w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium" 
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pickup-time" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Time
                    </label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                      <input 
                        id="pickup-time" 
                        type="time" 
                        value={pickupTime} 
                        onChange={e => setPickupTime(e.target.value)} 
                        className="w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium" 
                      />
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-neutral-500" size={32} /></div>
            )}
          </div>
        )}

        {/* STEP 3: Passengers & Bags */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Party & Luggage</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">Ensure the correct vehicle capacity for your party</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                <div>
                  <div className="font-bold text-sm text-white">Total Passengers</div>
                  <div className="text-xs text-neutral-500">Including children & guests</div>
                </div>
                <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-1.5">
                  <button 
                    type="button"
                    aria-label="Decrease passenger count"
                    onClick={() => setPassengers(Math.max(1, passengers - 1))} 
                    className="w-9 h-9 rounded-lg bg-neutral-800 text-white font-bold flex items-center justify-center hover:bg-neutral-700 active:scale-90 transition-all"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold font-mono text-base text-accent">{passengers}</span>
                  <button 
                    type="button"
                    aria-label="Increase passenger count"
                    onClick={() => setPassengers(passengers + 1)} 
                    className="w-9 h-9 rounded-lg bg-neutral-800 text-white font-bold flex items-center justify-center hover:bg-neutral-700 active:scale-90 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                <div>
                  <div className="font-bold text-sm text-white">Luggage Bags</div>
                  <div className="text-xs text-neutral-500">Standard check-in / carry-on</div>
                </div>
                <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-1.5">
                  <button 
                    type="button"
                    aria-label="Decrease luggage count"
                    onClick={() => setLuggage(Math.max(0, luggage - 1))} 
                    className="w-9 h-9 rounded-lg bg-neutral-800 text-white font-bold flex items-center justify-center hover:bg-neutral-700 active:scale-90 transition-all"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold font-mono text-base text-accent">{luggage}</span>
                  <button 
                    type="button"
                    aria-label="Increase luggage count"
                    onClick={() => setLuggage(luggage + 1)} 
                    className="w-9 h-9 rounded-lg bg-neutral-800 text-white font-bold flex items-center justify-center hover:bg-neutral-700 active:scale-90 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              {tripType.includes("airport") && (
                <div className="pt-2">
                  <label htmlFor="flight-number" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Flight Number (Auto-Tracking)
                  </label>
                  <div className="relative">
                    <Plane size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input 
                      id="flight-number" 
                      type="text" 
                      value={flightNumber} 
                      onChange={e => setFlightNumber(e.target.value.toUpperCase())} 
                      placeholder="e.g. DL 1492 or N123AA" 
                      className="w-full pl-10 pr-3.5 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono placeholder:text-neutral-600" 
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 font-medium">Chauffeur coordinates curbside arrival based on live radar telemetry.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Vehicle Selection */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Select Vehicle Class</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">Premium executive fleet with complimentary refreshment</p>
            </div>

            <div className="space-y-3 pt-1">
              {availableClasses.filter(c => c.capacity >= passengers).map(cls => {
                const price = getDynamicPrice(cls.id);
                const isSelected = selectedClassId === cls.id;
                return (
                  <button 
                    key={cls.id}
                    type="button"
                    onClick={() => handleClassSelect(cls.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] flex items-center justify-between ${
                      isSelected 
                        ? 'border-accent bg-accent/10 ring-1 ring-accent/30 shadow-lg' 
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected ? "bg-accent/20 border-accent/40 text-accent" : "bg-neutral-900 border-neutral-800 text-neutral-400"
                      }`}>
                        {cls.id === "sprinter" ? (
                          <Bus size={24} />
                        ) : cls.id === "suv" ? (
                          <Shield size={24} />
                        ) : (
                          <Car size={24} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          {cls.name}
                          {isSelected && <span className="text-[9px] bg-accent text-neutral-950 px-1.5 py-0.5 rounded font-bold uppercase">Selected</span>}
                        </div>
                        <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                          <User size={12} /> Up to {cls.capacity} Passengers
                        </div>
                      </div>
                    </div>

                    {price !== null && (
                      <div className="text-right">
                        <div className="font-bold text-lg text-accent font-mono">${(price / 100).toFixed(2)}</div>
                        <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">All Inclusive</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Driver Selection */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Select Chauffeur</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">All chauffeurs are background-checked and executive-certified</p>
            </div>

            <div className="space-y-3 pt-1">
              <button 
                type="button"
                onClick={() => setSelectedDriverId(null)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] flex items-center justify-between ${
                  selectedDriverId === null 
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/30 shadow-lg' 
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedDriverId === null ? "bg-accent/20 border-accent/40 text-accent" : "bg-neutral-900 border-neutral-800 text-neutral-400"
                  }`}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Top-Rated Nearest Chauffeur</div>
                    <div className="text-xs text-neutral-400 mt-0.5 font-medium">Auto-dispatch fastest certified chauffeur</div>
                  </div>
                </div>
                {selectedDriverId === null && <CheckCircle2 size={18} className="text-accent" />}
              </button>

              {drivers.map(drv => {
                const isSelected = selectedDriverId === drv.id;
                return (
                  <button 
                    key={drv.id}
                    type="button"
                    onClick={() => setSelectedDriverId(drv.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] flex items-start justify-between ${
                      isSelected 
                        ? 'border-accent bg-accent/10 ring-1 ring-accent/30 shadow-lg' 
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden text-lg font-bold text-accent">
                        {drv.photoUrl ? (
                          <img src={drv.photoUrl} alt={drv.name} className="w-full h-full object-cover" />
                        ) : (
                          drv.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          {drv.name}
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-accent/20 text-accent font-bold px-1.5 py-0.2 rounded">
                            <Star size={10} className="fill-accent text-accent" /> {drv.rating}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                          {drv.yearsExperience} Years Executive Experience &bull; {drv.languages?.join(", ")}
                        </div>
                        {drv.bio && (
                          <div className="text-xs text-neutral-400 mt-1 line-clamp-1 italic">
                            "{drv.bio}"
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="text-accent shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: Preferences */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Cabin Preferences</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">Tailor vehicle amenities and chauffeur etiquette</p>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label htmlFor="pref-beverage" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Complimentary Beverage
                </label>
                <select 
                  id="pref-beverage" 
                  value={preferences.beverage} 
                  onChange={e => setPreferences({...preferences, beverage: e.target.value})} 
                  className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                >
                  <option value="no_preference">No preference</option>
                  <option value="water_sparkling">San Pellegrino (Sparkling)</option>
                  <option value="water_still">Fiji Water (Still)</option>
                  <option value="coffee">Hot Artisan Coffee</option>
                  <option value="soda">Cold Soda / Tonic</option>
                  <option value="none">No beverage requested</option>
                </select>
              </div>

              <div>
                <label htmlFor="pref-conversation" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Conversation & Atmosphere
                </label>
                <select 
                  id="pref-conversation" 
                  value={preferences.conversation} 
                  onChange={e => setPreferences({...preferences, conversation: e.target.value})} 
                  className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                >
                  <option value="silent">Silent Ride (Executive Focus / Rest)</option>
                  <option value="greeting_only">Greeting Only (Concierge confirmation)</option>
                  <option value="chatty">Happy to chat / City Guide</option>
                  <option value="no_preference">Chauffeur's Discretion</option>
                </select>
              </div>

              <div>
                <label htmlFor="pref-greeting" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Greeting Style
                </label>
                <select 
                  id="pref-greeting" 
                  value={preferences.greeting} 
                  onChange={e => setPreferences({...preferences, greeting: e.target.value})} 
                  className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                >
                  <option value="curbside">Curbside (Wait by vehicle with door held)</option>
                  <option value="meet_inside">Meet Inside (Terminal / Hotel Lobby with Name Sign)</option>
                  <option value="no_preference">Standard Executive</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Review & Confirm */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Review Reservation</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">Verify your journey parameters before final confirmation</p>
            </div>

            {/* Itinerary Summary Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-accent shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Pickup</div>
                  <div className="text-xs font-semibold text-white">{pickupAddress || "Not specified"}</div>
                </div>
              </div>

              {dropoffAddress && (
                <div className="flex items-start gap-3 pt-2 border-t border-neutral-900">
                  <Navigation size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Destination</div>
                    <div className="text-xs font-semibold text-white">{dropoffAddress}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-900 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Date & Time</div>
                  <div className="font-semibold text-white">{pickupDate} @ {pickupTime}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Vehicle</div>
                  <div className="font-semibold text-white capitalize">{availableClasses.find(c => c.id === selectedClassId)?.name || selectedClassId}</div>
                </div>
              </div>
            </div>

            {/* Payment Summary Breakdown */}
            {quote && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2.5">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Transparent Fare Breakdown
                </div>
                <div className="flex justify-between items-center text-xs text-neutral-300">
                  <span>Base Charter Fare</span>
                  <span className="font-mono">${(quote.subtotalCents / 100).toFixed(2)}</span>
                </div>
                {quote.lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between items-center text-xs text-neutral-400">
                    <span>{li.label}</span>
                    <span className="font-mono">${(li.amountCents / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-neutral-800 flex justify-between items-center font-bold text-base text-accent">
                  <span>Estimated Total</span>
                  <span className="font-mono text-lg">${(quote.estimatedTotalCents / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Corporate / Promo Code Box */}
            <div>
              <label htmlFor="promo-code" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Corporate Account / Promo Code
              </label>
              <div className="relative">
                <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input 
                  id="promo-code" 
                  type="text" 
                  value={promoCode} 
                  onChange={e => setPromoCode(e.target.value.toUpperCase())} 
                  placeholder="e.g. VIP-CORP-2026" 
                  className="w-full pl-10 pr-3.5 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-accent font-mono uppercase placeholder:text-neutral-600" 
                />
              </div>
            </div>

          </div>
        )}

        {/* STEP 8: Stripe Payment */}
        {currentStep === 7 && clientSecret && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">Payment Method</h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">Encrypted card pre-authorization</p>
            </div>
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm clientSecret={clientSecret} />
              </Elements>
            </div>
          </div>
        )}

      </div>

      {/* Floating Sticky Bottom Action Bar */}
      {currentStep < 7 && (
        <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-2xl border-t border-white/10 p-3.5 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Estimated Fare</div>
              <div className="text-lg font-bold text-accent font-mono leading-tight">
                {activePriceEstimate !== null ? `$${(activePriceEstimate / 100).toFixed(2)}` : "--"}
              </div>
            </div>

            {currentStep < steps.length - 2 ? (
              <button 
                type="button"
                onClick={handleNext} 
                disabled={loading || (currentStep === 1 && !pickupAddress)}
                className="flex-1 sm:flex-initial sm:px-10 py-3.5 rounded-2xl bg-accent text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-40 transition-all shadow-lg active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleConfirm}
                disabled={loading || !quote}
                className="flex-1 sm:flex-initial sm:px-10 py-3.5 rounded-2xl bg-accent text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-40 transition-all shadow-lg active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <span>Confirm & Book</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
