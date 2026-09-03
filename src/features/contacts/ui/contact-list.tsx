import Link from "next/link";
import { formatContactListDate } from "@/lib/dates/format-contact-date";
import type { ContactListItemDto } from "../application/contact.dto";

export interface ContactListProps {
  contacts: ContactListItemDto[];
  selectedId: string | null;
}

const sourceLabels: Record<ContactListItemDto["source"], string> = {
  voice: "Llamada",
  whatsapp: "WhatsApp",
  web: "Web",
  meta: "Meta",
  crm: "CRM",
  manual: "Manual",
  unknown: "Origen desconocido",
};

const channelLabels = {
  voice: "Llamada",
  whatsapp: "WhatsApp",
  "web-form": "Formulario web",
  email: "Email",
  unknown: "Canal desconocido",
};

export function ContactList({ contacts, selectedId }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-state__mark" aria-hidden="true">
          0
        </span>
        <h2>No hay contactos que coincidan</h2>
        <p>Prueba a limpiar la búsqueda o cambia el filtro de origen.</p>
      </div>
    );
  }

  return (
    <nav aria-label="Contactos" className="contact-list-nav">
      <ol className="contact-list">
        {contacts.map((contact) => {
          const interaction = contact.latestInteraction;
          const summary =
            interaction?.summary ??
            interaction?.content ??
            "Sin interacciones registradas";

          return (
            <li key={contact.id}>
              <Link
                href={`/contacts/${contact.id}`}
                aria-current={selectedId === contact.id ? "true" : undefined}
                className="contact-list-item"
              >
                <span className="contact-list-item__avatar" aria-hidden="true">
                  {contact.initials}
                </span>
                <span className="contact-list-item__body">
                  <span className="contact-list-item__headline">
                    <strong>{contact.displayName}</strong>
                    <span
                      className={`source-badge source-badge--${contact.source}`}
                    >
                      {sourceLabels[contact.source]}
                    </span>
                  </span>
                  <span className="contact-list-item__summary">{summary}</span>
                  <span className="contact-list-item__meta">
                    {interaction
                      ? channelLabels[interaction.channel]
                      : "Sin actividad"}
                    <span aria-hidden="true">·</span>
                    {formatContactListDate(interaction?.occurredAt ?? null)}
                  </span>
                </span>
                <svg
                  className="contact-list-item__arrow"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="m7 4 6 6-6 6" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
