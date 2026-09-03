import { NextResponse } from "next/server";
import { z } from "zod";
import { contactDetailSuccessSchema } from "@/features/contacts/application/contact-api.schema";
import { getContactById } from "@/features/contacts/data/contact.repository";

export const dynamic = "force-dynamic";

const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const parsed = idSchema.safeParse((await context.params).id);
    if (!parsed.success) return invalidRequest();

    const data = getContactById(parsed.data);
    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Contacto no encontrado." } },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const response = contactDetailSuccessSchema.parse({
      data,
      meta: { found: true },
    });
    return NextResponse.json(response, { headers: NO_STORE_HEADERS });
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

function invalidRequest(): NextResponse {
  return NextResponse.json(
    { error: { code: "INVALID_REQUEST", message: "Solicitud no válida." } },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}
