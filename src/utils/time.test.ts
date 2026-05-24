import { describe, it, expect } from 'vitest'
import {
    formatTime,
    getFormattedTime,
    getFormattedDate,
    getLocaleDateString,
    parseLocalDate,
    parseLocalTime,
    getEventTimeAndDate,
} from './time'

describe('formatTime', () => {
    it('formats positive minutes correctly without sign', () => {
        expect(formatTime(65)).toBe('01:05')
    })

    it('formats positive minutes correctly with sign', () => {
        expect(formatTime(65, true)).toBe('+01:05')
    })

    it('formats negative minutes correctly without sign (absolute)', () => {
        expect(formatTime(-65)).toBe('01:05')
    })

    it('formats negative minutes correctly with sign', () => {
        expect(formatTime(-65, true)).toBe('-01:05')
    })

    it('formats zero correctly without sign', () => {
        expect(formatTime(0)).toBe('00:00')
    })

    it('formats zero correctly with sign', () => {
        expect(formatTime(0, true)).toBe('+00:00')
    })

    it('pads hours and minutes correctly', () => {
        expect(formatTime(61)).toBe('01:01')
        expect(formatTime(5)).toBe('00:05')
    })

    it('handles large hours correctly', () => {
        expect(formatTime(6000)).toBe('100:00')
    })
})

describe('getFormattedTime', () => {
    it('formats time correctly', () => {
        const date = new Date(2023, 0, 15, 9, 5) // 9:05
        expect(getFormattedTime(date)).toBe('09:05')
    })

    it('pads hours and minutes correctly', () => {
        const date = new Date(2023, 0, 15, 14, 30) // 14:30
        expect(getFormattedTime(date)).toBe('14:30')
    })

    it('handles midnight correctly', () => {
        const date = new Date(2023, 0, 15, 0, 0) // 00:00
        expect(getFormattedTime(date)).toBe('00:00')
    })
})

describe('getFormattedDate', () => {
    it('formats date correctly', () => {
        const date = new Date(2023, 0, 5) // Jan 5, 2023
        expect(getFormattedDate(date)).toBe('2023-01-05')
    })

    it('pads month and day correctly', () => {
        const date = new Date(2023, 9, 15) // Oct 15, 2023
        expect(getFormattedDate(date)).toBe('2023-10-15')
    })

    it('handles new year correctly', () => {
        const date = new Date(2023, 0, 1) // Jan 1, 2023
        expect(getFormattedDate(date)).toBe('2023-01-01')
    })

    it('handles end of year correctly', () => {
        const date = new Date(2023, 11, 31) // Dec 31, 2023
        expect(getFormattedDate(date)).toBe('2023-12-31')
    })
})

describe('getLocaleDateString', () => {
    it('returns empty string for empty input', () => {
        expect(getLocaleDateString('', 'en-US')).toBe('')
    })

    it('formats date correctly for en-US', () => {
        // 2023-01-10 -> Jan 10, 2023 (or Tue, Jan 10, 2023 depending on options)
        // options used in implementation: weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric'
        // For 'en-US': "Tue, 1/10/2023"
        const result = getLocaleDateString('2023-01-10', 'en-US')
        expect(result).toBe('Tue, 1/10/2023')
    })

    it('formats date correctly for de-DE', () => {
        // 2023-01-10 -> 10.1.2023 (or similar)
        // For 'de-DE': "Di., 10.1.2023"
        const result = getLocaleDateString('2023-01-10', 'de-DE')
        expect(result).toBe('Di., 10.1.2023')
    })

    it('handles single digit days and months correctly', () => {
        const result = getLocaleDateString('2023-05-05', 'en-US')
        expect(result).toBe('Fri, 5/5/2023')
    })
})

describe('parseLocalDate', () => {
    it('correctly parses date string to local Date object without timezone shift', () => {
        const dateObj = parseLocalDate('2026-05-24')
        expect(dateObj.getFullYear()).toBe(2026)
        expect(dateObj.getMonth()).toBe(4) // 0-indexed May
        expect(dateObj.getDate()).toBe(24)
    })
})

describe('parseLocalTime', () => {
    it('correctly parses date and time string to local Date object without timezone shift', () => {
        const dateObj = parseLocalTime('2026-05-24', '14:30')
        expect(dateObj.getFullYear()).toBe(2026)
        expect(dateObj.getMonth()).toBe(4)
        expect(dateObj.getDate()).toBe(24)
        expect(dateObj.getHours()).toBe(14)
        expect(dateObj.getMinutes()).toBe(30)
    })
})

describe('getEventTimeAndDate', () => {
    it('returns formatted local date and time from the timestamp', () => {
        // Create an absolute timestamp (UTC ISO string)
        const dateObj = new Date(2026, 4, 24, 14, 30) // local May 24, 2026 14:30
        const isoStr = dateObj.toISOString()
        const result = getEventTimeAndDate(isoStr)
        expect(result.date).toBe('2026-05-24')
        expect(result.time).toBe('14:30')
    })
})

describe('parseLocalDate - Edge Cases & Timezone Resilience', () => {
    it('handles leap years correctly', () => {
        const leapDate = parseLocalDate('2024-02-29')
        expect(leapDate.getFullYear()).toBe(2024)
        expect(leapDate.getMonth()).toBe(1) // 0-indexed February
        expect(leapDate.getDate()).toBe(29)

        const normalFebDate = parseLocalDate('2026-02-28')
        expect(normalFebDate.getFullYear()).toBe(2026)
        expect(normalFebDate.getMonth()).toBe(1)
        expect(normalFebDate.getDate()).toBe(28)
    })

    it('handles month boundaries correctly', () => {
        const endOfMonth = parseLocalDate('2026-04-30')
        expect(endOfMonth.getFullYear()).toBe(2026)
        expect(endOfMonth.getMonth()).toBe(3) // April
        expect(endOfMonth.getDate()).toBe(30)

        const startOfNextMonth = parseLocalDate('2026-05-01')
        expect(startOfNextMonth.getFullYear()).toBe(2026)
        expect(startOfNextMonth.getMonth()).toBe(4) // May
        expect(startOfNextMonth.getDate()).toBe(1)
    })

    it('handles extreme dates correctly', () => {
        const distantFuture = parseLocalDate('2099-12-31')
        expect(distantFuture.getFullYear()).toBe(2099)
        expect(distantFuture.getMonth()).toBe(11) // December
        expect(distantFuture.getDate()).toBe(31)

        const pastDate = parseLocalDate('2000-01-01')
        expect(pastDate.getFullYear()).toBe(2000)
        expect(pastDate.getMonth()).toBe(0) // January
        expect(pastDate.getDate()).toBe(1)
    })
})

describe('parseLocalTime - Edge Cases & Timezone Resilience', () => {
    it('handles day boundaries correctly', () => {
        const midnight = parseLocalTime('2026-05-24', '00:00')
        expect(midnight.getFullYear()).toBe(2026)
        expect(midnight.getMonth()).toBe(4)
        expect(midnight.getDate()).toBe(24)
        expect(midnight.getHours()).toBe(0)
        expect(midnight.getMinutes()).toBe(0)

        const endOfDay = parseLocalTime('2026-05-24', '23:59')
        expect(endOfDay.getFullYear()).toBe(2026)
        expect(endOfDay.getMonth()).toBe(4)
        expect(endOfDay.getDate()).toBe(24)
        expect(endOfDay.getHours()).toBe(23)
        expect(endOfDay.getMinutes()).toBe(59)
    })

    it('handles simulated daylight savings transitions correctly', () => {
        // European Summer Time start 2026: March 29th (DST spring forward)
        const dstStart = parseLocalTime('2026-03-29', '02:30')
        expect(dstStart.getFullYear()).toBe(2026)
        expect(dstStart.getMonth()).toBe(2) // March
        expect(dstStart.getDate()).toBe(29)

        // European Summer Time end 2026: October 25th (DST fall back)
        const dstEnd = parseLocalTime('2026-10-25', '02:30')
        expect(dstEnd.getFullYear()).toBe(2026)
        expect(dstEnd.getMonth()).toBe(9) // October
        expect(dstEnd.getDate()).toBe(25)
    })
})
