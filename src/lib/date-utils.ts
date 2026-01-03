/**
 * Parse date string safely - handles both with and without timezone suffix.
 * Database returns timestamps like "2026-01-01T12:00:00+00:00"
 * In-memory returns timestamps like "2026-01-01T12:00:00.000000"
 */
export function parseApiDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  // If it already has timezone info (Z or +/-), parse directly
  if (dateStr.includes('Z') || dateStr.includes('+') || /\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  // Otherwise append Z for UTC
  return new Date(dateStr + 'Z');
}
