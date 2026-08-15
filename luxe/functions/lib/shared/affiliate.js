"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.affiliateSchema = exports.affiliateComplianceStatusSchema = exports.affiliateDocumentSchema = exports.affiliateDocumentTypeSchema = void 0;
const zod_1 = require("zod");
exports.affiliateDocumentTypeSchema = zod_1.z.enum([
    "certificate_of_insurance",
    "operating_authority_tcp_puc",
    "dot_safety_permit",
    "airport_permit",
    "w9_form",
    "master_services_agreement",
]);
exports.affiliateDocumentSchema = zod_1.z.object({
    documentId: zod_1.z.string(),
    type: exports.affiliateDocumentTypeSchema,
    title: zod_1.z.string(),
    fileUrl: zod_1.z.string().url().nullable().optional(),
    policyNumber: zod_1.z.string().nullable().optional(),
    coverageAmountCents: zod_1.z.number().int().nonnegative().nullable().optional(),
    expiresAt: zod_1.z.any(), // Timestamp or ISO string
    isVerified: zod_1.z.boolean().default(false),
    verifiedAt: zod_1.z.any().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
    uploadedAt: zod_1.z.any(),
});
exports.affiliateComplianceStatusSchema = zod_1.z.enum([
    "active_compliant",
    "expiring_soon",
    "non_compliant_expired",
    "pending_review",
    "suspended",
]);
exports.affiliateSchema = zod_1.z.object({
    affiliateId: zod_1.z.string(),
    companyName: zod_1.z.string().min(2),
    legalEntityName: zod_1.z.string().nullable().optional(),
    dba: zod_1.z.string().nullable().optional(),
    contactName: zod_1.z.string().min(2),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(7),
    emergencyPhone: zod_1.z.string().nullable().optional(),
    // Operating Coverage
    primaryMarkets: zod_1.z.array(zod_1.z.string()).default([]), // e.g. ["LAX", "JFK", "MIA", "Greater Los Angeles"]
    fleetSize: zod_1.z.number().int().nonnegative().default(1),
    supportedClasses: zod_1.z.array(zod_1.z.string()).default(["sedan_exec", "suv_exec"]),
    // Commission & Rates
    defaultCommissionRate: zod_1.z.number().min(0).max(1).default(0.85), // e.g. 0.85 = Affiliate receives 85% of base, Luxe retains 15%
    customPayoutTerms: zod_1.z.string().nullable().optional(),
    // Compliance & Vault
    complianceStatus: exports.affiliateComplianceStatusSchema.default("pending_review"),
    documents: zod_1.z.array(exports.affiliateDocumentSchema).default([]),
    insuranceExpiresAt: zod_1.z.any().nullable().optional(),
    tcpPermitNumber: zod_1.z.string().nullable().optional(),
    dotNumber: zod_1.z.string().nullable().optional(),
    // Metrics
    tripsCompletedCount: zod_1.z.number().int().default(0),
    onTimeRating: zod_1.z.number().min(0).max(5).default(5.0),
    totalPayoutCents: zod_1.z.number().int().default(0),
    status: zod_1.z.enum(["active", "inactive", "suspended"]).default("active"),
    createdAt: zod_1.z.any(),
    updatedAt: zod_1.z.any(),
});
//# sourceMappingURL=affiliate.js.map