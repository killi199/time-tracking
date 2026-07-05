export const DEFAULT_DAILY_TARGET_MINUTES = 480

export interface WorkHoursEntry {
    effectiveDate: string // 'YYYY-MM-DD'
    dailyMinutes: number
}

/**
 * Resolves the daily work-hours target for a given date from an
 * effective-dated history.
 *
 * @param history - Entries sorted ascending by effectiveDate ('YYYY-MM-DD' compares lexicographically).
 * @param date - Date string in YYYY-MM-DD format.
 * @returns The target minutes of the latest entry with effectiveDate <= date,
 *          or DEFAULT_DAILY_TARGET_MINUTES if there is none.
 */
export const resolveDailyTarget = (
    history: WorkHoursEntry[],
    date: string,
): number => {
    let target = DEFAULT_DAILY_TARGET_MINUTES
    for (const entry of history) {
        if (entry.effectiveDate <= date) {
            target = entry.dailyMinutes
        } else {
            break
        }
    }
    return target
}

/**
 * Sums the daily work-hours targets for the given dates.
 *
 * @param history - Entries sorted ascending by effectiveDate.
 * @param dates - Date strings in YYYY-MM-DD format.
 * @returns The total expected minutes across all given dates.
 */
export const sumDailyTargets = (
    history: WorkHoursEntry[],
    dates: Iterable<string>,
): number => {
    let total = 0
    for (const date of dates) {
        total += resolveDailyTarget(history, date)
    }
    return total
}
