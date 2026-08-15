import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { 
  Affiliate, 
  AffiliateDocument, 
  Reservation, 
  ReservationStatusEvent 
} from "../shared";

const db = getFirestore();

const createAffiliateSchema = z.object({
  companyName: z.string().min(2),
  legalEntityName: z.string().nullable().optional(),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  emergencyPhone: z.string().nullable().optional(),
  primaryMarkets: z.array(z.string()).default([]),
  fleetSize: z.number().int().nonnegative().default(1),
  supportedClasses: z.array(z.string()).default(["sedan_exec", "suv_exec"]),
  defaultCommissionRate: z.number().min(0).max(1).default(0.85),
  tcpPermitNumber: z.string().nullable().optional(),
  dotNumber: z.string().nullable().optional(),
});

/**
 * createAffiliatePartner - Admin creates a new affiliate partner profile
 */
export const createAffiliatePartner = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can register affiliate partners.");
  }

  const parsed = createAffiliateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Invalid affiliate data");
  }

  const affiliateRef = db.collection("affiliates").doc();
  const affiliateId = affiliateRef.id;

  const newAffiliate: Affiliate = {
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
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  };

  await affiliateRef.set(newAffiliate);
  return { success: true, affiliateId };
});

const updateDocumentSchema = z.object({
  affiliateId: z.string(),
  document: z.object({
    documentId: z.string(),
    type: z.enum([
      "certificate_of_insurance",
      "operating_authority_tcp_puc",
      "dot_safety_permit",
      "airport_permit",
      "w9_form",
      "master_services_agreement",
    ]),
    title: z.string(),
    fileUrl: z.string().nullable().optional(),
    policyNumber: z.string().nullable().optional(),
    coverageAmountCents: z.number().int().nullable().optional(),
    expiresAt: z.string(), // ISO string date
    isVerified: z.boolean().default(true),
    notes: z.string().nullable().optional(),
  }),
});

/**
 * updateAffiliateCompliance - Uploads or verifies compliance credential documents
 */
export const updateAffiliateCompliance = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can update compliance documents.");
  }

  const parsed = updateDocumentSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Invalid document payload");
  }

  const { affiliateId, document } = parsed.data;
  const affiliateRef = db.collection("affiliates").doc(affiliateId);
  const snap = await affiliateRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Affiliate not found");
  }

  const affiliate = snap.data() as Affiliate;
  const existingDocs = affiliate.documents || [];
  
  const docEntry: AffiliateDocument = {
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
    } else if (expDate.getTime() < thirtyDaysAhead.getTime()) {
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
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, complianceStatus };
});

const farmOutSchema = z.object({
  reservationId: z.string(),
  affiliateId: z.string(),
  payoutCentsOverride: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * farmOutReservation - Dispatches trip to an approved affiliate operator
 */
export const farmOutReservation = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can farm out reservations.");
  }

  const parsed = farmOutSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Invalid farm-out parameters");
  }

  const { reservationId, affiliateId, payoutCentsOverride, notes } = parsed.data;

  const resRef = db.collection("reservations").doc(reservationId);
  const affRef = db.collection("affiliates").doc(affiliateId);

  const [resSnap, affSnap] = await Promise.all([resRef.get(), affRef.get()]);

  if (!resSnap.exists) throw new HttpsError("not-found", "Reservation not found");
  if (!affSnap.exists) throw new HttpsError("not-found", "Affiliate not found");

  const reservation = resSnap.data() as Reservation;
  const affiliate = affSnap.data() as Affiliate;

  if (affiliate.complianceStatus === "non_compliant_expired" || affiliate.status === "suspended") {
    throw new HttpsError("failed-precondition", `Cannot farm out to affiliate ${affiliate.companyName}: Compliance status is ${affiliate.complianceStatus}`);
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
    updatedAt: FieldValue.serverTimestamp(),
  });

  const eventRef = resRef.collection("statusEvents").doc();
  const statusEvent: ReservationStatusEvent = {
    from: reservation.status,
    to: reservation.status,
    at: FieldValue.serverTimestamp() as any,
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

const respondFarmOutSchema = z.object({
  reservationId: z.string(),
  response: z.enum(["accepted", "declined"]),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  vehicleDescription: z.string().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * respondToFarmOut - Affiliate operator accepts or declines a farmed-out trip
 */
export const respondToFarmOut = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

  const parsed = respondFarmOutSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid response data");
  }

  const { reservationId, response, driverName, driverPhone, vehicleDescription, notes } = parsed.data;
  const resRef = db.collection("reservations").doc(reservationId);
  const resSnap = await resRef.get();

  if (!resSnap.exists) throw new HttpsError("not-found", "Reservation not found");

  const updates: Record<string, any> = {
    affiliateStatus: response,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (notes) updates.affiliateNotes = notes;

  if (response === "accepted") {
    if (driverName) updates.affiliateDriverName = driverName;
    if (driverPhone) updates.affiliateDriverPhone = driverPhone;
    if (vehicleDescription) updates.affiliateVehicleDescription = vehicleDescription;
  }

  await resRef.update(updates);

  return { success: true, status: response };
});
