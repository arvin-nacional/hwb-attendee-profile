/**
 * Returns the absolute base URL of the deployment, with no trailing slash.
 * Reads from the BASE_URL env var (set in production to e.g.
 * "https://hwb-attendee-profile.vercel.app"). Falls back to localhost.
 */
export function getBaseUrl(): string {
  const raw = process.env.BASE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
