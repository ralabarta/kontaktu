import { NextResponse } from "next/server";
import { z } from "zod";
import { listContacts } from "@/features/contacts/data/contact.repository";

export const dynamic = "force-dynamic";

const sourceSchema = z.enum([
  "voice",
  "whatsapp",
  "web",
  "meta",
  "crm",
  "manual",
  "unknown",
]);

const querySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    source: sourceSchema.optional(),
  })
  .strict();

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    if (hasDuplicateParameters(url.searchParams)) return invalidRequest();

    const rawQuery = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) return invalidRequest();

    const data = listContacts(parsed.data);
    return NextResponse.json(
      {
        data,
        meta: {
          count: data.length,
          ...(parsed.data.q ? { query: parsed.data.q } : {}),
          ...(parsed.data.source ? { source: parsed.data.source } : {}),
        },
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No se pudo completar la solicitud.",
        },
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

function hasDuplicateParameters(searchParams: URLSearchParams): boolean {
  return [...new Set(searchParams.keys())].some(
    (key) => searchParams.getAll(key).length > 1,
  );
}

function invalidRequest(): NextResponse {
  return NextResponse.json(
    { error: { code: "INVALID_REQUEST", message: "Solicitud no válida." } },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}
