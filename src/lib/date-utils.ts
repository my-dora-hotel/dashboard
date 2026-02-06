import { differenceInMinutes } from "date-fns"

/**
 * Formats relative time in a short, readable format.
 * Examples:
 * - Less than 1 minute: "Az önce"
 * - 1-59 minutes: "5 dk önce"
 * - 1-23 hours: "2 sa önce"
 * - 1+ days: "3 gün önce"
 */
export function formatShortRelativeTime(date: Date): string {
  const minutesAgo = differenceInMinutes(new Date(), date)

  if (minutesAgo < 1) {
    return "Az önce"
  } else if (minutesAgo < 60) {
    return `${minutesAgo} dk önce`
  } else if (minutesAgo < 1440) {
    const hoursAgo = Math.floor(minutesAgo / 60)
    return `${hoursAgo} sa önce`
  } else {
    const daysAgo = Math.floor(minutesAgo / 1440)
    return `${daysAgo} gün önce`
  }
}
