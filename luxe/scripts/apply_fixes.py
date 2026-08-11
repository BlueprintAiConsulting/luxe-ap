import re

def update_file():
    with open('src/app/(rider)/book/page.tsx', 'r') as f:
        content = f.read()

    # 1. Remove @ts-nocheck
    content = content.replace('// @ts-nocheck\n', '')

    # 2. Add imports
    content = content.replace(
        'import { doc, getDoc } from "firebase/firestore";',
        'import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";'
    )

    # 3. Add timezone
    content = content.replace(
        'const steps = ["Trip Type", "Logistics", "Passengers", "Vehicle", "Driver", "Preferences", "Review", "Payment"];',
        'const steps = ["Trip Type", "Logistics", "Passengers", "Vehicle", "Driver", "Preferences", "Review", "Payment"];\nconst timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;'
    )
    content = content.replace('"America/Los_Angeles"', 'timezone')

    # 4. State updates
    state_replacements = """  // Logistics
  const [pickupAddressObj, setPickupAddressObj] = useState<Address | null>(null);
  const [dropoffAddressObj, setDropoffAddressObj] = useState<Address | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");"""
    content = content.replace('  // Logistics\n  const [pickupAddress, setPickupAddress] = useState("");', state_replacements)

    driver_replacements = """  const [drivers, setDrivers] = useState<{id: string, name: string, rating: number, bio: string}[]>([]);
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
  }, []);"""
    content = re.sub(
        r'  const \[drivers\] = useState\(\[\s*\{ id: "driver_1".*?\},\s*\{ id: "driver_2".*?\}\s*\]\);',
        driver_replacements,
        content,
        flags=re.DOTALL
    )

    pref_state = """  const [preferences, setPreferences] = useState({
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
  }, [user]);"""
    content = re.sub(
        r'  const \[preferences, setPreferences\] = useState\(\{\s*beverage: "no_preference",\s*conversation: "no_preference",\s*greeting: "no_preference"\s*\}\);',
        pref_state,
        content,
        flags=re.DOTALL
    )

    # 5. Place helpers and route calc
    helpers = """const extractAirportCode = (place: google.maps.places.PlaceResult): string | null => {
  const name = place.name || "";
  const match = name.match(/\\(([A-Z]{3})\\)/);
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
  };"""
    content = re.sub(
        r'  const calculateRoute = useCallback\(\(\) => \{.*?  const onDropoffPlaceChanged = \(\) => \{.*?  \};',
        helpers,
        content,
        flags=re.DOTALL
    )

    # 6. Quotes and Airport Codes
    # Replace airportCode: tripType.includes("airport") ? "LAX" : null
    content = content.replace(
        'airportCode: tripType.includes("airport") ? "LAX" : null,',
        'airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || null) : null,'
    )
    content = content.replace(
        'airportCode: tripType.includes("airport") ? "LAX" : undefined,',
        'airportCode: tripType.includes("airport") ? (pickupAddressObj?.airportCode || dropoffAddressObj?.airportCode || undefined) : undefined,'
    )

    # 7. handleConfirm
    format_addr_str = """      const formatAddress = (addr: string): Address => ({
        line1: addr,
        city: "", state: "", postalCode: "",
        lat: 0, lng: 0, formatted: addr,
        placeId: null, line2: null, airportCode: null, notes: null
      });

      const resInput: CreateReservationInput = {
        idempotencyKey,
        quote: quoteInput,
        pickup: formatAddress(pickupAddress),
        dropoff: dropoffAddress ? formatAddress(dropoffAddress) : null,"""
    
    new_res_input = """      const resInput: CreateReservationInput = {
        idempotencyKey,
        quote: quoteInput,
        requestedDriverId: selectedDriverId,
        pickup: pickupAddressObj!,
        dropoff: dropoffAddressObj || null,"""
    
    content = content.replace(format_addr_str, new_res_input)

    # Preferences merge
    old_prefs = """        preferences: {
          beverage: { preference: preferences.beverage },
          conversation: preferences.conversation,
          greeting: { style: preferences.greeting }
        },"""
    new_prefs = """        preferences: {
          ...(savedFullPreferences || defaultPreferences),
          beverage: { ...(savedFullPreferences?.beverage || defaultPreferences.beverage), preference: preferences.beverage },
          conversation: preferences.conversation,
          greeting: { ...(savedFullPreferences?.greeting || defaultPreferences.greeting), style: preferences.greeting }
        },"""
    content = content.replace(old_prefs, new_prefs)
    
    # 8. Button disable
    content = content.replace(
        'disabled={loading || (currentStep === 1 && (!pickupAddress || !pickupDate || !pickupTime))}',
        'disabled={loading || (currentStep === 1 && (!pickupAddressObj || !pickupDate || !pickupTime))}'
    )

    with open('src/app/(rider)/book/page.tsx', 'w') as f:
        f.write(content)

update_file()
