export function formatPrincipalDisplay(value?: string | null): string {
  const text = (value ?? "").trim();
  if (!text) {
    return "-";
  }

  if (text.includes("\\")) {
    return text.split("\\").pop() || text;
  }

  if (/^[^@\s]+@[^@\s]+$/.test(text)) {
    return text.split("@")[0] || text;
  }

  return text;
}
