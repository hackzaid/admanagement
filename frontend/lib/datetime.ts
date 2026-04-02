function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getBrowserTimeZone() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatDisplayDateTime(value?: string | null, fallback = "No data") {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = parseDate(value.trim());
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: getBrowserTimeZone(),
  }).format(parsed);
}

export function formatDisplayDate(value?: string | null, fallback = "No data") {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = parseDate(value.trim());
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: getBrowserTimeZone(),
  }).format(parsed);
}
