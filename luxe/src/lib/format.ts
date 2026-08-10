import { formatInTimeZone } from "date-fns-tz";
import { Timestamp } from "firebase/firestore";

/**
 * Formats an integer amount in cents into a standard currency string.
 * Example: 15000 -> "$150.00"
 */
export function formatMoney(cents: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  return formatter.format(cents / 100);
}

/**
 * Formats a Date or Firestore Timestamp into a readable string in the given timezone.
 * Example: formatDateTime(date, "America/New_York") -> "Oct 14, 2:00 PM EDT"
 */
export function formatDateTime(date: Date | string | number | Timestamp, timezone: string): string {
  if (!date) return "";
  
  let dateObj: Date;
  if (date instanceof Timestamp) {
    dateObj = date.toDate();
  } else {
    dateObj = new Date(date as any);
  }

  try {
    return formatInTimeZone(dateObj, timezone, "MMM d, h:mm a zzz");
  } catch (err) {
    // Fallback if timezone is invalid
    return formatInTimeZone(dateObj, "UTC", "MMM d, h:mm a 'UTC'");
  }
}
