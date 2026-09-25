/**
 * OLD WIP reports store duration as `"H hours M minutes"` strings.
 * Total Billed Hours is client-computed: total − unbilled (with minute borrow).
 */

/** Parse `"12 hours 30 minutes"` → { hours, minutes }. Invalid → zeros. */
export function parseHoursMinutesString(value: unknown): { hours: number; minutes: number } {
  if (value == null) return { hours: 0, minutes: 0 }
  if (typeof value === "number" && Number.isFinite(value)) {
    const hours = Math.floor(value)
    const minutes = Math.round((value - hours) * 60)
    return { hours, minutes }
  }
  const parts = String(value).trim().split(/\s+/)
  const hours = parseInt(parts[0] ?? "0", 10)
  const minutes = parseInt(parts[2] ?? "0", 10)
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  }
}

export function formatHoursMinutes(hours: number, minutes: number): string {
  return `${hours} hours ${minutes} minutes`
}

/** Match OLD flatRowCreator: billed = total − unbilled. */
export function computeWipBilledHours(
  totalHours: unknown,
  totalUnbilledHours: unknown,
): string {
  const total = parseHoursMinutesString(totalHours)
  const unbilled = parseHoursMinutesString(totalUnbilledHours)
  let billedHours = total.hours - unbilled.hours
  let billedMinutes = total.minutes - unbilled.minutes
  if (billedMinutes < 0) {
    billedHours -= 1
    billedMinutes += 60
  }
  return formatHoursMinutes(billedHours, billedMinutes)
}
