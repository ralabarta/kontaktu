import { describe, expect, it } from "vitest";
import { rawContactSchema } from "@/features/contacts/data/contact.schema";
import {
  formatQualificationValue,
  normalizeContact,
  normalizeEmail,
  normalizePhone,
  resolveFactPrecedence,
} from "@/features/contacts/application/normalize-contact";

// Spanish subscriber ranges do not start with 0 or 1; test numbers are intentionally impossible.
const contact = (overrides: Record<string, unknown> = {}) => ({
  id: "synthetic-contact",
  organization_id: "ORG-TEST",
  full_name: "Synthetic Fixture Contact",
  phone: "+34 100 00 00 00",
  email: "sample@example.invalid",
  lead_source: "VOICE_CALL",
  created_at: "2026-07-08T10:28:00Z",
  qualification_data: null,
  interactions: [],
  ...overrides,
});

describe("rawContactSchema", () => {
  it("accepts heterogeneous input while stripping unknown keys from every trusted boundary", () => {
    const sentinel = "__UNTRUSTED_SENTINEL__";
    const input = contact({
      full_name: null,
      created_at: 1782259200,
      qualification_data:
        '{"qualification":{"rental":{"budget":{"value":1400,"source":"explicit"}}}}',
      interactions: [
        {
          id: "synthetic-interaction",
          channel: "EMAIL",
          unknown_interaction_field: sentinel,
        },
      ],
      unknown_upstream_field: sentinel,
    });

    const parsed = rawContactSchema.parse(input);
    const normalized = normalizeContact(input);
    const serialized = JSON.stringify(normalized);

    expect(parsed).not.toHaveProperty("unknown_upstream_field");
    expect(parsed.interactions?.[0]).not.toHaveProperty(
      "unknown_interaction_field",
    );
    expect(normalized).not.toHaveProperty("unknown_upstream_field");
    expect(serialized).not.toContain(sentinel);
    expect(serialized).not.toContain('"raw"');
  });
});

describe("normalizeContact", () => {
  it("normalizes a string qualification payload like c-003", () => {
    const result = normalizeContact(
      contact({
        id: "c-003-shape",
        qualification_data:
          '{"qualification":{"rental":{"budget":{"value":1400,"source":"explicit","confidence":"high","updatedAt":"2026-07-10T09:45:00Z"}}}}',
      }),
    );

    expect(result.qualification.rental).toEqual([
      expect.objectContaining({
        key: "budget",
        value: 1400,
        source: "customer",
        confidence: "high",
      }),
    ]);
  });

  it("uses name, phone, email, then a dignified unidentified fallback", () => {
    expect(normalizeContact(contact()).identity.displayName).toBe(
      "Synthetic Fixture Contact",
    );
    expect(
      normalizeContact(contact({ full_name: null })).identity.displayName,
    ).toBe("+34 100 000 000");
    expect(
      normalizeContact(contact({ full_name: null, phone: null })).identity
        .displayName,
    ).toBe("sample@example.invalid");
    expect(
      normalizeContact(contact({ full_name: null, phone: null, email: null }))
        .identity.displayName,
    ).toBe("Contacto sin identificar");
  });

  it("normalizes known and unknown sources and channels", () => {
    const result = normalizeContact(
      contact({
        lead_source: "VOZ",
        interactions: [
          {
            id: "email",
            channel: "EMAIL",
            direction: "inbound",
            created_at: "2026-07-08T10:00:00Z",
            content: "Email message",
          },
          {
            id: "unknown",
            channel: "carrier-pigeon",
            created_at: "2026-07-08T11:00:00Z",
            content: "Unknown channel",
          },
        ],
      }),
    );

    expect(result.source).toBe("voice");
    expect(result.timeline.map(({ channel }) => channel)).toEqual([
      "email",
      "unknown",
    ]);
    expect(normalizeContact(contact({ lead_source: "other" })).source).toBe(
      "unknown",
    );
  });

  it("normalizes phones for display and exact comparison", () => {
    expect(normalizePhone("0034100000000")).toEqual({
      display: "+34 100 000 000",
      comparable: "34100000000",
    });
    expect(normalizePhone("100000000")).toEqual({
      display: "+34 100 000 000",
      comparable: "34100000000",
    });
  });

  it("marks invalid email as non-actionable", () => {
    expect(normalizeEmail("person@example.invalid")).toEqual({
      value: "person@example.invalid",
      actionable: true,
    });
    expect(normalizeEmail("person@@example.invalid")).toEqual({
      value: "person@@example.invalid",
      actionable: false,
    });
  });

  it("groups facts, excludes _meta, and keeps unknown renderable values", () => {
    const result = normalizeContact(
      contact({
        qualification_data: {
          qualification: {
            sale: {
              active: { value: true, source: "explicit" },
              details: { value: { max: 480000 }, source: "inferred" },
            },
            shared: {
              labels: { value: ["urgent", 2], source: "manual" },
            },
            _meta: { lastSource: "voice" },
          },
        },
      }),
    );

    expect(result.qualification.sale.map(({ key }) => key)).toEqual([
      "active",
      "details",
    ]);
    expect(result.qualification.shared.map(({ key }) => key)).toEqual([
      "labels",
    ]);
    expect(formatQualificationValue({ max: 480000 })).toBe('{"max":480000}');
    expect(formatQualificationValue(["urgent", 2])).toBe("urgent, 2");
  });

  it("keeps timeline ordering chronological and stable with invalid dates last", () => {
    const result = normalizeContact(
      contact({
        interactions: [
          { id: "same-a", channel: "VOICE", created_at: "11/07/2026 18:42" },
          { id: "invalid", channel: "VOICE", created_at: "not-a-date" },
          {
            id: "earlier",
            channel: "VOICE",
            created_at: "2026-07-10T09:00:00Z",
          },
          { id: "same-b", channel: "VOICE", created_at: "11/07/2026 18:42" },
        ],
      }),
    );

    expect(result.timeline.map(({ id }) => id)).toEqual([
      "earlier",
      "same-a",
      "same-b",
      "invalid",
    ]);
    expect(result.timeline.at(-1)?.occurredAt).toBeNull();
  });

  it("keeps a valid manual correction over AI or customer evidence", () => {
    const selected = resolveFactPrecedence([
      { value: 300000, source: "customer", occurredAt: new Date("2026-07-05") },
      { value: 325000, source: "ai", occurredAt: new Date("2026-07-06") },
      { value: 350000, source: "manual", occurredAt: new Date("2026-07-10") },
    ]);

    expect(selected).toEqual(
      expect.objectContaining({ value: 350000, source: "manual" }),
    );
  });

  it("keeps a current manual fact effective while prior customer evidence remains only in timeline", () => {
    const result = normalizeContact(
      contact({
        qualification_data: {
          qualification: {
            sale: {
              budget: {
                value: { max: 350000 },
                source: "manual",
                updatedAt: "2026-07-10T09:15:00Z",
              },
            },
          },
        },
        interactions: [
          {
            id: "synthetic-prior-customer-evidence",
            channel: "VOICE",
            direction: "inbound",
            created_at: "2026-07-09T08:00:00Z",
            content: "Earlier customer budget was 300000.",
          },
        ],
      }),
    );

    expect(result.qualification.sale).toEqual([
      expect.objectContaining({
        key: "budget",
        source: "manual",
        value: { max: 350000 },
        evidence: [expect.objectContaining({ source: "manual" })],
      }),
    ]);
    expect(result.timeline).toEqual([
      expect.objectContaining({
        id: "synthetic-prior-customer-evidence",
        content: "Earlier customer budget was 300000.",
      }),
    ]);
  });

  it("does not invent historical facts for a lone manual value like c-008", () => {
    const result = normalizeContact(
      contact({
        id: "c-008-shape",
        qualification_data: {
          qualification: {
            sale: {
              budget: {
                value: { max: 350000 },
                source: "manual",
                updatedAt: "2026-07-10T09:15:00Z",
              },
            },
          },
        },
      }),
    );

    expect(result.qualification.sale).toHaveLength(1);
    expect(result.qualification.sale[0]).toEqual(
      expect.objectContaining({ source: "manual", value: { max: 350000 } }),
    );
  });

  it("normalizes a sparse contact like c-012", () => {
    const result = normalizeContact(
      contact({
        id: "c-012-shape",
        full_name: null,
        phone: "+34000112233",
        email: null,
        lead_source: null,
        created_at: 1782259200,
      }),
    );

    expect(result.identity.displayName).toBe("+34 000 112 233");
    expect(result.source).toBe("unknown");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.timeline).toEqual([]);
  });
});
