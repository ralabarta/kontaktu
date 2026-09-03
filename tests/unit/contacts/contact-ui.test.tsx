import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toContactDetailDto } from "@/features/contacts/application/contact.dto";
import { normalizeContact } from "@/features/contacts/application/normalize-contact";
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function successResponse(data: unknown, meta: object) {
  return new Response(JSON.stringify({ data, meta }));
}

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

  it("renders latest interaction dates using the Madrid calendar day", () => {
    const contact = listContacts({})[0];
    if (!contact?.latestInteraction)
      throw new Error("Missing synthetic interaction fixture");

    render(
      <ContactList
        contacts={[
          {
            ...contact,
            latestInteraction: {
              ...contact.latestInteraction,
              occurredAt: "2026-07-08T22:30:00Z",
            },
          },
        ]}
        selectedId={contact.id}
      />,
    );

    expect(
      screen.getByRole("link", { name: new RegExp(contact.displayName, "i") }),
    ).toHaveTextContent("09 jul");
  });
});

describe("ContactDetail", () => {
  it("renders contact dates and interaction datetimes in Madrid", () => {
    const contact = detail("demo-contact-01");
    const interaction = contact.timeline[0];
    if (!interaction) throw new Error("Missing synthetic interaction fixture");

    render(
      <ContactDetail
        contact={{
          ...contact,
          createdAt: "2026-07-08T22:30:00Z",
          timeline: [{ ...interaction, occurredAt: "2026-07-08T22:30:00Z" }],
        }}
      />,
    );

    expect(screen.getByText("Alta 9 jul 2026")).toBeVisible();
    expect(screen.getByText("9 jul, 00:30")).toBeVisible();
  });

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

  it("marks the precedence winner as current without reordering evidence", () => {
    const contact = toContactDetailDto(
      normalizeContact({
        id: "synthetic-unsorted-evidence",
        organization_id: "ORG-TEST",
        full_name: "Synthetic Evidence Contact",
        qualification_data: {
          qualification: {
            sale: {
              budget: [
                {
                  value: 350000,
                  source: "manual",
                  updatedAt: "2026-07-08T10:00:00Z",
                },
                {
                  value: 325000,
                  source: "inferred",
                  updatedAt: "2026-07-10T10:00:00Z",
                },
                {
                  value: 300000,
                  source: "explicit",
                  updatedAt: "2026-07-09T10:00:00Z",
                },
              ],
            },
          },
        },
      }),
      [],
    );

    render(<ContactDetail contact={contact} />);

    const history = screen
      .getByText("Ver historial del dato")
      .closest("details");
    if (!history) throw new Error("Missing evidence history");
    const evidence = within(history).getAllByRole("listitem");

    expect(evidence).toHaveLength(3);
    expect(evidence[0]).toHaveTextContent("Valor vigente");
    expect(evidence[0]).toHaveTextContent("350000");
    expect(evidence[2]).toHaveTextContent("Evidencia anterior");
    expect(evidence[2]).toHaveTextContent("300000");
  });

  it("renders a zero-second call duration as 0 s", () => {
    const contact = detail("demo-contact-01");
    const call = contact.timeline.find((item) => item.channel === "voice");
    if (!call) throw new Error("Missing synthetic call fixture");

    render(
      <ContactDetail
        contact={{
          ...contact,
          timeline: [{ ...call, durationSeconds: 0 }],
        }}
      />,
    );

    expect(screen.getByText("0 s")).toBeVisible();
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
    expect(screen.getByText("3 min 4 s")).toBeVisible();
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
  it("shows recovery instead of rendering a malformed list success envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "",
                displayName: "Synthetic unsafe contact",
                initials: "U",
                source: "telegram",
                phone: null,
                email: null,
                latestInteraction: null,
              },
            ],
            meta: { count: 1 },
          }),
        ),
      ),
    );

    render(<ContactWorkspace initialContactId={null} />);

    expect(
      await screen.findByText("No pudimos cargar los contactos"),
    ).toBeVisible();
    expect(
      screen.queryByText("Synthetic unsafe contact"),
    ).not.toBeInTheDocument();
  });

  it("shows recovery instead of rendering a malformed detail success envelope", async () => {
    const first = listContacts({}).find(
      (contact) => contact.id === "demo-contact-01",
    );
    if (!first) throw new Error("Missing synthetic list fixture");
    const contacts = [first];
    const selected = detail(first.id);
    const call = selected.timeline.find((item) => item.channel === "voice");
    if (!call) throw new Error("Missing synthetic call fixture");
    const malformedDetail = {
      ...selected,
      timeline: [{ ...call, durationSeconds: -1 }],
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: contacts, meta: { count: 2 } })),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ data: malformedDetail, meta: { found: true } }),
          ),
        ),
    );

    render(<ContactWorkspace initialContactId={null} />);

    expect(
      await screen.findByRole("heading", {
        name: /No pudimos abrir esta ficha/,
      }),
    ).toBeVisible();
    expect(screen.queryByText("-1 s")).not.toBeInTheDocument();
  });

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

  it("keeps a direct detail usable when its delayed list later fails", async () => {
    const listRequest = deferred<Response>();
    const selected = detail("demo-contact-01");
    const fetchMock = vi.fn((input: string | URL | Request) =>
      String(input) === "/api/contacts"
        ? listRequest.promise
        : Promise.resolve(successResponse(selected, { found: true })),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactWorkspace initialContactId={selected.id} />);

    expect(
      await screen.findByRole("heading", {
        name: selected.identity.displayName,
      }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/contacts/${selected.id}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    listRequest.reject(new Error("list unavailable"));

    expect(
      await screen.findByText("No pudimos cargar los contactos"),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: selected.identity.displayName }),
    ).toBeVisible();
  });

  it("ignores a stale root list after filtered results select a contact", async () => {
    const user = userEvent.setup();
    const initialList = deferred<Response>();
    const filteredList = deferred<Response>();
    const selected = detail("demo-contact-03");
    const stale = detail("demo-contact-01");
    const selectedListItem = listContacts({}).find(
      (contact) => contact.id === selected.id,
    );
    const staleListItem = listContacts({}).find(
      (contact) => contact.id === stale.id,
    );
    if (!selectedListItem || !staleListItem)
      throw new Error("Missing synthetic list fixture");

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/contacts") return initialList.promise;
      if (url.startsWith("/api/contacts?q=")) return filteredList.promise;
      return Promise.resolve(
        successResponse(url.endsWith(selected.id) ? selected : stale, {
          found: true,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactWorkspace initialContactId={null} />);
    await user.type(screen.getByRole("searchbox"), "Bruno");
    await user.click(
      screen.getByRole("button", {
        name: new RegExp("^Aplicar$", "i"), // Synthetic test selector, not fixture PII.
      }),
    );

    filteredList.resolve(successResponse([selectedListItem], { count: 1 }));

    expect(
      await screen.findByRole("heading", {
        name: selected.identity.displayName,
      }),
    ).toBeVisible();

    await act(async () => {
      initialList.resolve(successResponse([staleListItem], { count: 1 }));
      await initialList.promise;
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      screen.getByRole("heading", { name: selected.identity.displayName }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: new RegExp(selectedListItem.displayName, "i"),
      }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("aborts only stale detail work when the route id changes", async () => {
    const listRequest = deferred<Response>();
    const staleDetailRequest = deferred<Response>();
    const stale = detail("demo-contact-01");
    const selected = detail("demo-contact-03");
    let listSignal: AbortSignal | undefined;
    let staleDetailSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/contacts") {
          listSignal = init?.signal ?? undefined;
          return listRequest.promise;
        }
        if (url.endsWith(stale.id)) {
          staleDetailSignal = init?.signal ?? undefined;
          return staleDetailRequest.promise;
        }
        return Promise.resolve(successResponse(selected, { found: true }));
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <ContactWorkspace initialContactId={stale.id} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    rerender(<ContactWorkspace initialContactId={selected.id} />);

    expect(
      await screen.findByRole("heading", {
        name: selected.identity.displayName,
      }),
    ).toBeVisible();
    expect(staleDetailSignal?.aborted).toBe(true);
    expect(listSignal?.aborted).toBe(false);
    expect(
      fetchMock.mock.calls.filter(
        ([input]) => String(input) === "/api/contacts",
      ),
    ).toHaveLength(1);

    await act(async () => {
      staleDetailRequest.resolve(successResponse(stale, { found: true }));
      await staleDetailRequest.promise;
    });

    expect(
      screen.getByRole("heading", { name: selected.identity.displayName }),
    ).toBeVisible();
  });
});
