import { z } from "zod";
import type { RenderableValue } from "../domain/contact";

const nonEmptyStringSchema = z.string().min(1);
const nullableIsoTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .nullable();
const sourceSchema = z.enum([
  "voice",
  "whatsapp",
  "web",
  "meta",
  "crm",
  "manual",
  "unknown",
]);
const channelSchema = z.enum([
  "voice",
  "whatsapp",
  "web-form",
  "email",
  "unknown",
]);
const factSourceSchema = z.enum(["manual", "customer", "ai", "unknown"]);

export const renderableQualificationValueSchema: z.ZodType<RenderableValue> =
  z.lazy(() =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(renderableQualificationValueSchema),
      z.record(z.string(), renderableQualificationValueSchema),
    ]),
  );

const timelineItemSchema = z
  .object({
    id: nonEmptyStringSchema,
    channel: channelSchema,
    direction: z.enum(["inbound", "outbound", "unknown"]),
    occurredAt: nullableIsoTimestampSchema,
    content: z.string().nullable(),
    summary: z.string().nullable(),
    transcript: z.string().nullable(),
    durationSeconds: z.number().finite().nonnegative().nullable(),
  })
  .strict();

const factEvidenceSchema = z
  .object({
    value: renderableQualificationValueSchema,
    source: factSourceSchema,
    occurredAt: nullableIsoTimestampSchema,
    isCurrent: z.boolean(),
  })
  .strict();

const qualificationFactSchema = z
  .object({
    key: nonEmptyStringSchema,
    value: renderableQualificationValueSchema,
    source: factSourceSchema,
    occurredAt: nullableIsoTimestampSchema,
    evidence: z.array(factEvidenceSchema),
  })
  .strict();

const contactListItemSchema = z
  .object({
    id: nonEmptyStringSchema,
    displayName: nonEmptyStringSchema,
    initials: nonEmptyStringSchema,
    source: sourceSchema,
    phone: z.string().nullable(),
    email: z.string().nullable(),
    latestInteraction: timelineItemSchema.nullable(),
  })
  .strict();

const actionPolicySchema = z
  .object({
    status: z.enum(["available", "blocked", "unknown"]),
    available: z.boolean(),
    reason: nonEmptyStringSchema,
  })
  .strict();

const contactDetailSchema = z
  .object({
    id: nonEmptyStringSchema,
    identity: z
      .object({
        displayName: nonEmptyStringSchema,
        fullName: z.string().nullable(),
        initials: nonEmptyStringSchema,
        phone: z
          .object({ display: nonEmptyStringSchema, href: nonEmptyStringSchema })
          .strict()
          .nullable(),
        email: z
          .object({
            value: nonEmptyStringSchema,
            actionable: z.boolean(),
            href: z.string().nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    source: sourceSchema,
    createdAt: nullableIsoTimestampSchema,
    qualification: z
      .object({
        sale: z.array(qualificationFactSchema),
        rental: z.array(qualificationFactSchema),
        shared: z.array(qualificationFactSchema),
      })
      .strict(),
    timeline: z.array(timelineItemSchema),
    policy: z
      .object({
        status: z.enum(["restricted", "unknown"]),
        actions: z
          .object({
            call: actionPolicySchema,
            email: actionPolicySchema,
            whatsapp: actionPolicySchema,
          })
          .strict(),
      })
      .strict(),
    duplicates: z.array(
      z
        .object({
          contactId: nonEmptyStringSchema,
          displayName: nonEmptyStringSchema,
          matchedBy: z.array(z.enum(["phone", "email"])),
          reason: nonEmptyStringSchema,
        })
        .strict(),
    ),
    handoff: z
      .object({
        status: z.enum(["requested", "not-requested"]),
        reason: z.string().nullable(),
        requestedAt: nullableIsoTimestampSchema,
      })
      .strict(),
    beforeCall: z
      .object({
        operation: z.enum([
          "Compra",
          "Alquiler",
          "Compra y alquiler",
          "Por confirmar",
        ]),
        keyNeeds: z.array(
          z
            .object({
              label: nonEmptyStringSchema,
              value: nonEmptyStringSchema,
            })
            .strict(),
        ),
        latestInteraction: nonEmptyStringSchema,
        blockers: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export const contactListSuccessSchema = z
  .object({
    data: z.array(contactListItemSchema),
    meta: z
      .object({
        count: z.number().int().nonnegative(),
        query: z.string().optional(),
        source: sourceSchema.optional(),
      })
      .strict(),
  })
  .strict();

export const contactDetailSuccessSchema = z
  .object({
    data: contactDetailSchema,
    meta: z.object({ found: z.literal(true) }).strict(),
  })
  .strict();

export type ContactListSuccess = z.infer<typeof contactListSuccessSchema>;
export type ContactDetailSuccess = z.infer<typeof contactDetailSuccessSchema>;
export type ContactListItemDto = ContactListSuccess["data"][number];
export type ContactDetailDto = ContactDetailSuccess["data"];
export type TimelineItemDto = ContactDetailDto["timeline"][number];
export type QualificationFactDto =
  ContactDetailDto["qualification"]["sale"][number];
export type FactEvidenceDto = QualificationFactDto["evidence"][number];
export type DuplicateDto = ContactDetailDto["duplicates"][number];
export type BeforeCallDto = ContactDetailDto["beforeCall"];
