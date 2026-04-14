/**
 * Generates 2-character initials from a name.
 * Handles "Surname, Firstname Middle" format:
 *   → surname initial + first given name initial (e.g. "Masanga, Danielle Ann M." → "MD")
 * Falls back to first two word initials for plain "Firstname Lastname" format.
 */
export function getInitials(name: string): string {
  if (!name) return "?";
  if (name.includes(",")) {
    const [surname, rest] = name.split(",").map((s) => s.trim());
    const surnameInitial = surname[0] ?? "";
    const firstNameInitial = rest?.trim().split(" ")[0]?.[0] ?? "";
    return (surnameInitial + firstNameInitial).toUpperCase();
  }
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
