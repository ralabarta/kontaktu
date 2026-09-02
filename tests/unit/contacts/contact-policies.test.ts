import { describe, expect, it } from "vitest";
import { detectPossibleDuplicates } from "@/features/contacts/application/detect-duplicates";
import { evaluateContactPolicy } from "@/features/contacts/application/evaluate-contact-policy";
import { normalizeContact } from "@/features/contacts/application/normalize-contact";

// Spanish subscriber ranges do not start with 0 or 1; test numbers are intentionally impossible.
const rawContact = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  organization_id: "ORG-TEST",
  full_name: `Synthetic ${id}`,
  phone: null,
  email: null,
  lead_source: "CRM",
  created_at: "2026-07-08T10:28:00Z",
  qualification_data: null,
  interactions: [],
  ...overrides,
});

describe("detectPossibleDuplicates", () => {
  it("finds the c-001/c-009 shape by exact normalized phone with an explainable reason", () => {
    const original = normalizeContact(
      rawContact("c-001-shape", { phone: "+34 100 00 00 00" }),
    );
    const duplicate = normalizeContact(
      rawContact("c-009-shape", { phone: "100000000" }),
    );

    expect(detectPossibleDuplicates(original, [original, duplicate])).toEqual([
      {
        contactId: "c-009-shape",
        matchedBy: ["phone"],
        reason: "Mismo teléfono normalizado: +34 100 000 000",
      },
    ]);
  });

  it("can explain exact phone and actionable email evidence together", () => {
    const target = normalizeContact(
      rawContact("target", {
        phone: "+34 100 00 00 00",
        email: "PERSON@example.invalid",
      }),
    );
    const candidate = normalizeContact(
      rawContact("candidate", {
        phone: "100000000",
        email: "person@example.invalid",
      }),
    );

    expect(detectPossibleDuplicates(target, [candidate])[0]?.matchedBy).toEqual(
      ["phone", "email"],
    );
  });

  it("filters cross-tenant evidence but does not authorize repository or API requests", () => {
    const target = normalizeContact(
      rawContact("target", { phone: "+34 100 00 00 00" }),
    );
    const otherTenant = normalizeContact(
      rawContact("other-tenant", {
        organization_id: "ORG-OTHER",
        phone: "100000000",
      }),
    );

    expect(detectPossibleDuplicates(target, [otherTenant])).toEqual([]);
  });

  it("avoids name-only and invalid-email false positives", () => {
    const target = normalizeContact(
      rawContact("target", {
        full_name: "Synthetic Duplicate Fixture",
        email: "invalid@@example.invalid",
      }),
    );
    const candidate = normalizeContact(
      rawContact("candidate", {
        full_name: "Synthetic Duplicate Fixture",
        email: "invalid@@example.invalid",
      }),
    );

    expect(detectPossibleDuplicates(target, [candidate])).toEqual([]);
  });
});

describe("evaluateContactPolicy", () => {
  it("blocks calls from the canonical tag and keeps valid email technically available", () => {
    const policy = evaluateContactPolicy(
      normalizeContact(
        rawContact("c-013-shape", {
          phone: "+34 000 44 55 66",
          email: "person@example.invalid",
          tags: ["no-llamar"],
          notes: "Contactar SOLO por email.",
        }),
      ),
    );

    expect(policy.status).toBe("restricted");
    expect(policy.actions.call).toEqual({
      status: "blocked",
      available: false,
      reason: "El tag estructurado no-llamar bloquea las llamadas.",
    });
    expect(policy.actions.email).toEqual({
      status: "available",
      available: true,
      reason:
        "Hay un email técnicamente válido; su disponibilidad no acredita consentimiento.",
    });
    expect(policy.actions.whatsapp).toEqual(
      expect.objectContaining({ status: "unknown", available: false }),
    );
  });

  it("returns unknown and permits nothing when evidence is missing", () => {
    const policy = evaluateContactPolicy(
      normalizeContact(rawContact("sparse", { phone: "+34 000 11 22 33" })),
    );

    expect(policy.status).toBe("unknown");
    expect(Object.values(policy.actions)).toEqual([
      expect.objectContaining({ status: "unknown", available: false }),
      expect.objectContaining({ status: "unknown", available: false }),
      expect.objectContaining({ status: "unknown", available: false }),
    ]);
  });

  it("ignores note-only contact instructions without structured policy evidence", () => {
    const policy = evaluateContactPolicy(
      normalizeContact(
        rawContact("note-only", {
          notes: "Contactar solo por email; no llamar.",
        }),
      ),
    );

    expect(policy.status).toBe("unknown");
    expect(Object.values(policy.actions)).toEqual([
      expect.objectContaining({ status: "unknown", available: false }),
      expect.objectContaining({ status: "unknown", available: false }),
      expect.objectContaining({ status: "unknown", available: false }),
    ]);
  });

  it("does not infer a legal restriction from free-text transcription alone", () => {
    const policy = evaluateContactPolicy(
      normalizeContact(
        rawContact("transcript-only", {
          interactions: [
            {
              id: "synthetic-transcript",
              channel: "VOICE",
              metadata: {
                transcript_excerpt:
                  "Do not call again; this transcription is untrusted free text.",
              },
            },
          ],
        }),
      ),
    );

    expect(policy.status).toBe("unknown");
    expect(Object.values(policy.actions)).toEqual([
      expect.objectContaining({ status: "unknown", available: false }),
      expect.objectContaining({ status: "unknown", available: false }),
      expect.objectContaining({ status: "unknown", available: false }),
    ]);
  });

  it("treats an invalid email as unavailable without deciding consent", () => {
    const policy = evaluateContactPolicy(
      normalizeContact(
        rawContact("invalid-email", {
          email: "person@@example.invalid",
          tags: ["no-llamar"],
          notes: "Contactar solo por email.",
        }),
      ),
    );

    expect(policy.actions.email).toEqual({
      status: "unknown",
      available: false,
      reason: "No hay un email válido disponible; no se evalúa consentimiento.",
    });
  });
});

describe("AI handoff", () => {
  it("keeps the c-016 handoff reason and date separate from contact policy", () => {
    const result = normalizeContact(
      rawContact("c-016-shape", {
        ai_handoff: true,
        handoff_reason: "Requested a human agent",
        handoff_requested_at: "2026-07-13T19:22:00Z",
      }),
    );

    expect(result.handoff).toEqual({
      status: "requested",
      reason: "Requested a human agent",
      requestedAt: new Date("2026-07-13T19:22:00Z"),
    });
    expect(evaluateContactPolicy(result).status).toBe("unknown");
  });
});
