import { z } from "zod";

const contactDateSchema = z.union([z.string(), z.number()]);

const interactionSchema = z.object({
  id: z.string(),
  channel: z.string().nullish(),
  direction: z.string().nullish(),
  created_at: contactDateSchema.nullish(),
  content: z.string().nullish(),
  metadata: z.unknown().nullish(),
});

export const rawContactSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  full_name: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  lead_source: z.string().nullish(),
  contact_type: z.string().nullish(),
  created_at: contactDateSchema.nullish(),
  ai_handoff: z.boolean().optional(),
  handoff_reason: z.string().nullish(),
  handoff_requested_at: contactDateSchema.nullish(),
  tags: z.array(z.string()).nullish(),
  notes: z.string().nullish(),
  qualification_data: z
    .union([z.string(), z.record(z.string(), z.unknown()), z.null()])
    .optional(),
  interactions: z.array(interactionSchema).optional(),
});

export type RawContact = z.infer<typeof rawContactSchema>;
export type RawInteraction = z.infer<typeof interactionSchema>;
