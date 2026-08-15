"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToFarmOut = exports.farmOutReservation = exports.updateAffiliateCompliance = exports.createAffiliatePartner = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const db = (0, firestore_1.getFirestore)();
const createAffiliateSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2),
    legalEntityName: zod_1.z.string().nullable().optional(),
    contactName: zod_1.z.string().min(2),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(7),
    emergencyPhone: zod_1.z.string().nullable().optional(),
    primaryMarkets: zod_1.z.array(zod_1.z.string()).default([]),
    fleetSize: zod_1.z.number().int().nonnegative().default(1),
    supportedClasses: zod_1.z.array(zod_1.z.string()).default(["sedan_exec", "suv_exec"]),
    defaultCommissionRate: zod_1.z.number().min(0).max(1).default(0.85),
    tcpPermitNumber: zod_1.z.string().nullable().optional(),
    dotNumber: zod_1.z.string().nullable().optional(),
});
/**
 * createAffiliatePartner - Admin creates a new affiliate partner profile
 */
exports.createAffiliatePartner = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can register affiliate partners.");
    }
    const parsed = createAffiliateSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Invalid affiliate data");
    }
    const affiliateRef = db.collection("affiliates").doc();
    const affiliateId = affiliateRef.id;
    const newAffiliate = {
        affiliateId,
        companyName: parsed.data.companyName,
        legalEntityName: parsed.data.legalEntityName || null,
        dba: null,
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        emergencyPhone: parsed.data.emergencyPhone || null,
        primaryMarkets: parsed.data.primaryMarkets,
        fleetSize: parsed.data.fleetSize,
        supportedClasses: parsed.data.supportedClasses,
        defaultCommissionRate: parsed.data.defaultCommissionRate,
        customPayoutTerms: null,
        complianceStatus: "pending_review",
        documents: [],
        insuranceExpiresAt: null,
        tcpPermitNumber: parsed.data.tcpPermitNumber || null,
        dotNumber: parsed.data.dotNumber || null,
        tripsCompletedCount: 0,
        onTimeRating: 5.0,
        totalPayoutCents: 0,
        status: "active",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await affiliateRef.set(newAffiliate);
    return { success: true, affiliateId };
});
const updateDocumentSchema = zod_1.z.object({
    affiliateId: zod_1.z.string(),
    document: zod_1.z.object({
        documentId: zod_1.z.string(),
        type: zod_1.z.enum([
            "certificate_of_insurance",
            "operating_authority_tcp_puc",
            "dot_safety_permit",
            "airport_permit",
            "w9_form",
            "master_services_agreement",
        ]),
        title: zod_1.z.string(),
        fileUrl: zod_1.z.string().nullable().optional(),
        policyNumber: zod_1.z.string().nullable().optional(),
        coverageAmountCents: zod_1.z.number().int().nullable().optional(),
        expiresAt: zod_1.z.string(), // ISO string date
        isVerified: zod_1.z.boolean().default(true),
        notes: zod_1.z.string().nullable().optional(),
    }),
});
/**
 * updateAffiliateCompliance - Uploads or verifies compliance credential documents
 */
exports.updateAffiliateCompliance = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can update compliance documents.");
    }
    const parsed = updateDocumentSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Invalid document payload");
    }
    const { affiliateId, document } = parsed.data;
    const affiliateRef = db.collection("affiliates").doc(affiliateId);
    const snap = await affiliateRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Affiliate not found");
    }
    const affiliate = snap.data();
    const existingDocs = affiliate.documents || [];
    const docEntry = {
        documentId: document.documentId || db.collection("tmp").doc().id,
        type: document.type,
        title: document.title,
        fileUrl: document.fileUrl || null,
        policyNumber: document.policyNumber || null,
        coverageAmountCents: document.coverageAmountCents || null,
        expiresAt: document.expiresAt,
        isVerified: document.isVerified,
        verifiedAt: new Date().toISOString(),
        notes: document.notes || null,
        uploadedAt: new Date().toISOString(),
    };
    const updatedDocs = existingDocs.filter(d => d.documentId !== docEntry.documentId).concat(docEntry);
    // Recalibrate overall compliance status
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let hasExpired = false;
    let hasExpiringSoon = false;
    for (const doc of updatedDocs) {
        const expDate = new Date(doc.expiresAt);
        if (expDate.getTime() < now.getTime()) {
            hasExpired = true;
        }
        else if (expDate.getTime() < thirtyDaysAhead.getTime()) {
            hasExpiringSoon = true;
        }
    }
    const complianceStatus = hasExpired
        ? "non_compliant_expired"
        : hasExpiringSoon
            ? "expiring_soon"
            : "active_compliant";
    const coiDoc = updatedDocs.find(d => d.type === "certificate_of_insurance");
    await affiliateRef.update({
        documents: updatedDocs,
        complianceStatus,
        insuranceExpiresAt: coiDoc ? coiDoc.expiresAt : null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, complianceStatus };
});
const farmOutSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
    affiliateId: zod_1.z.string(),
    payoutCentsOverride: zod_1.z.number().int().positive().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
/**
 * farmOutReservation - Dispatches trip to an approved affiliate operator
 */
exports.farmOutReservation = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can farm out reservations.");
    }
    const parsed = farmOutSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Invalid farm-out parameters");
    }
    const { reservationId, affiliateId, payoutCentsOverride, notes } = parsed.data;
    const resRef = db.collection("reservations").doc(reservationId);
    const affRef = db.collection("affiliates").doc(affiliateId);
    const [resSnap, affSnap] = await Promise.all([resRef.get(), affRef.get()]);
    if (!resSnap.exists)
        throw new https_1.HttpsError("not-found", "Reservation not found");
    if (!affSnap.exists)
        throw new https_1.HttpsError("not-found", "Affiliate not found");
    const reservation = resSnap.data();
    const affiliate = affSnap.data();
    if (affiliate.complianceStatus === "non_compliant_expired" || affiliate.status === "suspended") {
        throw new https_1.HttpsError("failed-precondition", `Cannot farm out to affiliate ${affiliate.companyName}: Compliance status is ${affiliate.complianceStatus}`);
    }
    // Calculate default payout from total pricing subtotal * defaultCommissionRate
    const clientSubtotalCents = reservation.pricing.subtotalCents;
    const affiliatePayoutCents = payoutCentsOverride || Math.round(clientSubtotalCents * affiliate.defaultCommissionRate);
    const batch = db.batch();
    batch.update(resRef, {
        subcontractType: "farm_out",
        affiliateId: affiliate.affiliateId,
        affiliateName: affiliate.companyName,
        affiliatePayoutCents,
        affiliateStatus: "pending",
        affiliateNotes: notes || null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const eventRef = resRef.collection("statusEvents").doc();
    const statusEvent = {
        from: reservation.status,
        to: reservation.status,
        at: firestore_1.FieldValue.serverTimestamp(),
        actorId: request.auth.uid,
        actorRole: "admin",
        note: `Farmed out to affiliate ${affiliate.companyName} (Payout: $${(affiliatePayoutCents / 100).toFixed(2)})`,
        location: null,
    };
    batch.set(eventRef, statusEvent);
    await batch.commit();
    return {
        success: true,
        affiliateName: affiliate.companyName,
        payoutCents: affiliatePayoutCents
    };
});
const respondFarmOutSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
    response: zod_1.z.enum(["accepted", "declined"]),
    driverName: zod_1.z.string().optional(),
    driverPhone: zod_1.z.string().optional(),
    vehicleDescription: zod_1.z.string().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
/**
 * respondToFarmOut - Affiliate operator accepts or declines a farmed-out trip
 */
exports.respondToFarmOut = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    const parsed = respondFarmOutSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid response data");
    }
    const { reservationId, response, driverName, driverPhone, vehicleDescription, notes } = parsed.data;
    const resRef = db.collection("reservations").doc(reservationId);
    const resSnap = await resRef.get();
    if (!resSnap.exists)
        throw new https_1.HttpsError("not-found", "Reservation not found");
    const updates = {
        affiliateStatus: response,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (notes)
        updates.affiliateNotes = notes;
    if (response === "accepted") {
        if (driverName)
            updates.affiliateDriverName = driverName;
        if (driverPhone)
            updates.affiliateDriverPhone = driverPhone;
        if (vehicleDescription)
            updates.affiliateVehicleDescription = vehicleDescription;
    }
    await resRef.update(updates);
    return { success: true, status: response };
});
//# sourceMappingURL=affiliates.js.map