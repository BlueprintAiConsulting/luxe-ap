"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface UseDriverLocationTrackerProps {
  driverId: string | null;
  driverName?: string | null;
  vehicleDescription?: string | null;
  reservationId: string | null;
  status: string;
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
  enabled?: boolean;
}

export interface DriverCoords {
  lat: number;
  lng: number;
  heading: number;
  speedMph: number;
  accuracy: number;
}

export function useDriverLocationTracker({
  driverId,
  driverName,
  vehicleDescription,
  reservationId,
  status,
  pickupCoords,
  dropoffCoords,
  enabled = true,
}: UseDriverLocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<DriverCoords | null>(null);
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const lastWriteTimeRef = useRef<number>(0);
  const simProgressRef = useRef<number>(0.1);
  const watchIdRef = useRef<number | null>(null);

  // Write telemetry to Firestore
  const writeLocationToFirestore = useCallback(
    async (coords: DriverCoords) => {
      if (!driverId) return;

      const now = Date.now();
      // Throttle writes to at most once every 3000ms
      if (now - lastWriteTimeRef.current < 3000) return;
      lastWriteTimeRef.current = now;

      try {
        await setDoc(
          doc(db, "driverLocations", driverId),
          {
            driverId,
            driverName: driverName || "Executive Chauffeur",
            vehicleDescription: vehicleDescription || "Cadillac Escalade ESV / Mercedes S-Class",
            reservationId: reservationId || null,
            status,
            lat: coords.lat,
            lng: coords.lng,
            headingDegrees: coords.heading,
            speedMph: coords.speedMph,
            accuracyMeters: coords.accuracy,
            recordedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setCurrentCoords(coords);
        setLastPingAt(new Date());
      } catch (err: any) {
        console.warn("Failed to stream GPS location to Firestore:", err);
      }
    },
    [driverId, driverName, vehicleDescription, reservationId, status]
  );

  // Real Hardware GPS Watcher
  useEffect(() => {
    if (!enabled || !driverId || isSimulating || status === "completed" || status === "cancelled") {
      if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setPermissionError("Geolocation is not supported by this browser.");
      return;
    }

    setIsTracking(true);
    setPermissionError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const speedMps = position.coords.speed || 0;
        const speedMph = Math.round(speedMps * 2.23694);
        const heading = position.coords.heading || 0;

        const coords: DriverCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading,
          speedMph,
          accuracy: Math.round(position.coords.accuracy || 5),
        };

        writeLocationToFirestore(coords);
      },
      (error) => {
        console.warn("Geolocation watch error:", error.message);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionError("Location permission denied. Tap 'Simulate GPS' to demo live tracking.");
        } else {
          setPermissionError(error.message);
        }
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, driverId, isSimulating, status, writeLocationToFirestore]);

  // Simulated GPS Telemetry Generator (for Demo / Client walkthroughs)
  useEffect(() => {
    if (!isSimulating || !driverId) return;

    // Default Anchor: LAX to Beverly Hills Corridor if coords not supplied
    const origin = pickupCoords?.lat ? pickupCoords : { lat: 33.9425, lng: -118.4080 };
    const dest = dropoffCoords?.lat ? dropoffCoords : { lat: 34.0736, lng: -118.4004 };

    const interval = setInterval(() => {
      simProgressRef.current += 0.015;
      if (simProgressRef.current >= 0.98) {
        simProgressRef.current = 0.05; // Loop for continuous demo
      }

      const p = simProgressRef.current;
      // Interpolate with slight curve
      const lat = origin.lat + (dest.lat - origin.lat) * p + Math.sin(p * Math.PI) * 0.012;
      const lng = origin.lng + (dest.lng - origin.lng) * p + Math.cos(p * Math.PI) * 0.008;

      // Calculate bearing/heading
      const dLng = dest.lng - origin.lng;
      const dLat = dest.lat - origin.lat;
      let heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
      if (heading < 0) heading += 360;

      const speedMph = Math.round(42 + Math.sin(p * 10) * 8);

      const coords: DriverCoords = {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        heading,
        speedMph,
        accuracy: 3,
      };

      writeLocationToFirestore(coords);
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, driverId, pickupCoords, dropoffCoords, writeLocationToFirestore]);

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
  };

  return {
    isTracking,
    isSimulating,
    currentCoords,
    lastPingAt,
    permissionError,
    toggleSimulation,
  };
}
