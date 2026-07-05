import { describe, it, expect } from '@jest/globals'
import {
    DEFAULT_DAILY_TARGET_MINUTES,
    resolveDailyTarget,
    sumDailyTargets,
    WorkHoursEntry,
} from './workHours'

describe('resolveDailyTarget', () => {
    const history: WorkHoursEntry[] = [
        { effectiveDate: '2026-01-10', dailyMinutes: 462 },
        { effectiveDate: '2026-03-01', dailyMinutes: 420 },
    ]

    it('returns the default for an empty history', () => {
        expect(resolveDailyTarget([], '2026-01-01')).toBe(
            DEFAULT_DAILY_TARGET_MINUTES,
        )
    })

    it('returns the default for a date before the first entry', () => {
        expect(resolveDailyTarget(history, '2026-01-09')).toBe(
            DEFAULT_DAILY_TARGET_MINUTES,
        )
    })

    it('returns the entry value for a date equal to its effective date', () => {
        expect(resolveDailyTarget(history, '2026-01-10')).toBe(462)
        expect(resolveDailyTarget(history, '2026-03-01')).toBe(420)
    })

    it('returns the earlier value for a date between two entries', () => {
        expect(resolveDailyTarget(history, '2026-02-15')).toBe(462)
    })

    it('returns the last value for a date after the last entry', () => {
        expect(resolveDailyTarget(history, '2026-12-31')).toBe(420)
    })

    it('handles a single-entry history', () => {
        const single: WorkHoursEntry[] = [
            { effectiveDate: '2026-05-01', dailyMinutes: 360 },
        ]
        expect(resolveDailyTarget(single, '2026-04-30')).toBe(
            DEFAULT_DAILY_TARGET_MINUTES,
        )
        expect(resolveDailyTarget(single, '2026-05-01')).toBe(360)
        expect(resolveDailyTarget(single, '2026-06-01')).toBe(360)
    })

    it('compares dates correctly across a year boundary', () => {
        const boundary: WorkHoursEntry[] = [
            { effectiveDate: '2026-01-01', dailyMinutes: 400 },
        ]
        expect(resolveDailyTarget(boundary, '2025-12-31')).toBe(
            DEFAULT_DAILY_TARGET_MINUTES,
        )
        expect(resolveDailyTarget(boundary, '2026-01-01')).toBe(400)
    })
})

describe('sumDailyTargets', () => {
    const history: WorkHoursEntry[] = [
        { effectiveDate: '2026-01-10', dailyMinutes: 462 },
        { effectiveDate: '2026-03-01', dailyMinutes: 420 },
    ]

    it('returns 0 for no dates', () => {
        expect(sumDailyTargets(history, [])).toBe(0)
    })

    it('sums the default for dates with an empty history', () => {
        expect(sumDailyTargets([], ['2026-01-01', '2026-01-02'])).toBe(
            2 * DEFAULT_DAILY_TARGET_MINUTES,
        )
    })

    it('sums mixed targets across effective dates', () => {
        expect(
            sumDailyTargets(history, [
                '2026-01-09',
                '2026-02-15',
                '2026-03-01',
            ]),
        ).toBe(DEFAULT_DAILY_TARGET_MINUTES + 462 + 420)
    })

    it('accepts a Set of dates', () => {
        expect(sumDailyTargets(history, new Set(['2026-02-15']))).toBe(462)
    })
})
