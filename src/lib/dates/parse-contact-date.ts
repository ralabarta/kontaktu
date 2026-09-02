const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;
const LOCAL_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/;

export function parseContactDate(value: string | number): Date | null {
  if (typeof value === "number") {
    return dateOrNull(value * 1_000);
  }

  const normalizedValue = value.trim();

  const isoMatch = ISO_DATE_PATTERN.exec(normalizedValue);

  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const day = Number(dayText);
    const calendarDate = new Date(0);
    calendarDate.setUTCFullYear(year, monthIndex, day);

    const isExactIsoDate =
      calendarDate.getUTCFullYear() === year &&
      calendarDate.getUTCMonth() === monthIndex &&
      calendarDate.getUTCDate() === day;

    return isExactIsoDate ? dateOrNull(Date.parse(normalizedValue)) : null;
  }

  const localMatch = LOCAL_DATE_PATTERN.exec(normalizedValue);

  if (!localMatch) {
    return null;
  }

  const [, dayText, monthText, yearText, hourText = "0", minuteText = "0"] =
    localMatch;
  const day = Number(dayText);
  const monthIndex = Number(monthText) - 1;
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const parsed = new Date(year, monthIndex, day, hour, minute);

  const isExactLocalDate =
    parsed.getFullYear() === year &&
    parsed.getMonth() === monthIndex &&
    parsed.getDate() === day &&
    parsed.getHours() === hour &&
    parsed.getMinutes() === minute;

  return isExactLocalDate ? parsed : null;
}

function dateOrNull(timestamp: number): Date | null {
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
