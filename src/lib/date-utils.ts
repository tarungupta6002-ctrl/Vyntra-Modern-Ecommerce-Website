/**
 * Vyntra Marketplace - Indian Standard Time (IST) Calendar Arithmetic
 * 
 * Guarantees server-timezone-independent calendar date boundary calculations
 * adhering strictly to the Asia/Kolkata timezone (UTC+05:30).
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Computes an exact calendar deadline in IST expiring at 23:59:59.999 IST.
 * 
 * Mathematical Invariants:
 * 1. Event Day D is determined in Asia/Kolkata.
 * 2. Window spans exactly `daysAllowed` subsequent calendar days.
 * 3. Expires at 23:59:59.999 IST on Day (D + daysAllowed).
 * 4. Month boundaries, year transitions, and leap years (e.g. Feb 28/29 -> Mar 1)
 *    are computed via UTC date math on decomposed calendar components.
 */
export function computeIstCalendarDeadline(baseDate: Date | string, daysAllowed: number): Date {
  const dateObj = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
  if (isNaN(dateObj.getTime())) {
    throw new Error('INVALID_DATE: Provided base date is invalid');
  }

  // 1. Extract calendar year, month, day in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const istDateString = formatter.format(dateObj); // 'YYYY-MM-DD'
  const [year, month, day] = istDateString.split('-').map(Number);

  // 2. Add calendar days using UTC constructor (preserves leap year & month boundaries)
  const targetDate = new Date(Date.UTC(year, month - 1, day + daysAllowed));

  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const targetDay = String(targetDate.getUTCDate()).padStart(2, '0');

  // 3. Construct 23:59:59.999 IST (+05:30) ISO representation
  const istDeadlineIso = `${targetYear}-${targetMonth}-${targetDay}T23:59:59.999+05:30`;
  return new Date(istDeadlineIso);
}

/**
 * 7-calendar-day return window from verified delivery date.
 * Expires at 23:59:59.999 IST on Day 7.
 */
export function computeIstReturnDeadline(deliveredAt: Date | string, daysAllowed = 7): Date {
  return computeIstCalendarDeadline(deliveredAt, daysAllowed);
}

/**
 * 5-calendar-day dispute window from QC failure or rejection notification date.
 * Expires at 23:59:59.999 IST on Day 5.
 */
export function computeIstDisputeDeadline(eventDate: Date | string, daysAllowed = 5): Date {
  return computeIstCalendarDeadline(eventDate, daysAllowed);
}

/**
 * Verifies if current time is strictly before or equal to deadline.
 */
export function isWithinDeadline(now: Date, deadline: Date): boolean {
  return now.getTime() <= deadline.getTime();
}

/**
 * Formats a Date into user-friendly IST string: '15 Nov 2026, 11:59 PM IST'.
 */
export function formatIstDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d) + ' IST';
}

/**
 * Formats date into 'DD MMM YYYY' in IST.
 */
export function formatIstDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
