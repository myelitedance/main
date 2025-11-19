/**
 * Format the class time for consistent display.
 * Input: "6:00pm  -  7:00pm"
 * Output: "6:00pm – 7:00pm"
 */
export function formatTimeRange(time: string): string {
  if (!time) return "";
  return time.replace(/-/, "–").replace(/\s+/g, " ").trim();
}

/**
 * Construct the appointment title for GHL.
 * Example:
 * "Elite Dance Trial: Ava – Ballet I (Tue 4:00pm)"
 */
export function buildAppointmentTitle(
  dancerFirstName: string,
  className: string,
  day: string,
  time: string
): string {
  return `Elite Dance Trial: ${dancerFirstName} – ${className} (${day} ${time})`;
}

/**
 * Utility to collapse the class name if needed.
 * Good for formatting "TECH/LEAPS/TURNS LEVEL 2"
 * into "TECH/LEAPS/TURNS L2"
 */
export function simplifyClassName(name: string): string {
  if (!name) return "";
  return name.replace(/LEVEL\s*(\d+)/i, "L$1").trim();
}
