// @vitest-environment node

import { describe, expect, it } from "vitest";
import { GET as getContacts } from "@/app/api/contacts/route";
import { GET as getContact } from "@/app/api/contacts/[id]/route";

const request = (path: string) => new Request(`http://localhost${path}`);

async function json(response: Response): Promise<unknown> {
  return response.json();
}

describe("GET /api/contacts", () => {
  it("returns the minimal list envelope with no-store semantics", async () => {
    const response = await getContacts(request("/api/contacts"));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          displayName: expect.any(String),
          source: expect.any(String),
          latestInteraction: expect.anything(),
        }),
      ]),
      meta: { count: 15 },
    });
    expect(JSON.stringify(body)).not.toMatch(
      /organizationId|organization_id|qualification_data|comparable|tags|notes/,
    );
  });

  it.each([
    "/api/contacts?source=telegram",
    `/api/contacts?q=${"x".repeat(81)}`,
    "/api/contacts?source=voice&source=crm",
  ])("returns a safe 400 for invalid query parameters: %s", async (path) => {
    const response = await getContacts(request(path));

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: { code: "INVALID_REQUEST", message: "Solicitud no válida." },
    });
  });

  it("applies q and source filters and reports the filtered count", async () => {
    const response = await getContacts(
      request("/api/contacts?q=bruno&source=whatsapp"),
    );

    expect(await json(response)).toMatchObject({
      data: [{ id: "demo-contact-03" }],
      meta: { count: 1, query: "bruno", source: "whatsapp" },
    });
  });
});

describe("GET /api/contacts/[id]", () => {
  const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

  it("returns a validated detail DTO envelope", async () => {
    const response = await getContact(
      request("/api/contacts/demo-contact-10"),
      routeContext("demo-contact-10"),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toMatchObject({
      data: {
        id: "demo-contact-10",
        qualification: {
          sale: [expect.objectContaining({ source: "manual", value: 335000 })],
        },
        policy: {
          actions: { call: expect.any(Object), email: expect.any(Object) },
        },
        duplicates: expect.any(Array),
      },
      meta: { found: true },
    });
  });

  it("uses the same safe 404 for missing and cross-tenant contacts", async () => {
    const missing = await getContact(
      request("/api/contacts/demo-contact-99"),
      routeContext("demo-contact-99"),
    );
    const hidden = await getContact(
      request("/api/contacts/demo-contact-16-hidden"),
      routeContext("demo-contact-16-hidden"),
    );

    expect(missing.status).toBe(404);
    expect(hidden.status).toBe(404);
    expect(await json(missing)).toEqual(await json(hidden));
  });

  it.each(["", "../secret", "contact with spaces", "x".repeat(81)])(
    "returns a safe 400 for an invalid id: %s",
    async (id) => {
      const response = await getContact(
        request("/api/contacts/invalid"),
        routeContext(id),
      );

      expect(response.status).toBe(400);
      expect(await json(response)).toEqual({
        error: { code: "INVALID_REQUEST", message: "Solicitud no válida." },
      });
    },
  );
});
