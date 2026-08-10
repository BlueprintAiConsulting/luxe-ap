import { z } from "zod";

export const globalSettingsSchema = z.object({
  businessName: z.string(),
  supportPhone: z.string(),
  supportEmail: z.string(),
  defaultTimezone: z.string(),
  activePricingRuleSetId: z.string(),
  bookingLeadTimeMinutes: z.number().int(),
  maxAdvanceDays: z.number().int(),
  brandColors: z.object({
    primary: z.string(),
    accent: z.string(),
  }),
});

export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
