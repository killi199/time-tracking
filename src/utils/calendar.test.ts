import { describe, it, expect, jest, afterEach } from '@jest/globals'
import {
    getActiveCalendarSystem,
    getSavedFirstDayOfWeek,
    resolveFirstDayOfWeek,
    getWeekRange,
    getMonthRange,
    stepMonth,
    formatHeaderDate,
} from './calendar'
import { getSetting } from '../db/database'

jest.mock('../db/database', () => ({
    getSetting: jest.fn(),
}))

describe('calendar utility', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getActiveCalendarSystem', () => {
        it('returns gregorian by default if setting is not set', () => {
            jest.mocked(getSetting).mockReturnValue(null)
            expect(getActiveCalendarSystem()).toBe('gregorian')
        })

        it('returns jalali when setting is jalali', () => {
            jest.mocked(getSetting).mockReturnValue('jalali')
            expect(getActiveCalendarSystem()).toBe('jalali')
        })

        it('returns gregorian for any other string', () => {
            jest.mocked(getSetting).mockReturnValue('unknown')
            expect(getActiveCalendarSystem()).toBe('gregorian')
        })
    })

    describe('getSavedFirstDayOfWeek', () => {
        it('returns auto by default if not set', () => {
            jest.mocked(getSetting).mockReturnValue(null)
            expect(getSavedFirstDayOfWeek()).toBe('auto')
        })

        it('returns valid values when stored', () => {
            jest.mocked(getSetting).mockReturnValue('saturday')
            expect(getSavedFirstDayOfWeek()).toBe('saturday')

            jest.mocked(getSetting).mockReturnValue('sunday')
            expect(getSavedFirstDayOfWeek()).toBe('sunday')

            jest.mocked(getSetting).mockReturnValue('monday')
            expect(getSavedFirstDayOfWeek()).toBe('monday')

            jest.mocked(getSetting).mockReturnValue('auto')
            expect(getSavedFirstDayOfWeek()).toBe('auto')
        })

        it('returns auto for invalid stored string', () => {
            jest.mocked(getSetting).mockReturnValue('invalid_val')
            expect(getSavedFirstDayOfWeek()).toBe('auto')
        })
    })

    describe('resolveFirstDayOfWeek', () => {
        it('resolves explicit days regardless of calendar', () => {
            expect(resolveFirstDayOfWeek('saturday', 'gregorian')).toBe(6)
            expect(resolveFirstDayOfWeek('saturday', 'jalali')).toBe(6)
            expect(resolveFirstDayOfWeek('sunday', 'gregorian')).toBe(0)
            expect(resolveFirstDayOfWeek('sunday', 'jalali')).toBe(0)
            expect(resolveFirstDayOfWeek('monday', 'gregorian')).toBe(1)
            expect(resolveFirstDayOfWeek('monday', 'jalali')).toBe(1)
        })

        it('resolves auto based on calendar system', () => {
            expect(resolveFirstDayOfWeek('auto', 'jalali')).toBe(6) // Saturday
            expect(resolveFirstDayOfWeek('auto', 'gregorian')).toBe(1) // Monday
        })
    })

    describe('getWeekRange', () => {
        it('calculates week range with Monday as start', () => {
            // 2026-11-11 is a Wednesday
            const range = getWeekRange('2026-11-11', 'monday', 'gregorian')
            expect(range.start).toBe('2026-11-09') // Monday
            expect(range.end).toBe('2026-11-15') // Sunday
        })

        it('calculates week range with Saturday as start', () => {
            // 2026-11-11 is a Wednesday
            const range = getWeekRange('2026-11-11', 'saturday', 'gregorian')
            expect(range.start).toBe('2026-11-07') // Saturday
            expect(range.end).toBe('2026-11-13') // Friday
        })

        it('calculates week range with Sunday as start', () => {
            const range = getWeekRange('2026-11-11', 'sunday', 'gregorian')
            expect(range.start).toBe('2026-11-08') // Sunday
            expect(range.end).toBe('2026-11-14') // Saturday
        })

        it('uses defaults when parameters are omitted', () => {
            const range = getWeekRange('2026-11-11')
            // auto + gregorian => Monday start
            expect(range.start).toBe('2026-11-09')
            expect(range.end).toBe('2026-11-15')
        })
    })

    describe('getMonthRange', () => {
        it('returns Gregorian month range for gregorian calendar', () => {
            const range = getMonthRange('2026-11-15', 'gregorian')
            expect(range.start).toBe('2026-11-01')
            expect(range.end).toBe('2026-11-30')
            expect(range.monthIdentifier).toBe('2026-11')
        })

        it('returns Jalali month range for jalali calendar', () => {
            // 2026-11-11 is 1405-08-20 (Aban 1405: 1405-08-01 to 1405-08-30)
            const range = getMonthRange('2026-11-11', 'jalali')
            expect(range.start).toBe('2026-10-23')
            expect(range.end).toBe('2026-11-21')
            expect(range.monthIdentifier).toBe('1405-08')
        })
    })

    describe('stepMonth', () => {
        it('steps Gregorian months forward and backward', () => {
            expect(stepMonth('2026-11-15', 1, 'gregorian')).toBe('2026-12-01')
            expect(stepMonth('2026-11-15', -1, 'gregorian')).toBe('2026-10-01')
            expect(stepMonth('2026-12-15', 1, 'gregorian')).toBe('2027-01-01')
        })

        it('steps Jalali months forward and backward across years', () => {
            // 2026-11-11 is Aban 1405 (month 8)
            // Next month is Azar 1405 (month 9) -> 1405-09-01 is 2026-11-22
            expect(stepMonth('2026-11-11', 1, 'jalali')).toBe('2026-11-22')

            // Step across year boundary (+6 months from month 8 -> month 14 -> month 2 of next year 1406)
            const steppedForward = stepMonth('2026-11-11', 6, 'jalali')
            expect(steppedForward).toBe('2027-04-21') // 1406-02-01

            // Step backward across year boundary (-10 months from month 8 -> Dey of previous year 1404)
            const steppedBackward = stepMonth('2026-11-11', -10, 'jalali')
            expect(steppedBackward).toBe('2025-12-22') // 1404-10-01
        })
    })

    describe('formatHeaderDate', () => {
        it('formats day view for gregorian and jalali', () => {
            const dateStr = '2026-11-11'
            const gDay = formatHeaderDate(dateStr, 'day', 'gregorian', 'en-US')
            expect(gDay).toContain('2026')

            const jDayFa = formatHeaderDate(dateStr, 'day', 'jalali', 'fa-IR')
            expect(jDayFa).toContain('چهارشنبه')
            expect(jDayFa).toContain('آبان 1405')
        })

        it('formats week view for gregorian and jalali (same and multi-month)', () => {
            const dateStr = '2026-11-11'
            const gWeek = formatHeaderDate(
                dateStr,
                'week',
                'gregorian',
                'en-US',
            )
            expect(gWeek).toContain('Nov')

            // Same Jalali month week in FA and EN
            const jWeekFa = formatHeaderDate(
                dateStr,
                'week',
                'jalali',
                'fa',
                'saturday',
            )
            expect(jWeekFa).toContain('آبان 1405')

            const jWeekEn = formatHeaderDate(
                dateStr,
                'week',
                'jalali',
                'en',
                'saturday',
            )
            expect(jWeekEn).toContain('Aban 1405')

            // Multi-month Jalali week (around 2026-10-23, transitioning Mehr to Aban)
            const jWeekMulti = formatHeaderDate(
                '2026-10-23',
                'week',
                'jalali',
                'en',
                'monday',
            )
            expect(jWeekMulti).toContain('1405')
        })

        it('formats month view for gregorian and jalali in en and fa', () => {
            const dateStr = '2026-11-11'
            const gMonth = formatHeaderDate(
                dateStr,
                'month',
                'gregorian',
                'en-US',
            )
            expect(gMonth).toContain('November 2026')

            const jMonthEn = formatHeaderDate(dateStr, 'month', 'jalali', 'en')
            expect(jMonthEn).toBe('Aban 1405')

            const jMonthFa = formatHeaderDate(dateStr, 'month', 'jalali', 'fa')
            expect(jMonthFa).toBe('آبان 1405')
        })
    })
})
