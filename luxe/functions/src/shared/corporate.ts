import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const corporateAccountSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  billingEmail: z.string().email(),
  promoCode: z.string(),
  active: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type CorporateAccount = z.infer<typeof corporateAccountSchema>;
