/**
 * Mathematical utilities for the Jalali (Solar Hijri / Persian) calendar.
 * Based on the astronomical/arithmetic Borkowski algorithm.
 * Zero external dependencies.
 */

function div(a: number, b: number): number {
    return ~~(a / b)
}

function mod(a: number, b: number): number {
    return a - ~~(a / b) * b
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
    let j = 4 * jdn + 139361631
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
    const i = div(mod(j, 1461), 4) * 5 + 308
    const gd = div(mod(i, 153), 5) + 1
    const gm = mod(div(i, 153), 12) + 1
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
    return { gy, gm, gd }
}

function g2d(gy: number, gm: number, gd: number): number {
    let d =
        div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
        div(153 * mod(gm + 9, 12) + 2, 5) +
        gd -
        34840408
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
    return d
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
    const breaks = [
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
        2192, 2262, 2324, 2394, 2456, 3178,
    ]
    const bl = breaks.length
    const gy = jy + 621
    let leapJ = -14
    let jp = breaks[0]
    let jump = 0

    if (jy < jp || jy >= breaks[bl - 1]) {
        throw new Error(`Invalid Jalali year ${String(jy)}`)
    }

    for (let i = 1; i < bl; i += 1) {
        const jm = breaks[i]
        jump = jm - jp
        if (jy < jm) break
        leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
        jp = jm
    }
    let n = jy - jp

    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
    if (mod(jump, 33) === 4 && jump - n === 4) {
        leapJ += 1
    }

    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
    const march = 20 + leapJ - leapG

    if (jump - n < 6) {
        n = n - jump + div(jump + 4, 33) * 33
    }
    let leap = mod(mod(n + 1, 33) - 1, 4)
    if (leap === -1) {
        leap = 4
    }

    return { leap, gy, march }
}

function j2d(jy: number, jm: number, jd: number): number {
    const r = jalCal(jy)
    return (
        g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
    )
}

function d2j(jdn: number): { jy: number; jm: number; jd: number } {
    const gy = d2g(jdn).gy
    let jy = gy - 621
    let r = jalCal(jy)
    let jdn1f = g2d(gy, 3, r.march)
    let k = jdn - jdn1f

    if (k >= 0) {
        if (k <= 185) {
            return {
                jy,
                jm: 1 + div(k, 31),
                jd: mod(k, 31) + 1,
            }
        }
        k -= 186
    } else {
        jy -= 1
        r = jalCal(jy)
        jdn1f = g2d(r.gy, 3, r.march)
        k = jdn - jdn1f
        k -= 186
    }

    return {
        jy,
        jm: 7 + div(k, 30),
        jd: mod(k, 30) + 1,
    }
}

/**
 * Converts a Gregorian date (year, month 1-12, day 1-31) to Jalali (jy, jm, jd).
 */
export function toJalaali(
    gy: number,
    gm: number,
    gd: number,
): { jy: number; jm: number; jd: number } {
    return d2j(g2d(gy, gm, gd))
}

/**
 * Converts a Jalali date (year, month 1-12, day 1-31) to Gregorian (gy, gm, gd).
 */
export function toGregorian(
    jy: number,
    jm: number,
    jd: number,
): { gy: number; gm: number; gd: number } {
    return d2g(j2d(jy, jm, jd))
}

/**
 * Returns true if the given Jalali year is a leap year.
 */
export function isJalaliLeapYear(jy: number): boolean {
    return jalCal(jy).leap === 0
}

/**
 * Returns the number of days in a given Jalali month (1-12).
 */
export function getJalaliMonthDays(jy: number, jm: number): number {
    if (jm <= 6) return 31
    if (jm <= 11) return 30
    return isJalaliLeapYear(jy) ? 30 : 29
}

export const JALALI_MONTH_NAMES_FA = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
]

export const JALALI_MONTH_NAMES_EN = [
    'Farvardin',
    'Ordibehesht',
    'Khordad',
    'Tir',
    'Mordad',
    'Shahrivar',
    'Mehr',
    'Aban',
    'Azar',
    'Dey',
    'Bahman',
    'Esfand',
]

export const JALALI_WEEKDAY_NAMES_FA = [
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنج‌شنبه',
    'جمعه',
    'شنبه',
]

export const JALALI_WEEKDAY_SHORT_FA = ['۱ش', '۲ش', '۳ش', '۴ش', '۵ش', 'ج', 'ش']

/**
 * Returns the Gregorian start and end dates (YYYY-MM-DD) for a specific Jalali month.
 */
export function getJalaliMonthRange(
    jy: number,
    jm: number,
): { startDate: string; endDate: string } {
    const daysInMonth = getJalaliMonthDays(jy, jm)
    const gStart = toGregorian(jy, jm, 1)
    const gEnd = toGregorian(jy, jm, daysInMonth)

    const startDate = `${String(gStart.gy)}-${String(gStart.gm).padStart(2, '0')}-${String(gStart.gd).padStart(2, '0')}`
    const endDate = `${String(gEnd.gy)}-${String(gEnd.gm).padStart(2, '0')}-${String(gEnd.gd).padStart(2, '0')}`

    return { startDate, endDate }
}

/**
 * Formats a Date object in the Jalali calendar system.
 */
export function formatJalaliDate(
    date: Date,
    options?: {
        includeWeekday?: boolean
        monthFormat?: 'numeric' | 'long'
    },
    locale?: string,
): string {
    const { jy, jm, jd } = toJalaali(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
    )
    const isFa = locale?.startsWith('fa') ?? false
    const monthNames = isFa ? JALALI_MONTH_NAMES_FA : JALALI_MONTH_NAMES_EN
    const monthStr =
        options?.monthFormat === 'numeric'
            ? String(jm).padStart(2, '0')
            : monthNames[jm - 1]

    if (options?.includeWeekday) {
        const dayOfWeek = date.getDay() // 0 = Sunday .. 6 = Saturday
        const weekdayStr = isFa
            ? JALALI_WEEKDAY_NAMES_FA[dayOfWeek]
            : date.toLocaleDateString(locale ?? 'en-US', { weekday: 'short' })
        return `${weekdayStr} ${String(jd)} ${monthStr} ${String(jy)}`
    }

    if (options?.monthFormat === 'numeric') {
        return `${String(jy)}/${monthStr}/${String(jd).padStart(2, '0')}`
    }

    return `${String(jd)} ${monthStr} ${String(jy)}`
}
