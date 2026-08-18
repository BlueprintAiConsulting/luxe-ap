"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoDispatchReservation = exports.findBestDriverMatches = exports.createAdminReservation = exports.adminOverrideStatus = exports.assignDriverAndVehicle = void 0;
exports.calculateDistanceMiles = calculateDistanceMiles;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const admin_1 = require("../lib/admin");
const adminDb = admin_1.admin.firestore();
const assignSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
    driverId: zod_1.z.string(),
    vehicleId: zod_1.z.string(),
});
exports.assignDriverAndVehicle = (0, https_1.onCall)(async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can assign drivers.");
    }
    const data = assignSchema.parse(request.data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return adminDb.runTransaction(async (t) => {
        const reservationRef = adminDb.collection("reservations").doc(data.reservationId);
        const reservationDoc = await t.get(reservationRef);
        if (!reservationDoc.exists) {
            throw new https_1.HttpsError("not-found", "Reservation not found.");
        }
        const reservation = reservationDoc.data();
        if (reservation.status === "completed" || reservation.status === "cancelled" || reservation.status === "no_show") {
            throw new https_1.HttpsError("failed-precondition", "Cannot assign a finished reservation.");
        }
        // 1. Fetch Driver and Vehicle details
        const driverDoc = await t.get(adminDb.collection("drivers").doc(data.driverId));
        if (!driverDoc.exists) {
            throw new https_1.HttpsError("not-found", "Driver not found.");
        }
        const driver = driverDoc.data();
        const vehicleDoc = await t.get(adminDb.collection("vehicles").doc(data.vehicleId));
        if (!vehicleDoc.exists) {
            throw new https_1.HttpsError("not-found", "Vehicle not found.");
        }
        const vehicle = vehicleDoc.data();
        // 2. Overlap Check
        // Get bounds for the day of this reservation's pickup to minimize reads
        const pTime = reservation.pickupAt;
        const pickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
        // Determine the start and end of the UTC day for the query
        const startOfDay = new Date(pickupDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(pickupDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        const sameDayTripsSnapshot = await t.get(adminDb.collection("reservations")
            .where("pickupAt", ">=", startOfDay)
            .where("pickupAt", "<=", endOfDay)
            .where("status", "in", ["confirmed", "assigned", "en_route", "arrived", "onboard"]));
        // Calculate this trip's exact window
        const durationSec = reservation.estimatedDurationSeconds || 3600;
        // Add a 1-hour buffer to start and end
        const tripStart = pickupDate.getTime() - (60 * 60 * 1000);
        const tripEnd = pickupDate.getTime() + (durationSec * 1000) + (60 * 60 * 1000);
        for (const doc of sameDayTripsSnapshot.docs) {
            if (doc.id === data.reservationId)
                continue;
            const other = doc.data();
            // If the other trip doesn't involve our driver or vehicle, skip
            if (other.driverId !== data.driverId && other.vehicleId !== data.vehicleId)
                continue;
            const otherPTime = other.pickupAt;
            const otherStart = (typeof otherPTime?.toDate === "function" ? otherPTime.toDate() : new Date(otherPTime)).getTime();
            const otherDuration = other.estimatedDurationSeconds || 3600;
            const otherEnd = otherStart + (otherDuration * 1000);
            // Check overlap
            const overlaps = tripStart < otherEnd && tripEnd > otherStart;
            if (overlaps) {
                if (other.driverId === data.driverId) {
                    throw new https_1.HttpsError("failed-precondition", `Driver is double-booked with reservation ${other.confirmationCode}`);
                }
                if (other.vehicleId === data.vehicleId) {
                    throw new https_1.HttpsError("failed-precondition", `Vehicle is double-booked with reservation ${other.confirmationCode}`);
                }
            }
        }
        // 3. Prepare Updates
        const driverSubstituted = reservation.requestedDriverId ? reservation.requestedDriverId !== data.driverId : false;
        const nextStatus = "assigned";
        t.update(reservationRef, {
            driverId: data.driverId,
            driverName: driver.displayName,
            driverPhotoUrl: driver.photoUrl,
            vehicleId: data.vehicleId,
            vehicleDescription: `${vehicle.make} ${vehicle.model} (${vehicle.color})`,
            driverSubstituted,
            status: nextStatus,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const eventRef = reservationRef.collection("statusEvents").doc();
        t.set(eventRef, {
            status: nextStatus,
            actor: "admin",
            actorId: request.auth?.uid || "",
            reason: `Assigned driver ${driver.displayName} and vehicle ${vehicle.licensePlate}`,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true, driverSubstituted };
    });
});
const overrideSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
    status: zod_1.z.enum(["draft", "quoted", "confirmed", "assigned", "en_route", "arrived", "onboard", "completed", "cancelled", "no_show"]),
    reason: zod_1.z.string().min(1),
});
exports.adminOverrideStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can override status.");
    }
    const data = overrideSchema.parse(request.data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return adminDb.runTransaction(async (t) => {
        const reservationRef = adminDb.collection("reservations").doc(data.reservationId);
        const reservationDoc = await t.get(reservationRef);
        if (!reservationDoc.exists) {
            throw new https_1.HttpsError("not-found", "Reservation not found.");
        }
        t.update(reservationRef, {
            status: data.status,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const eventRef = reservationRef.collection("statusEvents").doc();
        t.set(eventRef, {
            status: data.status,
            actor: "admin",
            actorId: request.auth?.uid || "unknown",
            reason: data.reason,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    });
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createAdminResSchema = zod_1.z.object({
    riderId: zod_1.z.string(),
    skipPayment: zod_1.z.boolean().default(false),
    idempotencyKey: zod_1.z.string(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote: zod_1.z.any(), // Uses quoteInputSchema internally via calculatePrice or just any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pickup: zod_1.z.any(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dropoff: zod_1.z.any().nullable(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stops: zod_1.z.array(zod_1.z.any()),
    passengers: zod_1.z.number().int(),
    luggage: zod_1.z.number().int(),
    flightNumber: zod_1.z.string().nullable(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preferences: zod_1.z.any().nullable(),
    notes: zod_1.z.string().nullable(),
});
const pricing_1 = require("../pricing");
exports.createAdminReservation = (0, https_1.onCall)(async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can manually book.");
    }
    const data = createAdminResSchema.parse(request.data);
    const duplicateCheck = await adminDb.collection("reservations")
        .where("idempotencyKey", "==", data.idempotencyKey)
        .limit(1)
        .get();
    if (!duplicateCheck.empty) {
        return { reservationId: duplicateCheck.docs[0].id };
    }
    const globalSnap = await adminDb.collection("settings").doc("global").get();
    const activeRuleSetId = globalSnap.data()?.activePricingRuleSetId;
    const ruleSetSnap = await adminDb.collection("pricingRuleSets").doc(activeRuleSetId).get();
    const ruleSet = ruleSetSnap.data();
    let airport = undefined;
    if (data.quote.airportCode) {
        const aptSnap = await adminDb.collection("airports").doc(data.quote.airportCode).get();
        if (aptSnap.exists) {
            airport = aptSnap.data();
        }
    }
    const priceBreakdown = (0, pricing_1.calculatePrice)(data.quote, ruleSet, new Date(), airport);
    const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let confStr = "";
    for (let i = 0; i < 6; i++) {
        confStr += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }
    const confirmationCode = `BCC-${confStr}`;
    const riderSnap = await adminDb.collection("users").doc(data.riderId).get();
    const riderData = riderSnap.data();
    const reservationRef = adminDb.collection("reservations").doc();
    const batch = adminDb.batch();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reservationDoc = {
        reservationId: reservationRef.id,
        confirmationCode,
        riderId: data.riderId,
        riderName: `${riderData?.firstName} ${riderData?.lastName}`,
        riderPhone: riderData?.phone || "",
        riderEmail: riderData?.email || null,
        riderPhotoUrl: riderData?.photoUrl || null,
        bookedByAdmin: true,
        status: "confirmed",
        pricingRuleSetId: activeRuleSetId,
        idempotencyKey: data.idempotencyKey,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        estimatedDistanceMeters: null,
        estimatedDurationSeconds: null,
        pricing: priceBreakdown,
        stripePaymentIntentId: null,
        paymentStatus: data.skipPayment ? "none" : "none", // Will be handled later if invoiced
        pickupAt: data.quote.pickupAt,
        timezone: data.quote.timezone,
        tripType: data.quote.tripType,
        pickup: data.pickup,
        dropoff: data.dropoff,
        stops: data.stops,
        hours: data.quote.hours,
        passengers: data.passengers,
        luggage: data.luggage,
        flightNumber: data.flightNumber || null,
        airlineCode: null,
        specialInstructions: data.notes || "",
        preferences: data.preferences,
        classId: data.quote.classId,
        className: ruleSet.classRates[data.quote.classId]?.name || data.quote.classId,
        vehicleId: null,
        vehicleDescription: null,
        driverId: null,
        driverName: null,
        driverPhotoUrl: null,
        requestedDriverId: null,
        driverSubstituted: false,
        actualStartAt: null,
        actualEndAt: null,
        waitMinutes: 0,
        tollsCents: 0,
        parkingCents: 0,
        driverNotes: "",
        authorizedAmountCents: 0,
        capturedAmountCents: 0,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        cancellationFeeCents: 0,
    };
    batch.set(reservationRef, reservationDoc);
    const eventRef = reservationRef.collection("statusEvents").doc();
    batch.set(eventRef, {
        from: null,
        to: "confirmed",
        actorId: request.auth?.uid || "",
        actorRole: "admin",
        at: firestore_1.FieldValue.serverTimestamp(),
        note: data.skipPayment ? "Booked manually by admin (payment skipped)" : "Booked manually by admin",
        location: null,
    });
    await batch.commit();
    return { reservationId: reservationRef.id, confirmationCode };
});
/**
 * Calculates great-circle distance between two GPS coordinates in statute miles.
 */
function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}
/**
 * findBestDriverMatches executes the 3-Tier AI Dispatch Matching Waterfall:
 * Tier 1: 5-Star In-House Chauffeurs (Rating >= 4.8)
 * Tier 2: 4-Star In-House Chauffeurs (Rating 4.0 - 4.79)
 * Tier 3: 250+ Floater / Affiliate Network Partners
 */
exports.findBestDriverMatches = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can run dispatch matching queries.");
    }
    const { reservationId } = request.data;
    if (!reservationId) {
        throw new https_1.HttpsError("invalid-argument", "reservationId is required.");
    }
    const resSnap = await adminDb.collection("reservations").doc(reservationId).get();
    if (!resSnap.exists) {
        throw new https_1.HttpsError("not-found", "Reservation not found.");
    }
    const reservation = resSnap.data();
    const pickupLat = reservation.pickup?.lat || 34.0522;
    const pickupLng = reservation.pickup?.lng || -118.2437;
    const pTime = reservation.pickupAt;
    const pickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
    const durationSec = reservation.estimatedDurationSeconds || 3600;
    const tripStart = pickupDate.getTime() - (60 * 60 * 1000); // 1-hr prep buffer
    const tripEnd = pickupDate.getTime() + (durationSec * 1000) + (60 * 60 * 1000); // 1-hr post buffer
    // 1. Fetch active same-day reservations to check schedule overlaps
    const startOfDay = new Date(pickupDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(pickupDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const sameDaySnap = await adminDb.collection("reservations")
        .where("pickupAt", ">=", startOfDay)
        .where("pickupAt", "<=", endOfDay)
        .where("status", "in", ["confirmed", "assigned", "en_route", "arrived", "onboard"])
        .get();
    const driverBusyMap = new Map();
    for (const doc of sameDaySnap.docs) {
        if (doc.id === reservationId)
            continue;
        const other = doc.data();
        if (!other.driverId)
            continue;
        const oTime = other.pickupAt;
        const oStart = (typeof oTime?.toDate === "function" ? oTime.toDate() : new Date(oTime)).getTime();
        const oDuration = other.estimatedDurationSeconds || 3600;
        const oEnd = oStart + (oDuration * 1000);
        if (tripStart < oEnd && tripEnd > oStart) {
            driverBusyMap.set(other.driverId, `Busy on #${other.confirmationCode}`);
        }
    }
    // 2. Fetch all active and bookable drivers
    const driversSnap = await adminDb.collection("drivers")
        .where("active", "==", true)
        .where("bookable", "==", true)
        .get();
    // 3. Fetch latest telemetry stubs from driver_locations
    const locationsSnap = await adminDb.collection("driver_locations").get();
    const driverLocationsMap = new Map();
    locationsSnap.forEach(doc => {
        const data = doc.data();
        if (data.lat && data.lng) {
            driverLocationsMap.set(doc.id, { lat: data.lat, lng: data.lng });
        }
    });
    // 4. Fetch available vehicles to auto-link
    const vehiclesSnap = await adminDb.collection("vehicles")
        .where("active", "==", true)
        .get();
    const vehiclesList = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const candidates = [];
    for (const doc of driversSnap.docs) {
        const d = doc.data();
        const driverId = doc.id;
        const rating = typeof d.rating === "number" ? d.rating : 5.0;
        const driverType = d.driverType || "in_house";
        // Determine Waterfall Tier
        let tier = 3;
        let tierLabel = "Tier 3 — Floater / Affiliate Network";
        if (driverType === "in_house") {
            if (rating >= 4.8) {
                tier = 1;
                tierLabel = "Tier 1 — 5★ In-House Chauffeur";
            }
            else {
                tier = 2;
                tierLabel = "Tier 2 — 4★ In-House Chauffeur";
            }
        }
        // Resolve GPS Proximity
        const loc = driverLocationsMap.get(driverId) || { lat: 34.0522, lng: -118.2437 }; // Default LA base
        const distanceMiles = calculateDistanceMiles(loc.lat, loc.lng, pickupLat, pickupLng);
        const etaMinutes = Math.max(5, Math.round(distanceMiles * 2.2)); // Est 2.2 mins per mile in urban/airport traffic
        // Check Schedule Conflict
        const hasScheduleConflict = driverBusyMap.has(driverId);
        const conflictReason = driverBusyMap.get(driverId);
        // Calculate Composite Match Score
        let matchScore = (tier === 1 ? 1000 : tier === 2 ? 500 : 100) + (rating * 50) - (distanceMiles * 10);
        if (hasScheduleConflict)
            matchScore -= 5000;
        if (reservation.requestedDriverId === driverId)
            matchScore += 300; // VIP requested driver bonus
        // Find assigned or compatible vehicle
        const assignedVehicle = vehiclesList.find(v => v.id === d.assignedVehicleId) ||
            vehiclesList.find(v => v.classId === reservation.classId) ||
            vehiclesList[0];
        candidates.push({
            driverId,
            name: d.displayName || "Executive Chauffeur",
            photoUrl: d.photoUrl || null,
            rating,
            ratingCount: d.ratingCount || 10,
            driverType,
            tier,
            tierLabel,
            distanceMiles,
            etaMinutes,
            assignedVehicleId: assignedVehicle ? assignedVehicle.id : null,
            vehicleDescription: assignedVehicle ? `${assignedVehicle.make} ${assignedVehicle.model} (${assignedVehicle.color})` : "Executive Livery",
            matchScore: Math.round(matchScore),
            hasScheduleConflict,
            conflictReason,
        });
    }
    // Sort descending by match score
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    const tier1Count = candidates.filter(c => c.tier === 1 && !c.hasScheduleConflict).length;
    const tier2Count = candidates.filter(c => c.tier === 2 && !c.hasScheduleConflict).length;
    const tier3Count = candidates.filter(c => c.tier === 3 && !c.hasScheduleConflict).length;
    const recommendedDriver = candidates.find(c => !c.hasScheduleConflict) || null;
    return {
        reservationId,
        confirmationCode: reservation.confirmationCode,
        pickupLocation: reservation.pickup?.formatted || "Pickup Location",
        pickupTime: pickupDate.toISOString(),
        candidates,
        recommendedDriver,
        tierSummary: {
            tier1Count,
            tier2Count,
            tier3Count,
            totalAvailable: tier1Count + tier2Count + tier3Count,
        },
    };
});
/**
 * autoDispatchReservation executes automated assignment if an available Tier 1 or Tier 2 driver is found.
 * If only Tier 3 floaters are available, it flags the charter for Joe's review.
 */
exports.autoDispatchReservation = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can trigger auto-dispatch.");
    }
    const { reservationId } = request.data;
    if (!reservationId) {
        throw new https_1.HttpsError("invalid-argument", "reservationId is required.");
    }
    const matchResult = await exports.findBestDriverMatches.run({
        data: { reservationId },
        auth: request.auth,
    });
    const bestMatch = matchResult.recommendedDriver;
    if (!bestMatch) {
        return {
            success: false,
            autoAssigned: false,
            message: "No available drivers without schedule conflicts.",
        };
    }
    // If match is Tier 1 or Tier 2 (In-House), auto-assign!
    if (bestMatch.tier === 1 || bestMatch.tier === 2) {
        const resRef = adminDb.collection("reservations").doc(reservationId);
        await adminDb.runTransaction(async (t) => {
            t.update(resRef, {
                driverId: bestMatch.driverId,
                driverName: bestMatch.name,
                driverPhotoUrl: bestMatch.photoUrl,
                vehicleId: bestMatch.assignedVehicleId,
                vehicleDescription: bestMatch.vehicleDescription,
                status: "assigned",
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            const eventRef = resRef.collection("statusEvents").doc();
            t.set(eventRef, {
                status: "assigned",
                actor: "ai_dispatch",
                actorId: "system_auto_dispatch",
                reason: `Auto-dispatched via AI Waterfall (${bestMatch.tierLabel}: ${bestMatch.name}, ${bestMatch.distanceMiles}mi away, ETA ${bestMatch.etaMinutes}m)`,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        return {
            success: true,
            autoAssigned: true,
            tier: bestMatch.tier,
            tierLabel: bestMatch.tierLabel,
            assignedDriver: {
                id: bestMatch.driverId,
                name: bestMatch.name,
                distanceMiles: bestMatch.distanceMiles,
                etaMinutes: bestMatch.etaMinutes,
            },
            message: `Successfully auto-dispatched to ${bestMatch.tierLabel}: ${bestMatch.name}`,
        };
    }
    // Tier 3: Floater / Affiliate network requires Joe's manual approval
    return {
        success: true,
        autoAssigned: false,
        requiresManualApproval: true,
        tier: 3,
        tierLabel: bestMatch.tierLabel,
        recommendedCandidate: bestMatch,
        message: "In-house drivers fully booked. Floater/Affiliate network match found; pending Joe's manual authorization.",
    };
});
//# sourceMappingURL=dispatch.js.map