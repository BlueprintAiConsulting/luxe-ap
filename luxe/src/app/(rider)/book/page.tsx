// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase/client";
import { Loader2, ArrowLeft, ArrowRight, User } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { 
  QuoteInput, 
  PriceBreakdown,
  CreateReservationInput, 
  Address,
  defaultPreferences
} from "@/lib/types";

const mockAddress = (line1: string): Address => ({
  line1,
  city: "San Francisco",
  state: "CA",
  postalCode: "94105",
  lat: 37.7749,
  lng: -122.4194,
  formatted: line1,
  placeId: null,
  line2: null,
  postalCode: "94105",
  airportCode: null,
  notes: null
});

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_mock");

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
      confirmParams: {
        return_url: `${window.location.origin}/reservations`,
      },
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
      <button disabled={!stripe || loading} className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-300 transition-colors">
        {loading ? <Loader2 className="animate-spin" size={20} /> : "Submit Payment"}
      </button>
    </form>
  );
}

const steps = [
  "Trip Type",
  "Logistics",
  "Passengers",
  "Vehicle",
  "Driver",
  "Preferences",
  "Review",
  "Payment"
];

export default function BookPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const functions = getFunctions(app);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [tripType, setTripType] = useState<"point_to_point" | "hourly" | "airport_arrival" | "airport_departure">("point_to_point");
  const [pickupInput, setPickupInput] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);
  const [flightNumber, setFlightNumber] = useState("");

  const [availableClasses] = useState([
    { id: "luxury_sedan", name: "Luxury Sedan", capacity: 3, image: "🚗" },
    { id: "luxury_suv", name: "Luxury SUV", capacity: 6, image: "🚙" },
    { id: "sprinter", name: "Executive Sprinter", capacity: 12, image: "🚐" }
  ]);
  const [selectedClassId, setSelectedClassId] = useState("luxury_sedan");
  const [quote, setQuote] = useState<PriceBreakdown | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null); // null means "Any available"
  const [drivers] = useState([
    { id: "driver_1", name: "James S.", rating: 4.9, bio: "15 years experience" },
    { id: "driver_2", name: "Maria G.", rating: 5.0, bio: "Fluent in English, Spanish" }
  ]);

  const [preferences, setPreferences] = useState({
    beverage: undefined?.beverage?.preference || "no_preference",
    conversation: undefined?.conversation || "no_preference",
    greeting: undefined?.greeting?.style || "no_preference"
  });

  const handleNext = async () => {
    setError(null);
    if (currentStep === 2) {
      // Transitioning to Vehicle step. Let's fetch a quote for the selected class (default first)
      await fetchQuote("luxury_sedan");
    }
    setCurrentStep(c => Math.min(c + 1, steps.length - 1));
  };

  const handleBack = () => setCurrentStep(c => Math.max(c - 1, 0));

  const fetchQuote = async (classId: string) => {
    setLoading(true);
    setError(null);
    try {
      const createQuote = httpsCallable(functions, "createQuote");
      
      let pDate = new Date();
      if (pickupDate && pickupTime) {
        pDate = new Date(`${pickupDate}T${pickupTime}`);
      }

      const input: QuoteInput = {
        tripType,
        pickupAt: pDate.toISOString(),
        timezone: "America/Los_Angeles",
        classId,
        estimatedDistanceMiles: 15, // mocked
        estimatedDurationMinutes: 30, // mocked
        airportCode: tripType.includes("airport") ? "SFO" : undefined
      };

      const res = await createQuote(input);
      setQuote(res.data as PriceBreakdown);
      setSelectedClassId(classId);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Failed to fetch quote");
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (classId: string) => {
    if (classId === selectedClassId) return;
    await fetchQuote(classId);
  };

  const handleConfirm = async () => {
    if (!quote) return;
    setLoading(true);
    setError(null);

    try {
      const createReservation = httpsCallable(functions, "createReservation");
      let pDate = new Date();
      if (pickupDate && pickupTime) {
        pDate = new Date(`${pickupDate}T${pickupTime}`);
      }

      const quoteInput: QuoteInput = {
        tripType,
        pickupAt: pDate.toISOString(),
        timezone: "America/Los_Angeles",
        classId: selectedClassId,
        estimatedDistanceMiles: 15,
        estimatedDurationMinutes: 30,
        airportCode: tripType.includes("airport") ? "SFO" : undefined
      };

      // eslint-disable-next-line react-hooks/purity
      const idempotencyKey = "idempotency_" + Math.random().toString(36).substring(7);
      
      const resInput: CreateReservationInput = {
        idempotencyKey,
        quote: quoteInput,
        pickup: mockAddress(pickupInput || "123 Main St"),
        dropoff: dropoffInput ? mockAddress(dropoffInput) : null,
        stops: [],
        passengers,
        luggage,
        flightNumber: flightNumber || null,
        preferences: {
          ...(undefined || defaultPreferences),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          beverage: { ...(undefined?.beverage || defaultPreferences.beverage), preference: preferences.beverage as any },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          conversation: preferences.conversation as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          greeting: { ...(undefined?.greeting || defaultPreferences.greeting), style: preferences.greeting as any }
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
      setLoading(false);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Failed to create reservation");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <button onClick={handleBack} disabled={currentStep === 0} className="p-2 disabled:opacity-30">
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-sm">Step {currentStep + 1} of {steps.length}</span>
        <div className="w-8" /> {/* spacer */}
      </div>
      
      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-100">
        <div className="h-1 bg-black transition-all" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm border border-red-200">
            {error}
          </div>
        )}

        {/* STEP 1: Trip Type */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-6">Where are you going?</h1>
            
            {(["point_to_point", "hourly", "airport_arrival", "airport_departure"] as const).map(type => (
              <label key={type} className={`block p-4 border rounded-xl cursor-pointer transition-all ${tripType === type ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3">
                  <input type="radio" name="tripType" value={type} checked={tripType === type} onChange={() => setTripType(type)} className="w-4 h-4 text-black" />
                  <span className="font-medium capitalize">{type.replace(/_/g, " ")}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* STEP 2: Logistics */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-6">Trip Details</h1>
            
            <div>
              <label className="block text-sm font-medium mb-1">Pickup Address</label>
              <input type="text" value={pickupInput} onChange={e => setPickupInput(e.target.value)} placeholder="123 Main St" className="w-full border p-3 rounded-lg focus:ring-1 focus:ring-black outline-none" />
            </div>

            {tripType !== 'hourly' && (
              <div>
                <label className="block text-sm font-medium mb-1">Dropoff Address</label>
                <input type="text" value={dropoffInput} onChange={e => setDropoffInput(e.target.value)} placeholder="456 Market St" className="w-full border p-3 rounded-lg focus:ring-1 focus:ring-black outline-none" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full border p-3 rounded-lg outline-none bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full border p-3 rounded-lg outline-none bg-white" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Passengers & Flight */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-6">Passengers & Bags</h1>
            
            <div className="flex justify-between items-center p-4 border rounded-xl">
              <span className="font-medium">Passengers</span>
              <div className="flex items-center space-x-4">
                <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center">-</button>
                <span className="w-4 text-center">{passengers}</span>
                <button onClick={() => setPassengers(passengers + 1)} className="w-8 h-8 rounded-full border flex items-center justify-center">+</button>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 border rounded-xl">
              <span className="font-medium">Luggage</span>
              <div className="flex items-center space-x-4">
                <button onClick={() => setLuggage(Math.max(0, luggage - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center">-</button>
                <span className="w-4 text-center">{luggage}</span>
                <button onClick={() => setLuggage(luggage + 1)} className="w-8 h-8 rounded-full border flex items-center justify-center">+</button>
              </div>
            </div>

            {tripType.includes("airport") && (
              <div className="pt-4">
                <label className="block text-sm font-medium mb-1">Flight Number (Optional)</label>
                <input type="text" value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="e.g. DL 1234" className="w-full border p-3 rounded-lg outline-none" />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Vehicle */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-6">Select a Vehicle</h1>
            
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : (
              <div className="space-y-3">
                {availableClasses.map(cls => (
                  <button 
                    key={cls.id}
                    onClick={() => handleClassSelect(cls.id)}
                    className={`w-full text-left p-4 border rounded-xl flex items-center justify-between transition-all ${selectedClassId === cls.id ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{cls.image}</div>
                      <div>
                        <div className="font-bold">{cls.name}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <User size={12} className="mr-1" /> {cls.capacity} max
                        </div>
                      </div>
                    </div>
                    {quote && selectedClassId === cls.id && (
                      <div className="text-right">
                        <div className="font-bold text-lg">${(quote.estimatedTotalCents / 100).toFixed(2)}</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Driver */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-6">Select a Driver</h1>
            
            <button 
              onClick={() => setSelectedDriverId(null)}
              className={`w-full text-left p-4 border rounded-xl transition-all ${selectedDriverId === null ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200'}`}
            >
              <div className="font-bold">Any Available Driver</div>
              <div className="text-sm text-gray-500">We&apos;ll assign the highest rated driver for your class.</div>
            </button>

            {drivers.map(drv => (
              <button 
                key={drv.id}
                onClick={() => setSelectedDriverId(drv.id)}
                className={`w-full text-left p-4 border rounded-xl flex items-center space-x-4 transition-all ${selectedDriverId === drv.id ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200'}`}
              >
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">👤</div>
                <div>
                  <div className="font-bold flex items-center">
                    {drv.name} <span className="ml-2 text-xs bg-black text-white px-2 py-0.5 rounded-full">★ {drv.rating}</span>
                  </div>
                  <div className="text-sm text-gray-500">{drv.bio}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 6: Preferences */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-2">Trip Preferences</h1>
            <p className="text-sm text-gray-500 mb-6">Let us know how to make your trip comfortable.</p>

            <div>
              <label className="block text-sm font-medium mb-1">Beverage</label>
              <select value={preferences.beverage} onChange={e => setPreferences({...preferences, beverage: e.target.value})} className="w-full border p-3 rounded-lg outline-none bg-white">
                <option value="no_preference">No preference</option>
                <option value="none">No beverage needed</option>
                <option value="water_still">Still Water</option>
                <option value="water_sparkling">Sparkling Water</option>
                <option value="soda">Soda</option>
                <option value="coffee">Coffee</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Conversation</label>
              <select value={preferences.conversation} onChange={e => setPreferences({...preferences, conversation: e.target.value})} className="w-full border p-3 rounded-lg outline-none bg-white">
                <option value="silent">Silent ride</option>
                <option value="greeting_only">Greeting only</option>
                <option value="chatty">Happy to chat</option>
                <option value="no_preference">Driver&apos;s Discretion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Greeting Style</label>
              <select value={preferences.greeting} onChange={e => setPreferences({...preferences, greeting: e.target.value})} className="w-full border p-3 rounded-lg outline-none bg-white">
                <option value="no_preference">Standard</option>
                <option value="curbside">Curbside (Wait by vehicle)</option>
                <option value="meet_inside">Meet inside (Lobby/Baggage)</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 7: Review */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-2">Review & Confirm</h1>
            
            <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pickup</span>
                <span className="font-medium text-right">{pickupInput || "Not specified"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date & Time</span>
                <span className="font-medium">{pickupDate} at {pickupTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-medium">{availableClasses.find(c => c.id === selectedClassId)?.name}</span>
              </div>
            </div>

            {quote && (
              <div className="border rounded-xl p-4">
                <h3 className="font-bold mb-3">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Fare</span>
                    <span>${(quote.baseCents / 100).toFixed(2)}</span>
                  </div>
                  {quote.lineItems.map((li, i) => (
                    <div key={i} className="flex justify-between text-gray-600">
                      <span>{li.name}</span>
                      <span>{formatMoney(li.amountCents)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${(quote.estimatedTotalCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 text-center">
              By confirming, a hold will be placed on your default payment method.
            </p>
          </div>
        )}

        {/* STEP 8: Payment */}
        {currentStep === 7 && clientSecret && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold mb-2">Payment Details</h1>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm clientSecret={clientSecret} />
            </Elements>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      {currentStep < 7 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-between max-w-md mx-auto">
          {currentStep < steps.length - 2 ? (
            <button 
              onClick={handleNext} 
              disabled={loading || (currentStep === 1 && (!pickupInput || !pickupDate || !pickupTime))}
              className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              Continue <ArrowRight size={18} className="ml-2" />
            </button>
          ) : (
            <button 
              onClick={handleConfirm}
              disabled={loading || !quote}
              className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Confirm & Book"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
