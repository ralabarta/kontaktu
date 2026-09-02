import type { PossibleDuplicate } from "./detect-duplicates";
import {
  evaluateContactPolicy,
  type ContactPolicy,
} from "./evaluate-contact-policy";
import { formatQualificationValue } from "./normalize-contact";
import type {
  Contact,
  ContactTimelineItem,
  FactEvidence,
  QualificationFact,
  QualificationGroups,
  RenderableValue,
} from "../domain/contact";

export interface ContactListItemDto {
  id: string;
  displayName: string;
  initials: string;
  source: Contact["source"];
  phone: string | null;
  email: string | null;
  latestInteraction: TimelineItemDto | null;
}

export interface FactEvidenceDto {
  value: RenderableValue;
  source: FactEvidence["source"];
  occurredAt: string | null;
}

export interface QualificationFactDto extends FactEvidenceDto {
  key: string;
  evidence: FactEvidenceDto[];
}

export interface TimelineItemDto {
  id: string;
  channel: ContactTimelineItem["channel"];
  direction: ContactTimelineItem["direction"];
  occurredAt: string | null;
  content: string | null;
  summary: string | null;
  transcript: string | null;
  durationSeconds: number | null;
}

export interface DuplicateDto {
  contactId: string;
  displayName: string;
  matchedBy: PossibleDuplicate["matchedBy"];
  reason: string;
}

export interface BeforeCallDto {
  operation: "Compra" | "Alquiler" | "Compra y alquiler" | "Por confirmar";
  keyNeeds: { label: string; value: string }[];
  latestInteraction: string;
  blockers: string[];
}

export interface ContactDetailDto {
  id: string;
  identity: {
    displayName: string;
    fullName: string | null;
    initials: string;
    phone: { display: string; href: string } | null;
    email: { value: string; actionable: boolean; href: string | null } | null;
  };
  source: Contact["source"];
  createdAt: string | null;
  qualification: {
    sale: QualificationFactDto[];
    rental: QualificationFactDto[];
    shared: QualificationFactDto[];
  };
  timeline: TimelineItemDto[];
  policy: ContactPolicy;
  duplicates: DuplicateDto[];
  handoff: {
    status: Contact["handoff"]["status"];
    reason: string | null;
    requestedAt: string | null;
  };
  beforeCall: BeforeCallDto;
}

export function toContactListItemDto(contact: Contact): ContactListItemDto {
  const latestInteraction =
    [...contact.timeline].reverse().find((item) => item.occurredAt !== null) ??
    contact.timeline.at(-1) ??
    null;

  return {
    id: contact.id,
    displayName: contact.identity.displayName,
    initials: contact.identity.initials,
    source: contact.source,
    phone: contact.identity.phone?.display ?? null,
    email: contact.identity.email?.value ?? null,
    latestInteraction: latestInteraction
      ? toTimelineItemDto(latestInteraction)
      : null,
  };
}

export function toContactDetailDto(
  contact: Contact,
  duplicates: DuplicateDto[],
): ContactDetailDto {
  const policy = evaluateContactPolicy(contact);
  const qualification = mapQualification(contact.qualification);
  const timeline = contact.timeline.map(toTimelineItemDto);

  return {
    id: contact.id,
    identity: {
      displayName: contact.identity.displayName,
      fullName: contact.identity.fullName,
      initials: contact.identity.initials,
      phone: contact.identity.phone
        ? {
            display: contact.identity.phone.display,
            href: `tel:+${contact.identity.phone.comparable}`,
          }
        : null,
      email: contact.identity.email
        ? {
            value: contact.identity.email.value,
            actionable: contact.identity.email.actionable,
            href: contact.identity.email.actionable
              ? `mailto:${contact.identity.email.value}`
              : null,
          }
        : null,
    },
    source: contact.source,
    createdAt: toIso(contact.createdAt),
    qualification,
    timeline,
    policy,
    duplicates,
    handoff: {
      status: contact.handoff.status,
      reason: contact.handoff.reason,
      requestedAt: toIso(contact.handoff.requestedAt),
    },
    beforeCall: createBeforeCall(contact, policy),
  };
}

function mapQualification(
  qualification: QualificationGroups,
): ContactDetailDto["qualification"] {
  return {
    sale: qualification.sale.map(toQualificationFactDto),
    rental: qualification.rental.map(toQualificationFactDto),
    shared: qualification.shared.map(toQualificationFactDto),
  };
}

function toQualificationFactDto(fact: QualificationFact): QualificationFactDto {
  return {
    key: fact.key,
    value: fact.value,
    source: fact.source,
    occurredAt: toIso(fact.occurredAt),
    evidence: fact.evidence.map(toFactEvidenceDto),
  };
}

function toFactEvidenceDto(evidence: FactEvidence): FactEvidenceDto {
  return {
    value: evidence.value,
    source: evidence.source,
    occurredAt: toIso(evidence.occurredAt),
  };
}

function toTimelineItemDto(item: ContactTimelineItem): TimelineItemDto {
  return {
    ...item,
    occurredAt: toIso(item.occurredAt),
  };
}

function createBeforeCall(
  contact: Contact,
  policy: ContactPolicy,
): BeforeCallDto {
  const allFacts = [
    ...contact.qualification.sale,
    ...contact.qualification.rental,
    ...contact.qualification.shared,
  ];
  const hasSale = contact.qualification.sale.length > 0;
  const hasRental = contact.qualification.rental.length > 0;
  const operation =
    hasSale && hasRental
      ? "Compra y alquiler"
      : hasSale
        ? "Compra"
        : hasRental
          ? "Alquiler"
          : "Por confirmar";
  const latest = [...contact.timeline]
    .reverse()
    .find((item) => item.summary || item.content);
  const blockers: string[] = [];

  if (policy.actions.call.status === "blocked") {
    blockers.push("Llamadas bloqueadas por señal estructurada no-llamar.");
  }
  if (contact.handoff.status === "requested") {
    blockers.push("Traspaso humano solicitado.");
  }

  return {
    operation,
    keyNeeds: allFacts.slice(0, 3).map((fact) => ({
      label: humanizeKey(fact.key),
      value: formatQualificationValue(fact.value),
    })),
    latestInteraction:
      latest?.summary ??
      latest?.content ??
      "Todavía no hay interacciones registradas.",
    blockers,
  };
}

function humanizeKey(key: string): string {
  const text = key.replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Dato";
}

function toIso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}
