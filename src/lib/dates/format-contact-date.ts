const CONTACT_TIME_ZONE = "Europe/Madrid";

const contactDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: CONTACT_TIME_ZONE,
});

const contactDateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CONTACT_TIME_ZONE,
});

const contactListDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  timeZone: CONTACT_TIME_ZONE,
});

export function formatContactDate(value: string | null): string {
  return formatContactTemporal(value, contactDateFormatter, "fecha pendiente");
}

export function formatContactDateTime(value: string | null): string {
  return formatContactTemporal(
    value,
    contactDateTimeFormatter,
    "Fecha pendiente",
  );
}

export function formatContactListDate(value: string | null): string {
  return formatContactTemporal(
    value,
    contactListDateFormatter,
    "Fecha pendiente",
  );
}

function formatContactTemporal(
  value: string | null,
  formatter: Intl.DateTimeFormat,
  pendingLabel: string,
): string {
  if (!value) return pendingLabel;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? pendingLabel : formatter.format(date);
}
