import type { Contact } from "../domain/contact";

export type ContactPolicyStatus = "available" | "blocked" | "unknown";

export interface ContactActionPolicy {
  status: ContactPolicyStatus;
  available: boolean;
  reason: string;
}

export interface ContactPolicy {
  status: "restricted" | "unknown";
  actions: {
    call: ContactActionPolicy;
    email: ContactActionPolicy;
    whatsapp: ContactActionPolicy;
  };
}

const UNKNOWN_EVIDENCE: ContactActionPolicy = {
  status: "unknown",
  available: false,
  reason:
    "No hay una señal estructurada suficiente; no se infiere permiso desde texto libre.",
};

export function evaluateContactPolicy(contact: Contact): ContactPolicy {
  const tags = new Set(contact.tags.map((tag) => tag.trim().toLowerCase()));
  const noCall = tags.has("no-llamar");

  return {
    status: noCall ? "restricted" : "unknown",
    actions: {
      call: noCall
        ? {
            status: "blocked",
            available: false,
            reason: "El tag estructurado no-llamar bloquea las llamadas.",
          }
        : { ...UNKNOWN_EVIDENCE },
      email: emailPolicy(contact),
      whatsapp: { ...UNKNOWN_EVIDENCE },
    },
  };
}

function emailPolicy(contact: Contact): ContactActionPolicy {
  if (contact.identity.email?.actionable !== true) {
    return {
      status: "unknown",
      available: false,
      reason: "No hay un email válido disponible; no se evalúa consentimiento.",
    };
  }

  return {
    status: "available",
    available: true,
    reason:
      "Hay un email técnicamente válido; su disponibilidad no acredita consentimiento.",
  };
}
