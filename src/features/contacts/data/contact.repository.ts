import "server-only";

import { z } from "zod";
import fixture from "@/data/demo-contacts.json";
import { detectPossibleDuplicates } from "../application/detect-duplicates";
import {
  toContactDetailDto,
  toContactListItemDto,
  type ContactDetailDto,
  type ContactListItemDto,
  type DuplicateDto,
} from "../application/contact.dto";
import { normalizeContact } from "../application/normalize-contact";
import type { CanonicalSource, Contact } from "../domain/contact";
import { rawContactSchema } from "./contact.schema";

export const DEMO_TENANT_ID = "ORG-DEMO";

export interface ContactListFilters {
  q?: string;
  source?: CanonicalSource;
}

const fixtureSchema = z.object({
  is_test: z.literal(true),
  contacts: z.array(rawContactSchema),
});

const contacts = fixtureSchema.parse(fixture).contacts.map(normalizeContact);

export function listContacts(
  filters: ContactListFilters = {},
): ContactListItemDto[] {
  const query = filters.q?.trim().toLocaleLowerCase("es") ?? "";

  return tenantContacts()
    .filter((contact) => !filters.source || contact.source === filters.source)
    .filter((contact) => !query || searchableText(contact).includes(query))
    .sort(compareContacts)
    .map(toContactListItemDto);
}

export function getContactById(id: string): ContactDetailDto | null {
  const visibleContacts = tenantContacts();
  const contact = visibleContacts.find((candidate) => candidate.id === id);
  if (!contact) return null;

  const duplicates = detectPossibleDuplicates(contact, visibleContacts).map(
    (match): DuplicateDto => {
      const duplicate = visibleContacts.find(
        (candidate) => candidate.id === match.contactId,
      );
      return {
        contactId: match.contactId,
        displayName:
          duplicate?.identity.displayName ?? "Otro contacto del mismo espacio",
        matchedBy: match.matchedBy,
        reason: duplicateReason(match.matchedBy),
      };
    },
  );

  return toContactDetailDto(contact, duplicates);
}

function tenantContacts(): Contact[] {
  return contacts.filter(
    (contact) => contact.organizationId === DEMO_TENANT_ID,
  );
}

function searchableText(contact: Contact): string {
  return [
    contact.identity.displayName,
    contact.identity.phone?.display,
    contact.identity.email?.value,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase("es");
}

function compareContacts(left: Contact, right: Contact): number {
  const activityDifference =
    latestInteractionTime(right) - latestInteractionTime(left);
  if (activityDifference !== 0) return activityDifference;

  const creationDifference =
    dateTime(right.createdAt) - dateTime(left.createdAt);
  if (creationDifference !== 0) return creationDifference;

  return left.id.localeCompare(right.id);
}

function latestInteractionTime(contact: Contact): number {
  const datedInteractions = contact.timeline
    .map((item) => dateTime(item.occurredAt))
    .filter((value) => Number.isFinite(value));
  return datedInteractions.length > 0
    ? Math.max(...datedInteractions)
    : Number.NEGATIVE_INFINITY;
}

function dateTime(value: Date | null): number {
  return value?.getTime() ?? Number.NEGATIVE_INFINITY;
}

function duplicateReason(matchedBy: ("phone" | "email")[]): string {
  const labels = matchedBy.map((evidence) =>
    evidence === "phone" ? "teléfono normalizado" : "email normalizado",
  );
  return `Coincidencia exacta de ${labels.join(" y ")}`;
}
