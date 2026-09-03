// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getContacts } from "@/app/api/contacts/route";
import { GET as getContact } from "@/app/api/contacts/[id]/route";
import {
  contactDetailSuccessSchema,
  contactListSuccessSchema,
} from "@/features/contacts/application/contact-api.schema";
import * as contactRepository from "@/features/contacts/data/contact.repository";

const request = (path: string) =>
  new Request(new URL(path, "https://example.invalid"));

async function json(response: Response): Promise<unknown> {
  return response.json();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/contacts", () => {
  it("returns the minimal list envelope with no-store semantics", async () => {
    const response = await getContacts(request("/api/contacts"));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(contactListSuccessSchema.parse(body)).toEqual(body);
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

  it("rejects a malformed list success envelope as a controlled API error", async () => {
    vi.spyOn(contactRepository, "listContacts").mockReturnValue([
      { id: "unsafe-contact", source: "telegram" },
    ] as never);

    const response = await getContacts(request("/api/contacts"));

    expect(response.status).toBe(500);
    expect(await json(response)).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "No se pudo completar la solicitud.",
      },
    });
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
    expect(contactDetailSuccessSchema.parse(body)).toEqual(body);
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

  it("rejects a malformed detail success envelope as a controlled API error", async () => {
    vi.spyOn(contactRepository, "getContactById").mockReturnValue({
      id: "unsafe-contact",
      timeline: [{ durationSeconds: Number.POSITIVE_INFINITY }],
    } as never);

    const response = await getContact(
      request("/api/contacts/unsafe-contact"),
      routeContext("unsafe-contact"),
    );

    expect(response.status).toBe(500);
    expect(await json(response)).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "No se pudo completar la solicitud.",
      },
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
