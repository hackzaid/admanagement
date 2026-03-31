const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isIsoLike(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value);
}

export function formatDisplayDateTime(value?: string | null, fallback = "No data") {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  if (!isIsoLike(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (!match) {
    return trimmed;
  }

  const [, year, month, day, hour, minute] = match;
  const monthIndex = Number.parseInt(month, 10) - 1;
  const monthName = MONTHS[monthIndex] ?? month;
  const datePart = `${day} ${monthName} ${year}`;

  if (hour && minute) {
    return `${datePart}, ${hour}:${minute}`;
  }

  return datePart;
}
