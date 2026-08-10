import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const webhookEventSchema = z.object({
  eventId: z.string(),
  type: z.string(),
  processedAt: timestampSchema,
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
