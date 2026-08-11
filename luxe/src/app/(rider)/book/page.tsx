"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "@/lib/firebase/client";
import { doc, getDoc, getDocs, collection, query, where, Timestamp } from "firebase/firestore";
import { Loader2, ArrowLeft, ArrowRight, User, MapPin } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { QuoteInput, PriceBreakdown, CreateReservationInput, Address, defaultPreferences } from "@/lib/types";
import { useJsApiLoader, Autocomplete, GoogleMap, DirectionsRenderer } from "@react-google-maps/api";
import { calculatePrice } from "../../../../functions/src/pricing/index";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_mock");

const mapContainerStyle = { width: '100%', height: '250px', borderRadius: '12px' };
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
      confirmParams: { return_url: `${window.location.origin}/reservations` },
    });
    if (submitError) {
      setError(submitError.message || "Payment failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
      <button disabled={!stripe || loading} className="w-full bg-brand text-white py-4 rounded-xl font-bold flex items-center justify-center hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors">
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
  const [luggage, setLuggage] = useState(0);
  const [flightNumber, setFlightNumber] = useState("");

  // Vehicle
  const [availableClasses, setAvailableClasses] = useState<{id: string, name: string, capacity: number, image: string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [quote, setQuote] = useState<PriceBreakdown | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Driver
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<{id: string, name: string, rating: number, bio: string}[]>([]);
  useEffect(() => {
    const loadDrivers = async () => {
      const snap = await getDocs(query(collection(db, "drivers"), where("isActive", "==", true)));
      setDrivers(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.displayName || `${data.firstName} ${data.lastName || ""}`.trim(),
          rating: data.rating || 5.0,
          bio: data.bio || "",
        };
      }));
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
            
            // Generate classes from classRates
            if (data.classRates) {
              const classes = Object.entries(data.classRates).map(([id, rate]: [string, any]) => {
                let capacity = 3;
                let image = "🚗";
                if (id === "suv") { capacity = 6; image = "🚙"; }
                if (id === "sprinter") { capacity = 12; image = "🚐"; }
                return { id, name: rate.name || id, capacity, image };
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
      estimatedDistanceMiles: distanceMeters * 0.000621371,
      estimatedDurationMinutes: durationSeconds / 60,
      hours: tripType === "hourly" ? 2 : null, // Default 2 hrs for hourly
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
    if (currentStep === 2) {
      // Transitioning to Vehicle step. We already have the dynamic price via calculatePrice!
      // Let's just set the quote for the selected class so it renders properly in Review.
      if (ruleSet) {
        let pDate = new Date();
        if (pickupDate && pickupTime) pDate = new Date(`${pickupDate}T${pickupTime}`);
        
        const input: QuoteInput = {
          tripType,
          pickupAt: Timestamp.fromDate(pDate) as any,
          timezone: timezone,
          classId: selectedClassId,
          estimatedDistanceMiles: distanceMeters * 0.000621371,
          estimatedDurationMinutes: durationSeconds / 60,
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
        estimatedDistanceMiles: distanceMeters * 0.000621371,
        estimatedDurationMinutes: durationSeconds / 60,
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

  const handleBack = () => setCurrentStep(c => Math.max(c - 1, 0));

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
        estimatedDistanceMiles: distanceMeters * 0.000621371,
        estimatedDurationMinutes: durationSeconds / 60,
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
      
      const resInput: CreateReservationInput = {
        idempotencyKey,
        quote: quoteInput,
        requestedDriverId: selectedDriverId,
        pickup: pickupAddressObj!,
        dropoff: dropoffAddressObj || null,
        stops: [],
        passengers,
        luggage,
        flightNumber: flightNumber || null,
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
        alert(`Reservation Created! Confirmation: ${data.confirmationCode}`);
        router.push("/reservations");
      }
    } catch (e: any) {
      setError(e.message || "Failed to create reservation");
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return <div className="text-center p-8 text-red-500">Error loading Google Maps</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-20 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={handleBack} disabled={currentStep === 0} className="p-2 disabled:opacity-30 rounded-full hover:bg-neutral-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-sm  text-neutral-800">Step {currentStep + 1} of {steps.length}</span>
        <div className="w-8" />
      </div>
      
      {/* Progress bar */}
      <div className="h-1 w-full bg-neutral-100">
        <div className="h-1 bg-brand transition-all duration-300 ease-out" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 text-sm border border-red-200 shadow-sm animate-in fade-in">
            {error}
          </div>
        )}

        {/* STEP 1: Trip Type */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-6 text-neutral-900 tracking-tight">Where are you going?</h1>
            <div className="space-y-3">
              {(["point_to_point", "hourly", "airport_arrival", "airport_departure"] as const).map(type => (
                <label htmlFor={`trip-type-${type}`} key={type} className={`block p-5 border rounded-2xl cursor-pointer transition-all duration-200 ${tripType === type ? 'border-brand bg-neutral-50 ring-2 ring-brand shadow-sm' : 'border-neutral-200 hover:border-neutral-300'}`}>
                  <div className="flex items-center space-x-3">
                    <input id={`trip-type-${type}`} type="radio" name="tripType" value={type} checked={tripType === type} onChange={() => setTripType(type)} className="w-5 h-5 text-brand focus:ring-brand accent-brand" />
                    <span className="font-medium text-lg capitalize">{type.replace(/_/g, " ")}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Logistics */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-6 text-neutral-900 tracking-tight">Trip Details</h1>
            
            {isLoaded ? (
              <div className="space-y-4 relative z-0">
                <div className="mb-6 border rounded-2xl overflow-hidden shadow-inner bg-neutral-100">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={defaultCenter}
                    zoom={12}
                    options={{ disableDefaultUI: true }}
                  >
                    {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false }} />}
                  </GoogleMap>
                </div>
                
                <div className="relative">
                  <div className="absolute left-4 top-10 text-neutral-400">
                    <MapPin size={18} />
                  </div>
                  <label htmlFor="pickup-address" className="block text-sm font-semibold mb-1 text-neutral-700">Pickup Address</label>
                  <Autocomplete onLoad={setPickupAutocomplete} onPlaceChanged={onPickupPlaceChanged}>
                    <input 
                      id="pickup-address"
                      type="text" 
                      value={pickupAddress} 
                      onChange={e => setPickupAddress(e.target.value)} 
                      placeholder="123 Main St" 
                      className="w-full border p-4 pl-12 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all shadow-sm bg-white" 
                    />
                  </Autocomplete>
                </div>

                {tripType !== 'hourly' && (
                  <div className="relative">
                    <div className="absolute left-4 top-10 text-neutral-400">
                      <MapPin size={18} />
                    </div>
                    <label htmlFor="dropoff-address" className="block text-sm font-semibold mb-1 text-neutral-700">Dropoff Address</label>
                    <Autocomplete onLoad={setDropoffAutocomplete} onPlaceChanged={onDropoffPlaceChanged}>
                      <input 
                        id="dropoff-address"
                        type="text" 
                        value={dropoffAddress} 
                        onChange={e => setDropoffAddress(e.target.value)} 
                        placeholder="456 Market St" 
                        className="w-full border p-4 pl-12 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all shadow-sm bg-white" 
                      />
                    </Autocomplete>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-neutral-400" /></div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-6">
              <div>
                <label htmlFor="pickup-date" className="block text-sm font-semibold mb-1 text-neutral-700">Date</label>
                <input id="pickup-date" type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full border p-4 rounded-xl outline-none focus:ring-2 focus:ring-brand transition-all shadow-sm bg-white" />
              </div>
              <div>
                <label htmlFor="pickup-time" className="block text-sm font-semibold mb-1 text-neutral-700">Time</label>
                <input id="pickup-time" type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full border p-4 rounded-xl outline-none focus:ring-2 focus:ring-brand transition-all shadow-sm bg-white" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Passengers & Flight */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-6 text-neutral-900 tracking-tight">Passengers & Bags</h1>
            
            <div className="flex justify-between items-center p-5 border rounded-2xl shadow-sm bg-white">
              <span className="font-semibold text-lg">Passengers</span>
              <div className="flex items-center space-x-4 bg-neutral-50 rounded-full p-1 border">
                <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-bold hover:bg-neutral-100 transition-colors">-</button>
                <span className="w-6 text-center font-bold text-lg">{passengers}</span>
                <button onClick={() => setPassengers(passengers + 1)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-bold hover:bg-neutral-100 transition-colors">+</button>
              </div>
            </div>

            <div className="flex justify-between items-center p-5 border rounded-2xl shadow-sm bg-white">
              <span className="font-semibold text-lg">Luggage</span>
              <div className="flex items-center space-x-4 bg-neutral-50 rounded-full p-1 border">
                <button onClick={() => setLuggage(Math.max(0, luggage - 1))} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-bold hover:bg-neutral-100 transition-colors">-</button>
                <span className="w-6 text-center font-bold text-lg">{luggage}</span>
                <button onClick={() => setLuggage(luggage + 1)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-bold hover:bg-neutral-100 transition-colors">+</button>
              </div>
            </div>

            {tripType.includes("airport") && (
              <div className="pt-6">
                <label htmlFor="flight-number" className="block text-sm font-semibold mb-2 text-neutral-700">Flight Number (Optional)</label>
                <input id="flight-number" type="text" value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="e.g. DL 1234" className="w-full border p-4 rounded-xl outline-none focus:ring-2 focus:ring-brand shadow-sm bg-white transition-all" />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Vehicle */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-6 text-neutral-900 tracking-tight">Select a Vehicle</h1>
            
            <div className="space-y-4">
              {availableClasses.filter(c => c.capacity >= passengers).map(cls => {
                const price = getDynamicPrice(cls.id);
                return (
                  <button 
                    key={cls.id}
                    onClick={() => handleClassSelect(cls.id)}
                    className={`w-full text-left p-5 border rounded-2xl flex items-center justify-between transition-all duration-200 ${selectedClassId === cls.id ? 'border-brand ring-2 ring-brand bg-neutral-50 shadow-md' : 'border-neutral-200 hover:border-neutral-300 shadow-sm bg-white'}`}
                  >
                    <div className="flex items-center space-x-5">
                      <div className="text-5xl">{cls.image}</div>
                      <div>
                        <div className="font-bold text-lg text-neutral-900">{cls.name}</div>
                        <div className="text-sm text-neutral-500 flex items-center mt-1">
                          <User size={14} className="mr-1" /> {cls.capacity} max
                        </div>
                      </div>
                    </div>
                    {price !== null && (
                      <div className="text-right">
                        <div className="font-bold text-xl text-neutral-900">${(price / 100).toFixed(2)}</div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Driver */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-6 text-neutral-900 tracking-tight">Select a Driver</h1>
            
            <button 
              onClick={() => setSelectedDriverId(null)}
              className={`w-full text-left p-5 border rounded-2xl transition-all duration-200 ${selectedDriverId === null ? 'border-brand ring-2 ring-brand bg-neutral-50 shadow-md' : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-sm'}`}
            >
              <div className="font-bold text-lg">Any Available Driver</div>
              <div className="text-sm text-neutral-500 mt-1">We'll assign the highest rated driver for your class.</div>
            </button>

            {drivers.map(drv => (
              <button 
                key={drv.id}
                onClick={() => setSelectedDriverId(drv.id)}
                className={`w-full text-left p-5 border rounded-2xl flex items-center space-x-5 transition-all duration-200 ${selectedDriverId === drv.id ? 'border-brand ring-2 ring-brand bg-neutral-50 shadow-md' : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-sm'}`}
              >
                <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center text-2xl border">👤</div>
                <div>
                  <div className="font-bold text-lg flex items-center">
                    {drv.name} <span className="ml-3 text-xs bg-brand text-white px-2 py-1 rounded-md font-semibold flex items-center">★ {drv.rating}</span>
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">{drv.bio}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 6: Preferences */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-2 text-neutral-900 tracking-tight">Trip Preferences</h1>
            <p className="text-sm text-neutral-500 mb-8">Let us know how to make your trip comfortable.</p>

            <div className="space-y-6">
              <div>
                <label htmlFor="pref-beverage" className="block text-sm font-semibold mb-2 text-neutral-700">Beverage</label>
                <select id="pref-beverage" value={preferences.beverage} onChange={e => setPreferences({...preferences, beverage: e.target.value})} className="w-full border p-4 rounded-xl outline-none bg-white shadow-sm focus:ring-2 focus:ring-brand">
                  <option value="no_preference">No preference</option>
                  <option value="none">No beverage needed</option>
                  <option value="water_still">Still Water</option>
                  <option value="water_sparkling">Sparkling Water</option>
                  <option value="soda">Soda</option>
                  <option value="coffee">Coffee</option>
                </select>
              </div>

              <div>
                <label htmlFor="pref-conversation" className="block text-sm font-semibold mb-2 text-neutral-700">Conversation</label>
                <select id="pref-conversation" value={preferences.conversation} onChange={e => setPreferences({...preferences, conversation: e.target.value})} className="w-full border p-4 rounded-xl outline-none bg-white shadow-sm focus:ring-2 focus:ring-brand">
                  <option value="silent">Silent ride</option>
                  <option value="greeting_only">Greeting only</option>
                  <option value="chatty">Happy to chat</option>
                  <option value="no_preference">Driver's Discretion</option>
                </select>
              </div>

              <div>
                <label htmlFor="pref-greeting" className="block text-sm font-semibold mb-2 text-neutral-700">Greeting Style</label>
                <select id="pref-greeting" value={preferences.greeting} onChange={e => setPreferences({...preferences, greeting: e.target.value})} className="w-full border p-4 rounded-xl outline-none bg-white shadow-sm focus:ring-2 focus:ring-brand">
                  <option value="no_preference">Standard</option>
                  <option value="curbside">Curbside (Wait by vehicle)</option>
                  <option value="meet_inside">Meet inside (Lobby/Baggage)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Review */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-4 text-neutral-900 tracking-tight">Review & Confirm</h1>
            
            <div className="bg-neutral-50 p-6 rounded-2xl border space-y-4 shadow-inner">
              <div className="flex justify-between text-sm items-center border-b pb-3">
                <span className="text-neutral-500  text-xs font-bold">Pickup</span>
                <span className="font-semibold text-right text-neutral-900 max-w-[200px] truncate">{pickupAddress || "Not specified"}</span>
              </div>
              <div className="flex justify-between text-sm items-center border-b pb-3">
                <span className="text-neutral-500  text-xs font-bold">Date & Time</span>
                <span className="font-semibold text-neutral-900">{pickupDate} at {pickupTime}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-neutral-500  text-xs font-bold">Vehicle</span>
                <span className="font-semibold text-neutral-900">{availableClasses.find(c => c.id === selectedClassId)?.name}</span>
              </div>
            </div>

            {quote && (
              <div className="border rounded-2xl p-6 bg-white shadow-sm">
                <h3 className="font-bold mb-5 text-lg border-b pb-3">Payment Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Base Fare</span>
                    <span className="font-bold">${(quote.subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  {quote.lineItems.map((li, i) => (
                    <div key={i} className="flex justify-between text-neutral-600">
                      <span>{li.label}</span>
                      <span>${(li.amountCents / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-4 mt-4 border-t flex justify-between font-bold text-2xl text-neutral-900">
                    <span>Total</span>
                    <span>${(quote.estimatedTotalCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-neutral-500 text-center font-medium bg-neutral-50 p-3 rounded-lg">
              By confirming, a hold will be placed on your default payment method.
            </p>
          </div>
        )}

        {/* STEP 8: Payment */}
        {currentStep === 7 && clientSecret && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold mb-4 text-neutral-900 tracking-tight">Payment Details</h1>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm clientSecret={clientSecret} />
            </Elements>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      {currentStep < 7 && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-md border-t flex justify-between max-w-md mx-auto z-20">
          {currentStep < steps.length - 2 ? (
            <button 
              onClick={handleNext} 
              disabled={loading || (currentStep === 1 && (!pickupAddressObj || !pickupDate || !pickupTime))}
              className="w-full bg-brand text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-neutral-800 active:scale-[0.98] disabled:bg-neutral-300 disabled:active:scale-100 transition-all shadow-lg"
            >
              Continue <ArrowRight size={20} className="ml-2" />
            </button>
          ) : (
            <button 
              onClick={handleConfirm}
              disabled={loading || !quote}
              className="w-full bg-brand text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-neutral-800 active:scale-[0.98] disabled:bg-neutral-300 disabled:active:scale-100 transition-all shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : "Confirm & Book"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
