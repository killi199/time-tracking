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
