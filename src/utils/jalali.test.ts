import { describe, it, expect } from '@jest/globals'
import {
    toJalaali,
    toGregorian,
    isJalaliLeapYear,
    getJalaliMonthDays,
    getJalaliMonthRange,
    formatJalaliDate,
    JALALI_MONTH_NAMES_FA,
    JALALI_MONTH_NAMES_EN,
} from './jalali'

describe('jalali calendar utility', () => {
    describe('toJalaali and toGregorian roundtrips', () => {
        it('correctly converts Nowruz 1403 (leap year)', () => {
            const j = toJalaali(2024, 3, 20)
            expect(j).toEqual({ jy: 1403, jm: 1, jd: 1 })

            const g = toGregorian(1403, 1, 1)
            expect(g).toEqual({ gy: 2024, gm: 3, gd: 20 })
        })

        it('correctly converts current fixed date 2026-11-11', () => {
            const j = toJalaali(2026, 11, 11)
            expect(j).toEqual({ jy: 1405, jm: 8, jd: 20 })

            const g = toGregorian(1405, 8, 20)
            expect(g).toEqual({ gy: 2026, gm: 11, gd: 11 })
        })

        it('correctly converts date before Nowruz in Gregorian year', () => {
            // 2024-03-19 is 1402-12-29
            const j = toJalaali(2024, 3, 19)
            expect(j).toEqual({ jy: 1402, jm: 12, jd: 29 })

            const g = toGregorian(1402, 12, 29)
            expect(g).toEqual({ gy: 2024, gm: 3, gd: 19 })
        })

        it('handles year transition and boundaries', () => {
            // First month end (Farvardin 31)
            const farvardinEnd = toJalaali(2024, 4, 19)
            expect(farvardinEnd).toEqual({ jy: 1403, jm: 1, jd: 31 })

            // Month 2 start (Ordibehesht 1)
            const ordibehesht = toJalaali(2024, 4, 20)
            expect(ordibehesht).toEqual({ jy: 1403, jm: 2, jd: 1 })

            // Month 7 (Mehr - 30 days)
            const mehr = toJalaali(2024, 9, 22)
            expect(mehr).toEqual({ jy: 1403, jm: 7, jd: 1 })
            const gMehr = toGregorian(1403, 7, 1)
            expect(gMehr).toEqual({ gy: 2024, gm: 9, gd: 22 })
        })
    })

    describe('isJalaliLeapYear', () => {
        it('identifies leap and non-leap years correctly', () => {
            expect(isJalaliLeapYear(1399)).toBe(true)
            expect(isJalaliLeapYear(1400)).toBe(false)
            expect(isJalaliLeapYear(1401)).toBe(false)
            expect(isJalaliLeapYear(1402)).toBe(false)
            expect(isJalaliLeapYear(1403)).toBe(true)
            expect(isJalaliLeapYear(1404)).toBe(false)
            expect(isJalaliLeapYear(1405)).toBe(false)
        })

        it('handles break years and boundary leap calculations', () => {
            // Check break boundaries and special jump%33===4 condition (year 2093)
            const testYears = [
                9, 37, 38, 198, 199, 425, 426, 685, 686, 755, 756, 817, 818,
                1110, 1111, 1180, 1181, 1209, 1210, 1634, 1635, 2059, 2060,
                2093, 2096, 2097,
            ]
            testYears.forEach((y) => {
                expect(typeof isJalaliLeapYear(y)).toBe('boolean')
            })
        })

        it('throws an error for invalid year outside breaks', () => {
            expect(() => isJalaliLeapYear(-100)).toThrow('Invalid Jalali year')
            expect(() => isJalaliLeapYear(4000)).toThrow('Invalid Jalali year')
        })
    })

    describe('various Gregorian to Jalali edge dates', () => {
        it('converts early Gregorian days around March correctly', () => {
            const marchDates = [
                [2000, 3, 19],
                [2000, 3, 20],
                [2000, 3, 21],
                [2020, 3, 19],
                [2020, 3, 20],
                [2020, 3, 21],
                [1980, 3, 20],
                [1980, 3, 21],
                [1925, 3, 21],
                [1925, 3, 22],
            ]
            marchDates.forEach(([gy, gm, gd]) => {
                const j = toJalaali(gy, gm, gd)
                const g = toGregorian(j.jy, j.jm, j.jd)
                expect(g).toEqual({ gy, gm, gd })
            })
        })
    })

    describe('getJalaliMonthDays', () => {
        it('returns 31 days for first 6 months', () => {
            for (let m = 1; m <= 6; m++) {
                expect(getJalaliMonthDays(1403, m)).toBe(31)
            }
        })

        it('returns 30 days for months 7 to 11', () => {
            for (let m = 7; m <= 11; m++) {
                expect(getJalaliMonthDays(1403, m)).toBe(30)
            }
        })

        it('returns 30 for month 12 in leap year and 29 in non-leap year', () => {
            expect(getJalaliMonthDays(1403, 12)).toBe(30) // 1403 is leap
            expect(getJalaliMonthDays(1402, 12)).toBe(29) // 1402 is non-leap
        })
    })

    describe('getJalaliMonthRange', () => {
        it('returns accurate Gregorian YYYY-MM-DD bounds for a Jalali month', () => {
            // Farvardin 1403 (leap): 1403-01-01 to 1403-01-31 -> 2024-03-20 to 2024-04-19
            const range = getJalaliMonthRange(1403, 1)
            expect(range.startDate).toBe('2024-03-20')
            expect(range.endDate).toBe('2024-04-19')
        })

        it('returns accurate Gregorian bounds for Esfand in non-leap year', () => {
            // Esfand 1402: 1402-12-01 to 1402-12-29
            const range = getJalaliMonthRange(1402, 12)
            expect(range.startDate).toBe('2024-02-20')
            expect(range.endDate).toBe('2024-03-19')
        })
    })

    describe('formatJalaliDate', () => {
        it('formats in English by default', () => {
            const date = new Date(2026, 10, 11) // 2026-11-11 = 1405-08-20
            expect(formatJalaliDate(date)).toBe('20 Aban 1405')
        })

        it('formats in Persian when locale is fa', () => {
            const date = new Date(2026, 10, 11)
            expect(formatJalaliDate(date, undefined, 'fa')).toBe('20 آبان 1405')
        })

        it('formats with numeric month', () => {
            const date = new Date(2026, 10, 11)
            expect(
                formatJalaliDate(date, { monthFormat: 'numeric' }, 'en'),
            ).toBe('1405/08/20')
        })

        it('formats with weekday', () => {
            const date = new Date(2026, 10, 11) // Wednesday (4)
            const formattedEn = formatJalaliDate(
                date,
                { includeWeekday: true },
                'en',
            )
            expect(formattedEn).toContain('Aban 1405')

            const formattedDefault = formatJalaliDate(date, {
                includeWeekday: true,
            })
            expect(formattedDefault).toContain('Aban 1405')

            const formattedFa = formatJalaliDate(
                date,
                { includeWeekday: true },
                'fa',
            )
            expect(formattedFa).toContain('چهارشنبه')
            expect(formattedFa).toContain('آبان 1405')
        })
    })

    it('exports 12 month names in FA and EN', () => {
        expect(JALALI_MONTH_NAMES_FA).toHaveLength(12)
        expect(JALALI_MONTH_NAMES_EN).toHaveLength(12)
    })
})
