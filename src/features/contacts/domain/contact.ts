export type CanonicalSource =
  "voice" | "whatsapp" | "web" | "meta" | "crm" | "manual" | "unknown";

export type CanonicalChannel =
  "voice" | "whatsapp" | "web-form" | "email" | "unknown";

export type FactSource = "manual" | "customer" | "ai" | "unknown";

export type RenderableValue =
  | string
  | number
  | boolean
  | null
  | RenderableValue[]
  | { [key: string]: RenderableValue };

export interface FactEvidence {
  value: RenderableValue;
  source: FactSource;
  occurredAt: Date | null;
  confidence?: string;
  sourceRef?: string;
}

export interface QualificationFact extends FactEvidence {
  key: string;
  evidence: FactEvidence[];
}

export interface QualificationGroups {
  sale: QualificationFact[];
  rental: QualificationFact[];
  shared: QualificationFact[];
}

export interface ContactTimelineItem {
  id: string;
  channel: CanonicalChannel;
  direction: "inbound" | "outbound" | "unknown";
  occurredAt: Date | null;
  content: string | null;
  summary: string | null;
  transcript: string | null;
  durationSeconds: number | null;
}

export interface ContactIdentity {
  displayName: string;
  fullName: string | null;
  initials: string;
  phone: {
    raw: string;
    display: string;
    comparable: string;
  } | null;
  email: {
    value: string;
    actionable: boolean;
  } | null;
}

export interface ContactHandoff {
  status: "requested" | "not-requested";
  reason: string | null;
  requestedAt: Date | null;
}

export interface Contact {
  id: string;
  organizationId: string;
  identity: ContactIdentity;
  source: CanonicalSource;
  createdAt: Date | null;
  tags: string[];
  notes: string | null;
  qualification: QualificationGroups;
  timeline: ContactTimelineItem[];
  handoff: ContactHandoff;
}
