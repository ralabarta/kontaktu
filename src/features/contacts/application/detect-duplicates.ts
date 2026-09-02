import type { Contact } from "../domain/contact";

export type DuplicateEvidence = "phone" | "email";

export interface PossibleDuplicate {
  contactId: string;
  matchedBy: DuplicateEvidence[];
  reason: string;
}

export function detectPossibleDuplicates(
  target: Contact,
  contacts: Contact[],
): PossibleDuplicate[] {
  return contacts.flatMap((candidate) => {
    if (
      candidate.id === target.id ||
      candidate.organizationId !== target.organizationId
    ) {
      return [];
    }

    const matchedBy: DuplicateEvidence[] = [];
    const phoneMatches =
      target.identity.phone !== null &&
      candidate.identity.phone !== null &&
      target.identity.phone.comparable === candidate.identity.phone.comparable;
    const emailMatches =
      target.identity.email?.actionable === true &&
      candidate.identity.email?.actionable === true &&
      target.identity.email.value === candidate.identity.email.value;

    if (phoneMatches) matchedBy.push("phone");
    if (emailMatches) matchedBy.push("email");
    if (matchedBy.length === 0) return [];

    return [
      {
        contactId: candidate.id,
        matchedBy,
        reason: explainMatch(target, matchedBy),
      },
    ];
  });
}

function explainMatch(target: Contact, matchedBy: DuplicateEvidence[]): string {
  const reasons = matchedBy.map((evidence) => {
    if (evidence === "phone") {
      return `Mismo teléfono normalizado: ${target.identity.phone?.display}`;
    }

    return `Mismo email normalizado: ${target.identity.email?.value}`;
  });

  return reasons.join(" · ");
}
