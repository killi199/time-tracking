import { useSyncExternalStore } from 'react'
import {
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    getDate,
    setDate,
    startOfMonth,
    startOfWeek,
    subDays,
} from 'date-fns'
import {
    addMonths as addMonthsJalali,
    endOfMonth as endOfMonthJalali,
    format as formatJalali,
    getDate as getDateJalali,
    setDate as setDateJalali,
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
 * Returns the configured first day of the month (1-28) from database settings.
 * Defaults to 1.
 */
export function getSavedMonthStartDay(): number {
    const saved = getSetting('month_start_day')
    if (!saved || !/^\d+$/.test(saved)) {
        return 1
    }
    const parsed = Number.parseInt(saved, 10)
    if (parsed >= 1 && parsed <= 28) {
        return parsed
    }
    return 1
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
 * React hook that subscribes to the saved first day of the month (1-28).
 * Re-renders reactively when month-start-day settings change in SQLite.
 */
export function useSavedMonthStartDay(): number {
    return useSyncExternalStore(subscribeSettings, getSavedMonthStartDay)
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

function normalizeMonthStartDay(monthStartDay: number): number {
    if (
        Number.isInteger(monthStartDay) &&
        monthStartDay >= 1 &&
        monthStartDay <= 28
    ) {
        return monthStartDay
    }
    return 1
}

function parseDateStr(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
}

/**
 * Returns the Gregorian start and end dates (YYYY-MM-DD) for the month containing dateStr.
 * When monthStartDay > 1, computes the custom billing/work month starting on that day.
 */
export function getMonthRange(
    dateStr: string,
    calendar: CalendarSystem = 'gregorian',
    monthStartDay: number = 1,
): {
    start: string
    end: string
    monthIdentifier: string
} {
    const curr = parseDateStr(dateStr)
    const effectiveStartDay = normalizeMonthStartDay(monthStartDay)

    const isJalali = calendar === 'jalali'
    const getMonthStart = isJalali ? startOfMonthJalali : startOfMonth
    const getMonthEnd = isJalali ? endOfMonthJalali : endOfMonth
    const addMonth = isJalali ? addMonthsJalali : addMonths
    const getDayNum = isJalali ? getDateJalali : getDate
    const setDayNum = isJalali ? setDateJalali : setDate

    if (effectiveStartDay === 1) {
        const start = getMonthStart(curr)
        const end = getMonthEnd(curr)
        return {
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd'),
            monthIdentifier: isJalali
                ? formatJalali(curr, 'yyyy-MM')
                : format(curr, 'yyyy-MM'),
        }
    }

    const dayOfMonth = getDayNum(curr)
    const anchor = dayOfMonth >= effectiveStartDay ? curr : addMonth(curr, -1)
    const start = setDayNum(getMonthStart(anchor), effectiveStartDay)
    const nextPeriodStart = setDayNum(
        getMonthStart(addMonth(start, 1)),
        effectiveStartDay,
    )
    const end = subDays(nextPeriodStart, 1)
    const startStr = format(start, 'yyyy-MM-dd')

    return {
        start: startStr,
        end: format(end, 'yyyy-MM-dd'),
        monthIdentifier: startStr,
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
    monthStartDay: number = 1,
): string {
    const effectiveStartDay = normalizeMonthStartDay(monthStartDay)
    const isJalali = calendar === 'jalali'
    const getMonthStart = isJalali ? startOfMonthJalali : startOfMonth
    const addMonth = isJalali ? addMonthsJalali : addMonths
    const setDayNum = isJalali ? setDateJalali : setDate

    if (effectiveStartDay === 1) {
        const curr = parseDateStr(referenceDateStr)
        const nextMonthDate = getMonthStart(addMonth(curr, step))
        return format(nextMonthDate, 'yyyy-MM-dd')
    }

    const { start } = getMonthRange(
        referenceDateStr,
        calendar,
        effectiveStartDay,
    )
    const startDate = parseDateStr(start)
    const nextMonthDate = setDayNum(
        getMonthStart(addMonth(startDate, step)),
        effectiveStartDay,
    )
    return format(nextMonthDate, 'yyyy-MM-dd')
}

function formatDateRangeHeader(
    startDate: Date,
    endDate: Date,
    calendar: CalendarSystem,
    locale: string,
): string {
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
    monthStartDay: number = 1,
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
        const { startDate, endDate } = getWeekRange(
            dateStr,
            firstDayOfWeek,
            calendar,
        )
        return formatDateRangeHeader(startDate, endDate, calendar, locale)
    }

    // viewMode === 'month'
    const effectiveStartDay = normalizeMonthStartDay(monthStartDay)
    if (effectiveStartDay > 1) {
        const { start, end } = getMonthRange(
            dateStr,
            calendar,
            effectiveStartDay,
        )
        return formatDateRangeHeader(
            parseDateStr(start),
            parseDateStr(end),
            calendar,
            locale,
        )
    }

    if (calendar === 'jalali') {
        return formatJalali(date, 'MMMM yyyy', { locale: enUS })
    }

    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
    })
}
