// Only allow redirects to paths on this site. "//evil.com" and "/\evil.com"
// are treated by browsers as other origins, so they are rejected too.
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
