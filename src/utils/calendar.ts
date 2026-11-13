import { getSetting } from '../db/database'
import {
    toJalaali,
    toGregorian,
    getJalaliMonthRange,
    formatJalaliDate,
    JALALI_MONTH_NAMES_FA,
    JALALI_MONTH_NAMES_EN,
} from './jalali'

export type CalendarSystem = 'gregorian' | 'jalali'
export type FirstDayOfWeek = 'auto' | 'saturday' | 'sunday' | 'monday'

/**
 * Returns the currently active calendar system from database settings.
 * Defaults to 'gregorian'.
 */
export function getActiveCalendarSystem(): CalendarSystem {
    const saved = getSetting('calendar_system')
    if (saved === 'jalali') {
        return 'jalali'
    }
    return 'gregorian'
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
 * Resolves the effective day of the week (0 = Sunday, 1 = Monday, 6 = Saturday).
 */
export function resolveFirstDayOfWeek(
    firstDay: FirstDayOfWeek,
    calendar: CalendarSystem,
): number {
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
    const day = curr.getDay() // 0 = Sun .. 6 = Sat

    const targetStartDay = resolveFirstDayOfWeek(firstDayOfWeek, calendar)
    const diffToStart = (day - targetStartDay + 7) % 7

    const startDate = new Date(curr)
    startDate.setDate(curr.getDate() - diffToStart)

    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    const formatISO = (date: Date) => {
        const year = String(date.getFullYear())
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const dayOfMonth = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${dayOfMonth}`
    }

    return {
        start: formatISO(startDate),
        end: formatISO(endDate),
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

    if (calendar === 'jalali') {
        const { jy, jm } = toJalaali(y, m, d)
        const { startDate, endDate } = getJalaliMonthRange(jy, jm)
        const monthIdentifier = `${String(jy)}-${String(jm).padStart(2, '0')}`
        return {
            start: startDate,
            end: endDate,
            monthIdentifier,
        }
    }

    const start = `${String(y)}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${String(y)}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const monthIdentifier = `${String(y)}-${String(m).padStart(2, '0')}`

    return {
        start,
        end,
        monthIdentifier,
    }
}

/**
 * Steps one month forward or backward relative to referenceDateStr.
 * Returns a new Gregorian date (YYYY-MM-DD) within that month.
 */
export function stepMonth(
    referenceDateStr: string,
    step: number,
    calendar: CalendarSystem = 'gregorian',
): string {
    const [y, m, d] = referenceDateStr.split('-').map(Number)

    if (calendar === 'jalali') {
        const { jy, jm } = toJalaali(y, m, d)
        let newJm = jm + step
        let newJy = jy

        while (newJm > 12) {
            newJm -= 12
            newJy += 1
        }
        while (newJm < 1) {
            newJm += 12
            newJy -= 1
        }

        const g = toGregorian(newJy, newJm, 1)
        return `${String(g.gy)}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`
    }

    const date = new Date(y, m - 1 + step, 1)
    const year = String(date.getFullYear())
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
        const isFa = locale.startsWith('fa')
        const monthNames = isFa ? JALALI_MONTH_NAMES_FA : JALALI_MONTH_NAMES_EN
        const jStart = toJalaali(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            startDate.getDate(),
        )
        const jEnd = toJalaali(
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            endDate.getDate(),
        )

        const startMonthName = monthNames[jStart.jm - 1]
        const endMonthName = monthNames[jEnd.jm - 1]

        if (jStart.jm === jEnd.jm) {
            return `${String(jStart.jd)} - ${String(jEnd.jd)} ${startMonthName} ${String(jEnd.jy)}`
        }
        return `${String(jStart.jd)} ${startMonthName} - ${String(jEnd.jd)} ${endMonthName} ${String(jEnd.jy)}`
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
            return formatJalaliDate(date, { includeWeekday: true }, locale)
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
        const isFa = locale.startsWith('fa')
        const monthNames = isFa ? JALALI_MONTH_NAMES_FA : JALALI_MONTH_NAMES_EN
        const { jy, jm } = toJalaali(y, m, d)
        return `${monthNames[jm - 1]} ${String(jy)}`
    }

    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
    })
}
