import Link from "next/link";
import {
  formatContactDate,
  formatContactDateTime,
} from "@/lib/dates/format-contact-date";
import type {
  ContactDetailDto,
  QualificationFactDto,
  TimelineItemDto,
} from "../application/contact.dto";

export interface ContactDetailProps {
  contact: ContactDetailDto;
}

const sourceLabels: Record<ContactDetailDto["source"], string> = {
  voice: "Llamada",
  whatsapp: "WhatsApp",
  web: "Web",
  meta: "Meta",
  crm: "CRM",
  manual: "Manual",
  unknown: "Origen desconocido",
};

const factSourceLabels: Record<QualificationFactDto["source"], string> = {
  manual: "Edición manual",
  customer: "Dicho por el cliente",
  ai: "Inferencia IA",
  unknown: "Procedencia desconocida",
};

const channelLabels: Record<TimelineItemDto["channel"], string> = {
  voice: "Llamada",
  whatsapp: "WhatsApp",
  "web-form": "Formulario web",
  email: "Email",
  unknown: "Canal desconocido",
};

const factLabels: Record<string, string> = {
  budget: "Budget",
  preferred_area: "Zona preferida",
  bedrooms: "Dormitorios",
  financing: "Financiación",
  move_in_flexible: "Fecha flexible",
  monthly_budget: "Presupuesto mensual",
  pets: "Mascotas",
  preferred_contact_channel: "Canal preferido",
  occupants: "Ocupantes",
  guarantor: "Aval",
  language: "Idioma",
};

export function ContactDetail({ contact }: ContactDetailProps) {
  const hasQualification = Object.values(contact.qualification).some(
    (facts) => facts.length > 0,
  );
  const callBlocked = contact.policy.actions.call.status === "blocked";

  return (
    <article className="contact-detail" aria-labelledby="contact-name">
      <Link href="/" className="mobile-back-link">
        <span aria-hidden="true">←</span> Volver a contactos
      </Link>

      <header className="identity-card">
        <div className="identity-card__main">
          <span className="identity-avatar" aria-hidden="true">
            {contact.identity.initials}
          </span>
          <div>
            <div className="identity-card__meta">
              <span className={`source-badge source-badge--${contact.source}`}>
                {sourceLabels[contact.source]}
              </span>
              <span>Alta {formatContactDate(contact.createdAt)}</span>
            </div>
            <h1 id="contact-name">{contact.identity.displayName}</h1>
            <div className="identity-card__channels">
              <span>
                {contact.identity.phone?.display ?? "Sin teléfono disponible"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {contact.identity.email?.value ?? "Sin email disponible"}
              </span>
            </div>
          </div>
        </div>

        <div
          className="identity-actions"
          role="group"
          aria-label="Acciones de contacto"
        >
          {contact.identity.phone ? (
            callBlocked ? (
              <button
                type="button"
                className="action-button action-button--blocked"
                aria-label="Llamada bloqueada"
                disabled
              >
                Llamada bloqueada
              </button>
            ) : (
              <a
                className="action-button action-button--primary"
                href={contact.identity.phone.href}
              >
                Llamar
              </a>
            )
          ) : (
            <span className="action-note">No se puede llamar</span>
          )}
          {contact.identity.email?.href ? (
            <a className="action-button" href={contact.identity.email.href}>
              Enviar email
            </a>
          ) : contact.identity.email ? (
            <button type="button" className="action-button" disabled>
              Email no válido
            </button>
          ) : null}
        </div>
      </header>

      <section
        className={`compliance-strip ${callBlocked ? "compliance-strip--blocked" : ""}`}
        aria-labelledby="compliance-title"
      >
        <div>
          <p className="section-kicker">Cumplimiento</p>
          <h2 id="compliance-title">
            {callBlocked ? "Llamada bloqueada" : "Permiso no confirmado"}
          </h2>
        </div>
        <div className="compliance-strip__copy">
          <p>{contact.policy.actions.call.reason}</p>
          {contact.identity.email?.actionable ? (
            <p>{contact.policy.actions.email.reason}</p>
          ) : null}
        </div>
      </section>

      {contact.handoff.status === "requested" ? (
        <section className="handoff-card" aria-labelledby="handoff-title">
          <div className="handoff-card__icon" aria-hidden="true">
            H
          </div>
          <div>
            <p className="section-kicker">Seguimiento operativo</p>
            <h2 id="handoff-title">Traspaso humano</h2>
            <p>{contact.handoff.reason ?? "Sin motivo registrado."}</p>
            <p className="supporting-text">
              Solicitado {formatContactDate(contact.handoff.requestedAt)}
            </p>
          </div>
        </section>
      ) : null}

      {contact.duplicates.length > 0 ? (
        <section className="duplicate-card" aria-labelledby="duplicate-title">
          <div>
            <p className="section-kicker">Revisión recomendada</p>
            <h2 id="duplicate-title">Posible duplicado</h2>
          </div>
          {contact.duplicates.map((duplicate) => (
            <div className="duplicate-card__match" key={duplicate.contactId}>
              <div>
                <p>{duplicate.reason}</p>
                <p className="supporting-text">
                  No se ha fusionado ningún dato.
                </p>
              </div>
              <Link href={`/contacts/${duplicate.contactId}`}>
                Ver {duplicate.displayName}
              </Link>
            </div>
          ))}
        </section>
      ) : null}

      <section className="before-call" aria-label="Resumen antes de llamar">
        <div className="before-call__heading">
          <div>
            <p className="section-kicker">Lectura en 10 segundos</p>
            <h2>Antes de llamar</h2>
          </div>
          <span className="operation-badge">
            {contact.beforeCall.operation}
          </span>
        </div>
        <div className="before-call__grid">
          <div>
            <h3>Necesidades clave</h3>
            {contact.beforeCall.keyNeeds.length > 0 ? (
              <dl className="compact-facts">
                {contact.beforeCall.keyNeeds.map((need) => (
                  <div key={need.label}>
                    <dt>{need.label}</dt>
                    <dd>{need.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>Necesidades todavía por confirmar.</p>
            )}
          </div>
          <div>
            <h3>Último contexto</h3>
            <p>{contact.beforeCall.latestInteraction}</p>
          </div>
          <div>
            <h3>Alertas</h3>
            {contact.beforeCall.blockers.length > 0 ? (
              <ul>
                {contact.beforeCall.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p>Sin bloqueos estructurados.</p>
            )}
          </div>
        </div>
      </section>

      <div className="detail-columns">
        <section
          className="content-section"
          aria-labelledby="qualification-title"
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">Contexto comercial</p>
              <h2 id="qualification-title">Cualificación</h2>
            </div>
            <span className="section-index">01</span>
          </div>
          {hasQualification ? (
            <div className="qualification-groups">
              <FactGroup title="Compra" facts={contact.qualification.sale} />
              <FactGroup
                title="Alquiler"
                facts={contact.qualification.rental}
              />
              <FactGroup title="Comunes" facts={contact.qualification.shared} />
            </div>
          ) : (
            <InlineEmpty
              title="Sin cualificación registrada"
              copy="La ficha está lista para completar en la próxima conversación."
            />
          )}
        </section>

        <section className="content-section" aria-labelledby="timeline-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Historial unificado</p>
              <h2 id="timeline-title">Interacciones</h2>
            </div>
            <span className="section-index">02</span>
          </div>
          {contact.timeline.length > 0 ? (
            <ol className="timeline" aria-label="Interacciones">
              {contact.timeline.map((item) => (
                <TimelineItem item={item} key={item.id} />
              ))}
            </ol>
          ) : (
            <InlineEmpty
              title="Todavía no hay interacciones"
              copy="Aquí aparecerán llamadas, mensajes, formularios y otros canales."
            />
          )}
        </section>
      </div>
    </article>
  );
}

function FactGroup({
  title,
  facts,
}: {
  title: string;
  facts: QualificationFactDto[];
}) {
  if (facts.length === 0) return null;

  return (
    <section className="fact-group" aria-labelledby={`group-${title}`}>
      <h3 id={`group-${title}`}>{title}</h3>
      <dl className="fact-list">
        {facts.map((fact) => (
          <div className="fact-row" key={fact.key}>
            <dt>{factLabels[fact.key] ?? humanizeKey(fact.key)}</dt>
            <dd>
              <strong>{formatValue(fact.value)}</strong>
              <span className="fact-provenance">
                {factSourceLabels[fact.source]} ·{" "}
                {formatContactDate(fact.occurredAt)}
              </span>
              {fact.evidence.length > 1 ? (
                <details className="evidence-disclosure">
                  <summary>Ver historial del dato</summary>
                  <ul>
                    {fact.evidence.map((evidence, index) => (
                      <li key={`${fact.key}-${index}`}>
                        <span>
                          {evidence.isCurrent
                            ? "Valor vigente"
                            : "Evidencia anterior"}{" "}
                          · {factSourceLabels[evidence.source]} ·{" "}
                          {formatContactDate(evidence.occurredAt)}
                        </span>
                        <strong>{formatValue(evidence.value)}</strong>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TimelineItem({ item }: { item: TimelineItemDto }) {
  return (
    <li className="timeline-item">
      <span
        className={`timeline-item__marker channel--${item.channel}`}
        aria-hidden="true"
      />
      <div className="timeline-item__body">
        <div className="timeline-item__meta">
          <strong>{channelLabels[item.channel]}</strong>
          <span>{formatContactDateTime(item.occurredAt)}</span>
          {item.durationSeconds !== null ? (
            <span>{formatDuration(item.durationSeconds)}</span>
          ) : null}
        </div>
        <p>{item.summary ?? item.content ?? "Interacción sin contenido."}</p>
        {item.transcript ? (
          <details className="transcript-disclosure">
            <summary>Ver transcripción</summary>
            <p>{item.transcript}</p>
          </details>
        ) : null}
      </div>
    </li>
  );
}

function InlineEmpty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="inline-empty" role="status">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function formatValue(value: QualificationFactDto["value"]): string {
  if (value === null) return "Sin dato";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, child]) => `${humanizeKey(key)}: ${formatValue(child)}`)
      .join(" · ");
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function humanizeKey(key: string): string {
  const text = key.replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Dato";
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0 s";

  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
}
