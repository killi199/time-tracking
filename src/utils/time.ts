/**
 * Formats a duration in minutes into a string format (HH:MM).
 *
 * @param totalMinutes - The total number of minutes to format. Can be negative.
 * @param showSign - Whether to explicitly show a '+' or '-' sign. Defaults to false.
 * @returns A string representing the formatted time (e.g., "01:30", "-01:30", "+01:30").
 */
export const formatTime = (totalMinutes: number, showSign = false) => {
    const isNegative = totalMinutes < 0
    const absMinutes = Math.abs(totalMinutes)
    const hours = Math.floor(absMinutes / 60)
    const minutes = Math.floor(absMinutes % 60)
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

    if (showSign) {
        return isNegative ? `-${timeString}` : `+${timeString}`
    }
    return timeString
}

/**
 * Formats a Date object into a 24-hour time string (HH:MM).
 *
 * @param date - The date to format.
 * @returns A string representing the time in HH:MM format.
 */
export const getFormattedTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}

/**
 * Formats a Date object into a date string (YYYY-MM-DD).
 *
 * @param date - The date to format.
 * @returns A string representing the date in YYYY-MM-DD format.
 */
export const getFormattedDate = (date: Date): string => {
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Formats a Date object into a month string (YYYY-MM).
 *
 * @param date - The date to format.
 * @returns A string representing the month in YYYY-MM format.
 */
export const getFormattedMonth = (date: Date): string => {
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${year}-${month}`
}

/**
 * Formats a date string (YYYY-MM-DD) into a locale-aware date string.
 *
 * @param dateStr - The date string to format (YYYY-MM-DD).
 * @param locale - The locale to use for formatting (e.g., 'en-US', 'de-DE').
 * @returns A formatted date string.
 */
export const getLocaleDateString = (
    dateStr: string,
    locale: string,
): string => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-').map(Number)
    // Create date in local time to avoid timezone shifts
    const date = new Date(year, month - 1, day)

    return date.toLocaleDateString(locale, {
        weekday: 'short',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    })
}

/**
 * Parses a date string (YYYY-MM-DD) into a Date object in the device's local timezone.
 * Avoids any UTC/local timezone shifts that happen with default string parsing.
 */
export const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
}

/**
 * Parses date (YYYY-MM-DD) and time (HH:MM) strings into a single Date object in local time.
 */
export const parseLocalTime = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)
    return new Date(year, month - 1, day, hours, minutes)
}

/**
 * Formats an event's timezone-aware timestamp into local date and time strings.
 * Falls back to legacy date and time strings if timestamp is not present.
 */
export const getEventTimeAndDate = (
    timestamp: string | undefined | null,
    fallbackDate: string,
    fallbackTime: string,
): { date: string; time: string } => {
    if (timestamp) {
        const dateObj = new Date(timestamp)
        if (!isNaN(dateObj.getTime())) {
            return {
                date: getFormattedDate(dateObj),
                time: getFormattedTime(dateObj),
            }
        }
    }
    return { date: fallbackDate, time: fallbackTime }
}

