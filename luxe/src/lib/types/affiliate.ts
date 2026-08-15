import { z } from "zod";

export const affiliateDocumentTypeSchema = z.enum([
  "certificate_of_insurance",
  "operating_authority_tcp_puc",
  "dot_safety_permit",
  "airport_permit",
  "w9_form",
  "master_services_agreement",
]);

export type AffiliateDocumentType = z.infer<typeof affiliateDocumentTypeSchema>;

export const affiliateDocumentSchema = z.object({
  documentId: z.string(),
  type: affiliateDocumentTypeSchema,
  title: z.string(),
  fileUrl: z.string().url().nullable().optional(),
  policyNumber: z.string().nullable().optional(),
  coverageAmountCents: z.number().int().nonnegative().nullable().optional(),
  expiresAt: z.any(), // Timestamp or ISO string
  isVerified: z.boolean().default(false),
  verifiedAt: z.any().nullable().optional(),
  notes: z.string().nullable().optional(),
  uploadedAt: z.any(),
});

export type AffiliateDocument = z.infer<typeof affiliateDocumentSchema>;

export const affiliateComplianceStatusSchema = z.enum([
  "active_compliant",
  "expiring_soon",
  "non_compliant_expired",
  "pending_review",
  "suspended",
]);

export type AffiliateComplianceStatus = z.infer<typeof affiliateComplianceStatusSchema>;

export const affiliateSchema = z.object({
  affiliateId: z.string(),
  companyName: z.string().min(2),
  legalEntityName: z.string().nullable().optional(),
  dba: z.string().nullable().optional(),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  emergencyPhone: z.string().nullable().optional(),
  
  // Operating Coverage
  primaryMarkets: z.array(z.string()).default([]), // e.g. ["LAX", "JFK", "MIA", "Greater Los Angeles"]
  fleetSize: z.number().int().nonnegative().default(1),
  supportedClasses: z.array(z.string()).default(["sedan_exec", "suv_exec"]),

  // Commission & Rates
  defaultCommissionRate: z.number().min(0).max(1).default(0.85), // e.g. 0.85 = Affiliate receives 85% of base, Luxe retains 15%
  customPayoutTerms: z.string().nullable().optional(),

  // Compliance & Vault
  complianceStatus: affiliateComplianceStatusSchema.default("pending_review"),
  documents: z.array(affiliateDocumentSchema).default([]),
  insuranceExpiresAt: z.any().nullable().optional(),
  tcpPermitNumber: z.string().nullable().optional(),
  dotNumber: z.string().nullable().optional(),

  // Metrics
  tripsCompletedCount: z.number().int().default(0),
  onTimeRating: z.number().min(0).max(5).default(5.0),
  totalPayoutCents: z.number().int().default(0),

  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type Affiliate = z.infer<typeof affiliateSchema>;
