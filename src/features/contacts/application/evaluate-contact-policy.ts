import type { Contact } from "../domain/contact";

export type ContactPolicyStatus = "allowed" | "blocked" | "unknown";

export interface ContactActionPolicy {
  status: ContactPolicyStatus;
  allowed: boolean;
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
  allowed: false,
  reason: "No hay evidencia suficiente para permitir esta acción.",
};

export function evaluateContactPolicy(contact: Contact): ContactPolicy {
  const tags = new Set(contact.tags.map((tag) => tag.trim().toLowerCase()));
  const noCall = tags.has("no-llamar");
  const emailOnly = contact.notes
    ? /(?:solo|únicamente)\s+por\s+email/i.test(contact.notes)
    : false;

  if (!noCall && !emailOnly) {
    return {
      status: "unknown",
      actions: {
        call: { ...UNKNOWN_EVIDENCE },
        email: { ...UNKNOWN_EVIDENCE },
        whatsapp: { ...UNKNOWN_EVIDENCE },
      },
    };
  }

  return {
    status: "restricted",
    actions: {
      call: {
        status: "blocked",
        allowed: false,
        reason: noCall
          ? "El contacto ha pedido no recibir llamadas."
          : "El contacto ha indicado que solo desea contacto por email.",
      },
      email: emailPolicy(contact, emailOnly),
      whatsapp: {
        status: "blocked",
        allowed: false,
        reason: emailOnly
          ? "El contacto ha indicado que solo desea contacto por email."
          : "No hay evidencia suficiente para permitir WhatsApp.",
      },
    },
  };
}

function emailPolicy(
  contact: Contact,
  emailOnly: boolean,
): ContactActionPolicy {
  if (contact.identity.email?.actionable !== true) {
    return {
      status: "blocked",
      allowed: false,
      reason: "El email disponible no es válido para iniciar una acción.",
    };
  }

  if (!emailOnly) return { ...UNKNOWN_EVIDENCE };

  return {
    status: "allowed",
    allowed: true,
    reason: "El contacto ha indicado que desea contacto únicamente por email.",
  };
}
