"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  contactDetailSuccessSchema,
  contactListSuccessSchema,
  type ContactDetailDto,
  type ContactListItemDto,
} from "../application/contact-api.schema";
import { ContactDetail } from "./contact-detail";
import { ContactList } from "./contact-list";

interface ContactWorkspaceProps {
  initialContactId: string | null;
}

type DetailState =
  | { status: "idle" }
  | { status: "ready"; detailId: string; contact: ContactDetailDto }
  | { status: "not-found" | "error"; detailId: string };

export function ContactWorkspace({ initialContactId }: ContactWorkspaceProps) {
  const [contacts, setContacts] = useState<ContactListItemDto[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialContactId);
  const [listError, setListError] = useState(false);
  const [detailState, setDetailState] = useState<DetailState>({
    status: "idle",
  });
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [filters, setFilters] = useState({ query: "", source: "" });
  const [listRetryKey, setListRetryKey] = useState(0);
  const [detailRetryKey, setDetailRetryKey] = useState(0);
  const detailId = initialContactId ?? selectedId;

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;
    const searchParams = new URLSearchParams();
    if (filters.query) searchParams.set("q", filters.query);
    if (filters.source) searchParams.set("source", filters.source);
    const suffix = searchParams.size > 0 ? `?${searchParams}` : "";

    fetch(`/api/contacts${suffix}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("list request failed");
        const payload = contactListSuccessSchema.parse(await response.json());
        if (!isCurrent) return;
        setListError(false);
        setContacts(payload.data);
        setSelectedId((currentId) => currentId ?? payload.data[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setListError(true);
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [filters, listRetryKey]);

  useEffect(() => {
    if (!detailId) return;

    const controller = new AbortController();
    let isCurrent = true;

    fetch(`/api/contacts/${encodeURIComponent(detailId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 404) {
          if (isCurrent) setDetailState({ status: "not-found", detailId });
          return;
        }
        if (!response.ok) throw new Error("detail request failed");
        const payload = contactDetailSuccessSchema.parse(await response.json());
        if (isCurrent)
          setDetailState({ status: "ready", detailId, contact: payload.data });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setDetailState({ status: "error", detailId });
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [detailId, detailRetryKey]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContacts(null);
    setListError(false);
    if (initialContactId === null) setSelectedId(null);
    setFilters({ query: query.trim(), source });
  }

  function retryList() {
    setContacts(null);
    setListError(false);
    setListRetryKey((value) => value + 1);
  }

  function retryDetail() {
    setDetailRetryKey((value) => value + 1);
  }

  const activeDetailState =
    detailState.status !== "idle" && detailState.detailId === detailId
      ? detailState
      : ({ status: "idle" } satisfies DetailState);
  const detailFailed =
    activeDetailState.status === "error" || (listError && !detailId);

  return (
    <div
      className={`workspace ${initialContactId ? "workspace--detail-route" : ""}`}
    >
      <aside className="workspace-sidebar" aria-labelledby="contacts-title">
        <div className="sidebar-heading">
          <div>
            <p className="section-kicker">Cartera activa</p>
            <h2 id="contacts-title">Contactos</h2>
          </div>
          {contacts ? (
            <span
              className="contact-count"
              aria-label={`${contacts.length} contactos`}
            >
              {String(contacts.length).padStart(2, "0")}
            </span>
          ) : null}
        </div>

        <form className="contact-filters" onSubmit={applyFilters}>
          <label>
            <span>Buscar contacto</span>
            <input
              type="search"
              name="q"
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, email o teléfono"
            />
          </label>
          <div className="contact-filters__row">
            <label>
              <span>Origen</span>
              <select
                name="source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="voice">Llamada</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Web</option>
                <option value="meta">Meta</option>
                <option value="crm">CRM</option>
                <option value="manual">Manual</option>
                <option value="unknown">Desconocido</option>
              </select>
            </label>
            <button type="submit">Aplicar</button>
          </div>
        </form>

        {listError ? (
          <div className="error-state" role="alert">
            <strong>No pudimos cargar los contactos</strong>
            <p>Comprueba la conexión y vuelve a intentarlo.</p>
            <button type="button" onClick={retryList}>
              Reintentar listado
            </button>
          </div>
        ) : contacts === null ? (
          <ListSkeleton />
        ) : (
          <ContactList
            contacts={contacts}
            selectedId={initialContactId ?? selectedId}
          />
        )}
      </aside>

      <main className="workspace-main" id="contenido" tabIndex={-1}>
        {activeDetailState.status === "ready" ? (
          <ContactDetail contact={activeDetailState.contact} />
        ) : activeDetailState.status === "not-found" ? (
          <DetailNotFound />
        ) : detailFailed ? (
          <div className="detail-message" role="alert">
            <p className="section-kicker">Error de carga</p>
            <h1>No pudimos abrir esta ficha</h1>
            <p>
              Los contactos siguen disponibles. Puedes reintentar sin perder el
              contexto.
            </p>
            <button type="button" onClick={retryDetail}>
              Reintentar ficha
            </button>
          </div>
        ) : contacts?.length === 0 ? (
          <div className="detail-message detail-message--quiet" role="status">
            <p className="section-kicker">Sin resultados</p>
            <h1>Ajusta los filtros para continuar</h1>
            <p>La ficha aparecerá aquí cuando selecciones un contacto.</p>
          </div>
        ) : (
          <DetailSkeleton />
        )}
      </main>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div
      className="list-skeleton"
      role="status"
      aria-label="Cargando contactos"
    >
      <span>Cargando contactos…</span>
      {[0, 1, 2, 3].map((item) => (
        <i key={item} aria-hidden="true" />
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-skeleton" role="status" aria-label="Cargando ficha">
      <span>Cargando ficha…</span>
      <i aria-hidden="true" />
      <i aria-hidden="true" />
      <i aria-hidden="true" />
    </div>
  );
}

function DetailNotFound() {
  return (
    <div className="detail-message" role="status">
      <p className="section-kicker">404 · Ficha no disponible</p>
      <h1>Contacto no encontrado</h1>
      <p>Puede que ya no exista o que no pertenezca a este espacio.</p>
      <Link href="/">Volver al listado</Link>
    </div>
  );
}
