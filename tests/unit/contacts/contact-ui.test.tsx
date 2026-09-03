import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getContactById,
  listContacts,
} from "@/features/contacts/data/contact.repository";
import { ContactDetail } from "@/features/contacts/ui/contact-detail";
import { ContactList } from "@/features/contacts/ui/contact-list";
import { ContactWorkspace } from "@/features/contacts/ui/contact-workspace";

const detail = (id: string) => {
  const contact = getContactById(id);
  if (!contact) throw new Error(`Missing synthetic fixture ${id}`);
  return contact;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ContactList", () => {
  it("renders navigable identity, origin, and latest interaction", () => {
    render(
      <ContactList
        contacts={listContacts({ source: "whatsapp" })}
        selectedId="demo-contact-03"
      />,
    );

    expect(
      screen.getByRole("link", { name: /bruno simulado inquilino/i }),
    ).toHaveAttribute("href", "/contacts/demo-contact-03");
    expect(screen.getAllByText("WhatsApp").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/pregunta por un alquiler sintético/i),
    ).toBeVisible();
  });

  it("renders a useful empty state", () => {
    render(<ContactList contacts={[]} selectedId={null} />);

    expect(screen.getByText("No hay contactos que coincidan")).toBeVisible();
    expect(screen.getByText(/prueba a limpiar la búsqueda/i)).toBeVisible();
  });
});

describe("ContactDetail", () => {
  it("keeps a sparse contact dignified without empty cards", () => {
    render(<ContactDetail contact={detail("demo-contact-04")} />);

    expect(
      screen.getByRole("heading", { name: /Contacto sin identificar/ }),
    ).toBeVisible();
    expect(screen.getByText("Sin teléfono disponible")).toBeVisible();
    expect(screen.getByText("Sin email disponible")).toBeVisible();
    expect(screen.getByText("Sin cualificación registrada")).toBeVisible();
    expect(screen.getByText("Todavía no hay interacciones")).toBeVisible();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });

  it("renders dynamic mixed facts with source, date, and prior evidence", () => {
    render(<ContactDetail contact={detail("demo-contact-10")} />);

    expect(screen.getAllByText("Budget").length).toBeGreaterThan(0);
    expect(screen.getAllByText("335000").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Edición manual/).length).toBeGreaterThan(0);
    expect(screen.getByText("300000")).toBeInTheDocument();
    expect(
      screen.getByText(/evidencia anterior.*cliente/i),
    ).toBeInTheDocument();
  });

  it("orders timeline content and exposes transcript only for calls that have one", async () => {
    const user = userEvent.setup();
    render(<ContactDetail contact={detail("demo-contact-01")} />);

    const timeline = screen.getByRole("list", { name: /Interacciones/ });
    expect(timeline.textContent?.indexOf("Busca una vivienda")).toBeLessThan(
      timeline.textContent?.indexOf("Confirma que puede visitar") ?? 0,
    );

    const disclosure = screen.getByText("Ver transcripción");
    expect(disclosure).toBeVisible();
    await user.click(disclosure);
    expect(
      screen.getByText(/transcripción es completamente sintética/i),
    ).toBeVisible();
    expect(screen.getAllByText("Ver transcripción")).toHaveLength(1);
  });

  it("shows reciprocal duplicate evidence and navigation without a merge action", () => {
    render(<ContactDetail contact={detail("demo-contact-01")} />);

    expect(screen.getByText("Posible duplicado")).toBeVisible();
    expect(screen.getByText(/coincidencia exacta de teléfono/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /aina ficticia duplicada/i }),
    ).toHaveAttribute("href", "/contacts/demo-contact-02");
    expect(
      screen.queryByRole("button", { name: /fusionar/i }),
    ).not.toBeInTheDocument();
  });

  it("makes the ten-second before-call summary immediately understandable", () => {
    render(<ContactDetail contact={detail("demo-contact-01")} />);

    const summary = screen.getByLabelText("Resumen antes de llamar");
    expect(summary).toHaveTextContent("Compra");
    expect(summary).toHaveTextContent("Budget");
    expect(summary).toHaveTextContent("420000");
    expect(summary).toHaveTextContent(/confirma que puede visitar/i);
  });

  it("separates compliance from handoff and blocks only the structured call signal", () => {
    render(<ContactDetail contact={detail("demo-contact-07")} />);

    expect(
      screen.getByRole("group", { name: /Acciones de contacto/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /Llamada bloqueada/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /llamada bloqueada/i }),
    ).toBeDisabled();
    expect(screen.getByRole("link", { name: /enviar email/i })).toHaveAttribute(
      "href",
      "mailto:dora.cumplimiento@example.invalid",
    );
    expect(screen.getByText(/no acredita consentimiento/i)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /Traspaso humano/ }),
    ).toBeVisible();
    expect(screen.getByText(/persona revise el caso sintético/i)).toBeVisible();
  });

  it("keeps calling technically available without claiming consent when no no-call tag exists", () => {
    render(<ContactDetail contact={detail("demo-contact-14")} />);

    expect(screen.getByRole("link", { name: /^llamar$/i })).toHaveAttribute(
      "href",
      "tel:+34100000014",
    );
    expect(screen.getByText(/permiso no confirmado/i)).toBeVisible();
  });
});

describe("ContactWorkspace", () => {
  it("shows a retryable error state when the API cannot load", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ContactWorkspace initialContactId={null} />);

    expect(
      await screen.findByText("No pudimos cargar los contactos"),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /No pudimos abrir esta ficha/ }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /Reintentar listado/ }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("marks the automatically opened root contact as the current list item", async () => {
    const contacts = listContacts({ source: "whatsapp" });
    const first = contacts[0];
    if (!first) throw new Error("Missing synthetic list fixture");
    const selected = detail(first.id);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: contacts, meta: { count: 2 } })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: selected, meta: { found: true } })),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactWorkspace initialContactId={null} />);

    expect(
      await screen.findByRole("link", { name: /Luz Conversación WhatsApp/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("shows the API-backed empty state without requesting a detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: { count: 0 } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactWorkspace initialContactId={null} />);

    expect(
      await screen.findByText("No hay contactos que coincidan"),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
