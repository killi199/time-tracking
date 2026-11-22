import { useSyncExternalStore } from 'react'
import {
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    startOfMonth,
    startOfWeek,
} from 'date-fns'
import {
    addMonths as addMonthsJalali,
    endOfMonth as endOfMonthJalali,
    format as formatJalali,
    startOfMonth as startOfMonthJalali,
} from 'date-fns-jalali'
import { enUS } from 'date-fns-jalali/locale'
import * as Localization from 'expo-localization'
import { getSetting, subscribeSettings } from '../db/database'

export type CalendarSystem = 'gregorian' | 'jalali'
export type CalendarPreference = 'auto' | 'gregorian' | 'jalali'
export type FirstDayOfWeek = 'auto' | 'saturday' | 'sunday' | 'monday'

/**
 * Resolves the effective calendar system from a setting preference.
 * If 'auto' or unset, checks the system calendar and device locale.
 */
export function resolveCalendarSystem(
    preference?: string | null,
): CalendarSystem {
    if (preference === 'jalali') return 'jalali'
    if (preference === 'gregorian') return 'gregorian'

    try {
        const calendars = Localization.getCalendars()
        const primaryCalendar = (
            calendars[0] as Localization.Calendar | undefined
        )?.calendar?.toLowerCase()
        if (primaryCalendar === 'persian' || primaryCalendar === 'jalali') {
            return 'jalali'
        }

        const locales = Localization.getLocales()
        const primaryLocale = locales[0] as Localization.Locale | undefined
        if (
            primaryLocale?.languageCode === 'fa' ||
            primaryLocale?.regionCode === 'IR'
        ) {
            return 'jalali'
        }
    } catch {
        // Fallback to gregorian if localization check fails
    }

    return 'gregorian'
}

/**
 * Returns the currently active calendar system from database settings.
 * Defaults to 'auto', which resolves based on system settings.
 */
export function getActiveCalendarSystem(): CalendarSystem {
    const saved = getSetting('calendar_system')
    return resolveCalendarSystem(saved)
}

/**
 * Returns the configured calendar preference from database settings.
 * Defaults to 'auto'.
 */
export function getSavedCalendarSystem(): CalendarPreference {
    const saved = getSetting('calendar_system')
    if (saved === 'jalali' || saved === 'gregorian' || saved === 'auto') {
        return saved
    }
    return 'auto'
}

/**
 * Returns the configured first day of the week from database settings.
 * Defaults to 'auto'.
 */
export function getSavedFirstDayOfWeek(): FirstDayOfWeek {
    const saved = getSetting('first_day_of_week')
    if (
        saved === 'saturday' ||
        saved === 'sunday' ||
        saved === 'monday' ||
        saved === 'auto'
    ) {
        return saved
    }
    return 'auto'
}

/**
 * React hook that subscribes to the active calendar system ('gregorian' | 'jalali').
 * Re-renders reactively when calendar settings change in SQLite.
 */
export function useActiveCalendarSystem(): CalendarSystem {
    return useSyncExternalStore(subscribeSettings, getActiveCalendarSystem)
}

/**
 * React hook that subscribes to the saved calendar preference ('auto' | 'gregorian' | 'jalali').
 * Re-renders reactively when calendar settings change in SQLite.
 */
export function useSavedCalendarSystem(): CalendarPreference {
    return useSyncExternalStore(subscribeSettings, getSavedCalendarSystem)
}

/**
 * React hook that subscribes to the saved first day of the week ('auto' | 'saturday' | 'sunday' | 'monday').
 * Re-renders reactively when first-day-of-week settings change in SQLite.
 */
export function useSavedFirstDayOfWeek(): FirstDayOfWeek {
    return useSyncExternalStore(subscribeSettings, getSavedFirstDayOfWeek)
}

/**
 * Resolves the effective day of the week (0 = Sunday, 1 = Monday, 6 = Saturday).
 */
export function resolveFirstDayOfWeek(
    firstDay: FirstDayOfWeek,
    calendar: CalendarSystem,
): 0 | 1 | 6 {
    if (firstDay === 'saturday') return 6
    if (firstDay === 'sunday') return 0
    if (firstDay === 'monday') return 1

    // 'auto': Saturday for Jalali, Monday for Gregorian
    return calendar === 'jalali' ? 6 : 1
}

/**
 * Calculates the start and end dates (YYYY-MM-DD) of the week containing dateStr.
 *
 * @param dateStr - Gregorian date in YYYY-MM-DD format.
 * @param firstDayOfWeek - Configured first day of the week.
 * @param calendar - Calendar system used for 'auto' day resolution.
 */
export function getWeekRange(
    dateStr: string,
    firstDayOfWeek: FirstDayOfWeek = 'auto',
    calendar: CalendarSystem = 'gregorian',
): {
    start: string
    end: string
    startDate: Date
    endDate: Date
} {
    const [y, m, d] = dateStr.split('-').map(Number)
    const curr = new Date(y, m - 1, d)
    const targetStartDay = resolveFirstDayOfWeek(firstDayOfWeek, calendar)

    const startDate = startOfWeek(curr, { weekStartsOn: targetStartDay })
    const endDate = endOfWeek(curr, { weekStartsOn: targetStartDay })

    return {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        startDate,
        endDate,
    }
}

/**
 * Returns the Gregorian start and end dates (YYYY-MM-DD) for the month containing dateStr.
 */
export function getMonthRange(
    dateStr: string,
    calendar: CalendarSystem = 'gregorian',
): {
    start: string
    end: string
    monthIdentifier: string
} {
    const [y, m, d] = dateStr.split('-').map(Number)
    const curr = new Date(y, m - 1, d)

    if (calendar === 'jalali') {
        const start = startOfMonthJalali(curr)
        const end = endOfMonthJalali(curr)
        return {
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd'),
            monthIdentifier: formatJalali(curr, 'yyyy-MM'),
        }
    }

    const start = startOfMonth(curr)
    const end = endOfMonth(curr)
    return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
        monthIdentifier: format(curr, 'yyyy-MM'),
    }
}

/**
 * Steps one month forward or backward relative to referenceDateStr.
 * Returns a new Gregorian date (YYYY-MM-DD) representing the first day of that month.
 */
export function stepMonth(
    referenceDateStr: string,
    step: number,
    calendar: CalendarSystem = 'gregorian',
): string {
    const [y, m, d] = referenceDateStr.split('-').map(Number)
    const curr = new Date(y, m - 1, d)

    if (calendar === 'jalali') {
        const nextMonthDate = startOfMonthJalali(addMonthsJalali(curr, step))
        return format(nextMonthDate, 'yyyy-MM-dd')
    }

    const nextMonthDate = startOfMonth(addMonths(curr, step))
    return format(nextMonthDate, 'yyyy-MM-dd')
}

function formatWeekHeader(
    dateStr: string,
    calendar: CalendarSystem,
    locale: string,
    firstDayOfWeek: FirstDayOfWeek,
): string {
    const { startDate, endDate } = getWeekRange(
        dateStr,
        firstDayOfWeek,
        calendar,
    )

    if (calendar === 'jalali') {
        const sMonth = formatJalali(startDate, 'MMMM', { locale: enUS })
        const eMonth = formatJalali(endDate, 'MMMM', { locale: enUS })
        const sDay = formatJalali(startDate, 'd', { locale: enUS })
        const eDay = formatJalali(endDate, 'd', { locale: enUS })
        const year = formatJalali(endDate, 'yyyy', { locale: enUS })

        if (sMonth === eMonth) {
            return `${sDay} - ${eDay} ${sMonth} ${year}`
        }
        return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${year}`
    }

    const startStr = startDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    })
    const endStr = endDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    })
    return `${startStr} - ${endStr}`
}

/**
 * Formats a date or date range for screen headers and subheaders.
 */
export function formatHeaderDate(
    dateStr: string,
    viewMode: 'day' | 'week' | 'month',
    calendar: CalendarSystem,
    locale: string,
    firstDayOfWeek: FirstDayOfWeek = 'auto',
): string {
    if (!dateStr) return ''

    const parts = dateStr.split('-').map(Number)
    const y = parts[0]
    const m = parts[1]
    const d = parts[2] ?? 1
    const date = new Date(y, m - 1, d)

    if (viewMode === 'day') {
        if (calendar === 'jalali') {
            const weekday = date.toLocaleDateString(locale, {
                weekday: 'short',
            })
            const jalaliDate = formatJalali(date, 'd MMMM yyyy', {
                locale: enUS,
            })
            return `${weekday} ${jalaliDate}`
        }
        return date.toLocaleDateString(locale, {
            weekday: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        })
    }

    if (viewMode === 'week') {
        return formatWeekHeader(dateStr, calendar, locale, firstDayOfWeek)
    }

    // viewMode === 'month'
    if (calendar === 'jalali') {
        return formatJalali(date, 'MMMM yyyy', { locale: enUS })
    }

    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
    })
}
