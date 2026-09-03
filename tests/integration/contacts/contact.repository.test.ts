// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  DEMO_TENANT_ID,
  getContactById,
  listContacts,
} from "@/features/contacts/data/contact.repository";

function serialized(value: unknown): string {
  return JSON.stringify(value);
}

describe("contact repository", () => {
  it("fails closed to the fixed demo tenant and never returns hidden tenant records", () => {
    const contacts = listContacts();

    expect(DEMO_TENANT_ID).toBe("ORG-DEMO");
    expect(contacts).toHaveLength(15);
    expect(contacts.map((contact) => contact.id)).not.toContain(
      "demo-contact-16-hidden",
    );
    expect(getContactById("demo-contact-16-hidden")).toBeNull();
  });

  it("orders contacts by latest interaction descending with a stable fallback", () => {
    const firstRun = listContacts().map((contact) => contact.id);
    const secondRun = listContacts().map((contact) => contact.id);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun.slice(0, 3)).toEqual([
      "demo-contact-15",
      "demo-contact-14",
      "demo-contact-10",
    ]);
  });

  it("filters only by the search and normalized source used by the UI", () => {
    expect(listContacts({ q: "precedencia" })).toHaveLength(1);
    expect(listContacts({ q: "EXAMPLE.INVALID" })).toHaveLength(10);
    expect(
      listContacts({ source: "whatsapp" }).map((contact) => contact.id),
    ).toEqual(["demo-contact-15", "demo-contact-03"]);
  });

  it("returns reciprocal same-tenant duplicates without exposing the cross-tenant match", () => {
    const first = getContactById("demo-contact-01");
    const duplicate = getContactById("demo-contact-02");

    expect(first?.duplicates).toEqual([
      {
        contactId: "demo-contact-02",
        displayName: expect.stringContaining("Ficticia Duplicada"),
        matchedBy: ["phone"],
        reason: "Coincidencia exacta de teléfono normalizado",
      },
    ]);
    expect(duplicate?.duplicates[0]?.contactId).toBe("demo-contact-01");
    expect(serialized(first)).not.toContain("demo-contact-16-hidden");
  });

  it("serializes only the minimal normalized DTO and no internal tenant or raw fields", () => {
    const detail = getContactById("demo-contact-10");
    const output = serialized(detail);

    expect(detail).toMatchObject({
      id: "demo-contact-10",
      identity: { displayName: expect.stringContaining("Precedencia Manual") },
      qualification: {
        sale: [
          {
            key: "budget",
            value: 335000,
            source: "manual",
            evidence: [
              { value: 300000, source: "customer" },
              { value: 335000, source: "manual" },
            ],
          },
        ],
      },
    });
    expect(output).not.toMatch(
      /organizationId|organization_id|qualification_data|comparable|tags|notes/,
    );
  });
});
