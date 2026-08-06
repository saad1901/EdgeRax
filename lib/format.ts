export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function totalLessons(chapters: { lessons: unknown[] }[]) {
  return chapters.reduce((sum, c) => sum + c.lessons.length, 0)
}

/**
 * Compute the expiry ISO date string from a purchase date + validity days.
 * Returns null if validityDays is null/undefined (lifetime access).
 */
export function computeExpiresAt(purchasedAt: string, validityDays: number | null | undefined): string | null {
  if (!validityDays) return null
  const d = new Date(purchasedAt)
  d.setDate(d.getDate() + validityDays)
  return d.toISOString()
}

/**
 * Returns days remaining until expiry (negative if expired), or null for lifetime.
 */
export function daysRemaining(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Human-readable validity label for display before purchase.
 */
export function formatValidity(validityDays: number | null | undefined): string {
  if (!validityDays) return "Lifetime access"
  if (validityDays % 365 === 0) {
    const yrs = validityDays / 365
    return `${yrs} year${yrs > 1 ? "s" : ""} access`
  }
  if (validityDays % 30 === 0) {
    const months = validityDays / 30
    return `${months} month${months > 1 ? "s" : ""} access`
  }
  return `${validityDays} day${validityDays > 1 ? "s" : ""} access`
}
