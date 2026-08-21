export interface VehicleAnglePhoto {
  angleDeg: number;
  label: string;
  imageUrl: string;
  tagline: string;
}

export interface VehicleShowcaseData {
  id: string;
  classId: "suv" | "sedan" | "sprinter";
  name: string;
  model: string;
  tagline: string;
  priceEstimate: string;
  passengers: number;
  luggage: number;
  heroImage: string;
  angles: VehicleAnglePhoto[];
  interiorSnapshots: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    tag: string;
  }[];
  hotspots: {
    x: number; // 0 to 100% position on hero image
    y: number;
    title: string;
    detail: string;
  }[];
  specs: {
    label: string;
    value: string;
    detail: string;
  }[];
}

export const LUXURY_FLEET_SHOWCASE: VehicleShowcaseData[] = [
  {
    id: "escalade_esv",
    classId: "suv",
    name: "Cadillac Escalade ESV",
    model: "Sport Platinum Edition (Extended Wheelbase)",
    tagline: "The pinnacle of American executive luxury with extended rear legroom and Starline sky.",
    priceEstimate: "$195.00 Base Charter",
    passengers: 6,
    luggage: 6,
    heroImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=85",
    angles: [
      {
        angleDeg: 45,
        label: "Front 3/4 Stance",
        imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=85",
        tagline: "Galvano gloss-black mesh grille with illuminated Cadillac crest and LED blades.",
      },
      {
        angleDeg: 90,
        label: "Side Profile (ESV)",
        imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=85",
        tagline: "+15.9 inches extended wheelbase with 22-inch 12-spoke polished dark finish alloy wheels.",
      },
      {
        angleDeg: 0,
        label: "Front Grille",
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=85",
        tagline: "Acoustic laminated double-pane windshield with active aerodynamic cooling shutters.",
      },
      {
        angleDeg: 180,
        label: "Rear Departure",
        imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1400&q=85",
        tagline: "Full-height vertical OLED tail blades and power gesture liftgate for 6 full-size trunks.",
      },
    ],
    interiorSnapshots: [
      {
        id: "starline",
        title: "Starline Fiber-Optic Starlight Ceiling",
        description: "Thousands of individually woven optical fibers creating a bespoke celestial twilight glow throughout the rear cabin.",
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
        tag: "Bespoke Lighting",
      },
      {
        id: "massage_seats",
        title: "16-Way Executive Heated & Chilled Massage Recliners",
        description: "Semi-aniline leather captain chairs with multiple pneumatic hot-stone massage programs and motorized footrests.",
        imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80",
        tag: "Seating Comfort",
      },
      {
        id: "refreshment",
        title: "Curbside Refreshment & Chilled Bar Console",
        description: "Always stocked with chilled Fiji Water, San Pellegrino sparkling, artisan mints, and sanitized warm towel service.",
        imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80",
        tag: "In-Cabin Service",
      },
      {
        id: "theatre",
        title: "Dual 12.6-Inch OLED Rear Entertainment Theatres",
        description: "High-definition streaming displays with HDMI conference inputs, Bluetooth audio, and Starlink satellite connection.",
        imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
        tag: "Executive Tech",
      },
      {
        id: "audio",
        title: "AKG Studio Reference 36-Speaker 3D Surround Audio",
        description: "Acoustically tuned cabin with 3D spatial surround sound and active road noise cancellation.",
        imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1000&q=80",
        tag: "Studio Acoustic",
      },
    ],
    hotspots: [
      { x: 30, y: 48, title: "Galvano Chrome Mesh Grille", detail: "Signature illuminated Cadillac shield with active aerodynamic shutters." },
      { x: 60, y: 55, title: "Extended ESV Wheelbase (+15.9\")", detail: "+15.9 inches of additional rear cabin stretch and luggage volume." },
      { x: 80, y: 38, title: "Acoustic Double-Pane Glass", detail: "Double-laminated windows creating a 54 dB whisper-quiet cabin." },
    ],
    specs: [
      { label: "Cabin Decibel", value: "54 dB", detail: "Whisper-quiet acoustic glass" },
      { label: "Luggage Space", value: "6 Trunks", detail: "Full Rimowa / Tumi set" },
      { label: "Powertrain", value: "6.2L V8", detail: "420 HP smooth acceleration" },
    ],
  },
  {
    id: "mercedes_s580",
    classId: "sedan",
    name: "Mercedes-Benz S 580 4MATIC",
    model: "Executive Flagship Sedan",
    tagline: "The benchmark of ultra-luxury ground travel, engineered for presidential discretion and serene comfort.",
    priceEstimate: "$155.00 Base Charter",
    passengers: 3,
    luggage: 3,
    heroImage: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=85",
    angles: [
      {
        angleDeg: 45,
        label: "Front 3/4 Hero",
        imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=85",
        tagline: "Obsidian Black metallic finish with DIGITAL LIGHT 1.3M micro-mirror optics.",
      },
      {
        angleDeg: 90,
        label: "Side Profile",
        imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1400&q=85",
        tagline: "Long-wheelbase chassis with motorized flush door handles and soft-close latching.",
      },
      {
        angleDeg: 0,
        label: "Front Chrome Grille",
        imageUrl: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1400&q=85",
        tagline: "Iconic three-point star with integrated long-range radar and night vision sensors.",
      },
    ],
    interiorSnapshots: [
      {
        id: "maybach_seating",
        title: "Chauffeur Package Executive Rear Lounge",
        description: "Right-side executive rear seat recline up to 43.5 degrees with motorized calf rest and neck warmers.",
        imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80",
        tag: "First Class Seating",
      },
      {
        id: "burmester",
        title: "Burmester High-End 4D Spatial Sound System",
        description: "31 high-performance speakers with resonant seat bass transducers for immersive concert hall audio.",
        imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1000&q=80",
        tag: "4D Spatial Audio",
      },
      {
        id: "ambient_light",
        title: "Active Multi-Color Ambient Illumination",
        description: "64-color ambient light fibers pulsing gently with climate control changes and calming twilight gradients.",
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
        tag: "Lighting Architecture",
      },
      {
        id: "rear_tablet",
        title: "MBUX Touch Command 7-Inch Rear Tablet",
        description: "Removable rear central tablet to control climate, rear power blinds, media, and navigation telemetry.",
        imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
        tag: "Smart Control",
      },
    ],
    hotspots: [
      { x: 35, y: 50, title: "DIGITAL LIGHT LED Headlamps", detail: "1.3 million micro-mirror projection with welcome lighting." },
      { x: 65, y: 48, title: "Flush Motorized Door Handles", detail: "Electrically extend seamlessly upon VIP passenger approach." },
      { x: 80, y: 35, title: "AIRMATIC Adaptive Suspension", detail: "Cloud-like road isolation absorbing road imperfections." },
    ],
    specs: [
      { label: "Cabin Decibel", value: "52 dB", detail: "Industry-leading acoustic glass" },
      { label: "Luggage Space", value: "3 Trunks", detail: "Checked luggage + carry-ons" },
      { label: "Engine", value: "4.0L Biturbo", detail: "496 HP with EQ Boost Hybrid" },
    ],
  },
  {
    id: "sprinter_jet",
    classId: "sprinter",
    name: "Mercedes-Benz Sprinter 3500",
    model: "Custom Executive Jet Edition",
    tagline: "A corporate boardroom on wheels with full standing headroom, privacy partition, and 4K display.",
    priceEstimate: "$285.00 Base Charter",
    passengers: 14,
    luggage: 14,
    heroImage: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1400&q=85",
    angles: [
      {
        angleDeg: 45,
        label: "Front 3/4 Executive",
        imageUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1400&q=85",
        tagline: "High-roof jet stance with dark executive matte accents and automatic power entrance step.",
      },
      {
        angleDeg: 90,
        label: "Extended Salon Profile",
        imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=85",
        tagline: "170-inch extended wheelbase with privacy limousine glass and overhead climate nacelles.",
      },
    ],
    interiorSnapshots: [
      {
        id: "jet_lounge",
        title: "Bespoke Italian Leather Captain Chairs",
        description: "Custom diamond-quilted Maybach-style reclining captain chairs with motorized leg rests and solid wood folding desks.",
        imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80",
        tag: "Boardroom Seating",
      },
      {
        id: "tv_screen",
        title: "43-Inch 4K Smart Display & Apple TV Conference Cast",
        description: "Direct HDMI / AirPlay casting for executive board presentations, live news broadcasts, and film screenings.",
        imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
        tag: "Mobile Boardroom",
      },
      {
        id: "partition",
        title: "Electric Privacy Partition Wall & Intercom",
        description: "Complete acoustic isolation between passenger salon and driver cockpit for confidential conversations.",
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
        tag: "Total Privacy",
      },
    ],
    hotspots: [
      { x: 30, y: 40, title: "6ft 4in Standing Headroom", detail: "Walk-in luxury cabin with motorized automatic entrance step." },
      { x: 65, y: 45, title: "Acoustic Partition Wall", detail: "Complete sound isolation between passenger salon and driver." },
      { x: 85, y: 55, title: "Rear VIP Cargo Bay", detail: "Accommodates up to 14 checked flight cases with ease." },
    ],
    specs: [
      { label: "Headroom", value: "6 ft 4 in", detail: "Full upright standing height" },
      { label: "Capacity", value: "14 Guests", detail: "Individual captain recliners" },
      { label: "Luggage Space", value: "14 Trunks", detail: "Dedicated rear cargo bay" },
    ],
  },
];
