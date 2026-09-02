import { parseContactDate } from "@/lib/dates/parse-contact-date";
import { rawContactSchema, type RawInteraction } from "../data/contact.schema";
import type {
  CanonicalChannel,
  CanonicalSource,
  Contact,
  ContactTimelineItem,
  FactEvidence,
  FactSource,
  QualificationFact,
  QualificationGroups,
  RenderableValue,
} from "../domain/contact";

const EMPTY_QUALIFICATION: QualificationGroups = {
  sale: [],
  rental: [],
  shared: [],
};

const SOURCE_ALIASES: Record<string, CanonicalSource> = {
  VOICE_CALL: "voice",
  VOICE: "voice",
  VOZ: "voice",
  LLAMADA: "voice",
  WHATSAPP: "whatsapp",
  WEBSITE: "web",
  WEB_FORM: "web",
  META_LEAD_ADS: "meta",
  CRM: "crm",
  WITEI: "crm",
  MANUAL: "manual",
};

const CHANNEL_ALIASES: Record<string, CanonicalChannel> = {
  VOICE: "voice",
  VOICE_CALL: "voice",
  VOZ: "voice",
  LLAMADA: "voice",
  WHATSAPP: "whatsapp",
  WEB_FORM: "web-form",
  WEBSITE: "web-form",
  EMAIL: "email",
};

export type FactCandidate = FactEvidence;

export function normalizeContact(input: unknown): Contact {
  const raw = rawContactSchema.parse(input);
  const phone = normalizePhone(raw.phone);
  const email = normalizeEmail(raw.email);
  const fullName = cleanText(raw.full_name);
  const displayName =
    fullName ?? phone?.display ?? email?.value ?? "Contacto sin identificar";

  return {
    id: raw.id,
    organizationId: raw.organization_id,
    identity: {
      displayName,
      fullName,
      initials: getInitials(displayName),
      phone: phone && raw.phone ? { raw: raw.phone, ...phone } : null,
      email,
    },
    source: normalizeSource(raw.lead_source),
    createdAt: normalizeDate(raw.created_at),
    tags: raw.tags ?? [],
    notes: cleanText(raw.notes),
    qualification: normalizeQualification(raw.qualification_data),
    timeline: normalizeTimeline(raw.interactions ?? []),
    handoff: {
      status: raw.ai_handoff ? "requested" : "not-requested",
      reason: raw.ai_handoff ? cleanText(raw.handoff_reason) : null,
      requestedAt: raw.ai_handoff
        ? normalizeDate(raw.handoff_requested_at)
        : null,
    },
  };
}

export function normalizePhone(
  value: string | null | undefined,
): { display: string; comparable: string } | null {
  if (!value) return null;

  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `34${digits}`;
  if (digits.length < 7 || digits.length > 15) return null;

  const display =
    digits.startsWith("34") && digits.length === 11
      ? `+34 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
      : `+${digits}`;

  return { display, comparable: digits };
}

export function normalizeEmail(
  value: string | null | undefined,
): { value: string; actionable: boolean } | null {
  const cleaned = cleanText(value)?.toLowerCase();
  if (!cleaned) return null;

  return {
    value: cleaned,
    actionable: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned),
  };
}

export function normalizeSource(
  value: string | null | undefined,
): CanonicalSource {
  return value
    ? (SOURCE_ALIASES[value.trim().toUpperCase()] ?? "unknown")
    : "unknown";
}

export function normalizeChannel(
  value: string | null | undefined,
): CanonicalChannel {
  return value
    ? (CHANNEL_ALIASES[value.trim().toUpperCase()] ?? "unknown")
    : "unknown";
}

export function resolveFactPrecedence<T extends FactCandidate>(
  candidates: T[],
): T | null {
  return candidates.reduce<T | null>((selected, candidate) => {
    if (!selected) return candidate;

    const rankDifference =
      factSourceRank(candidate.source) - factSourceRank(selected.source);
    if (rankDifference > 0) return candidate;
    if (rankDifference < 0) return selected;

    const selectedTime =
      selected.occurredAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const candidateTime =
      candidate.occurredAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    return candidateTime > selectedTime ? candidate : selected;
  }, null);
}

export function formatQualificationValue(value: RenderableValue): string {
  if (value === null) return "Sin dato";
  if (Array.isArray(value))
    return value.map(formatQualificationValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function normalizeQualification(value: unknown): QualificationGroups {
  const payload = parseQualificationPayload(value);
  if (!payload) return { ...EMPTY_QUALIFICATION };

  const qualification = asRecord(payload.qualification);
  if (!qualification) return { ...EMPTY_QUALIFICATION };

  return {
    sale: normalizeFactGroup(qualification.sale),
    rental: normalizeFactGroup(qualification.rental),
    shared: normalizeFactGroup(qualification.shared),
  };
}

function parseQualificationPayload(
  value: unknown,
): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return asRecord(value);
}

function normalizeFactGroup(value: unknown): QualificationFact[] {
  const group = asRecord(value);
  if (!group) return [];

  return Object.entries(group).flatMap(([key, rawFact]) => {
    if (key === "_meta") return [];

    const rawCandidates = Array.isArray(rawFact) ? rawFact : [rawFact];
    const evidence = rawCandidates.flatMap(normalizeFactEvidence);
    const selected = resolveFactPrecedence(evidence);

    return selected ? [{ key, ...selected, evidence }] : [];
  });
}

function normalizeFactEvidence(value: unknown): FactEvidence[] {
  const fact = asRecord(value);
  if (!fact || !("value" in fact) || typeof fact.value === "undefined")
    return [];

  const confidence = cleanText(fact.confidence);
  const sourceRef = cleanText(fact.sourceRef);

  return [
    {
      value: toRenderableValue(fact.value),
      source: normalizeFactSource(fact.source),
      occurredAt: normalizeDate(fact.updatedAt),
      ...(confidence ? { confidence } : {}),
      ...(sourceRef ? { sourceRef } : {}),
    },
  ];
}

function normalizeTimeline(
  interactions: RawInteraction[],
): ContactTimelineItem[] {
  return interactions
    .map((interaction, index) => ({
      item: normalizeInteraction(interaction),
      index,
    }))
    .sort((left, right) => {
      const leftTime =
        left.item.occurredAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightTime =
        right.item.occurredAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftTime - rightTime || left.index - right.index;
    })
    .map(({ item }) => item);
}

function normalizeInteraction(
  interaction: RawInteraction,
): ContactTimelineItem {
  const metadata = asRecord(interaction.metadata);
  const content = cleanText(interaction.content);
  const duration = metadata?.duration_sec;

  return {
    id: interaction.id,
    channel: normalizeChannel(interaction.channel),
    direction:
      interaction.direction === "inbound" ||
      interaction.direction === "outbound"
        ? interaction.direction
        : "unknown",
    occurredAt: normalizeDate(interaction.created_at),
    content,
    summary: content,
    transcript: cleanText(metadata?.transcript_excerpt),
    durationSeconds:
      typeof duration === "number" && Number.isFinite(duration)
        ? duration
        : null,
  };
}

function normalizeFactSource(value: unknown): FactSource {
  if (typeof value !== "string") return "unknown";

  switch (value.trim().toLowerCase()) {
    case "manual":
      return "manual";
    case "explicit":
    case "customer":
    case "client":
      return "customer";
    case "inferred":
    case "ai":
      return "ai";
    default:
      return "unknown";
  }
}

function factSourceRank(source: FactSource): number {
  return { unknown: 0, ai: 1, customer: 2, manual: 3 }[source];
}

function toRenderableValue(value: unknown): RenderableValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number")
    return Number.isFinite(value) ? value : String(value);
  if (Array.isArray(value)) return value.map(toRenderableValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        toRenderableValue(child),
      ]),
    );
  }
  return String(value);
}

function getInitials(value: string): string {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function normalizeDate(value: unknown): Date | null {
  return typeof value === "string" || typeof value === "number"
    ? parseContactDate(value)
    : null;
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
