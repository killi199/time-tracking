import { describe, it, expect } from 'vitest';
import { formatTime, getFormattedTime, getFormattedDate, getLocaleDateString } from './time';

describe('formatTime', () => {
    it('formats positive minutes correctly without sign', () => {
        expect(formatTime(65)).toBe('01:05');
    });

    it('formats positive minutes correctly with sign', () => {
        expect(formatTime(65, true)).toBe('+01:05');
    });

    it('formats negative minutes correctly without sign (absolute)', () => {
        expect(formatTime(-65)).toBe('01:05');
    });

    it('formats negative minutes correctly with sign', () => {
        expect(formatTime(-65, true)).toBe('-01:05');
    });

    it('formats zero correctly without sign', () => {
        expect(formatTime(0)).toBe('00:00');
    });

    it('formats zero correctly with sign', () => {
        expect(formatTime(0, true)).toBe('+00:00');
    });

    it('pads hours and minutes correctly', () => {
        expect(formatTime(61)).toBe('01:01');
        expect(formatTime(5)).toBe('00:05');
    });

    it('handles large hours correctly', () => {
        expect(formatTime(6000)).toBe('100:00');
    });
});

describe('getFormattedTime', () => {
    it('formats time correctly', () => {
        const date = new Date(2023, 0, 15, 9, 5); // 9:05
        expect(getFormattedTime(date)).toBe('09:05');
    });

    it('pads hours and minutes correctly', () => {
        const date = new Date(2023, 0, 15, 14, 30); // 14:30
        expect(getFormattedTime(date)).toBe('14:30');
    });
    
    it('handles midnight correctly', () => {
        const date = new Date(2023, 0, 15, 0, 0); // 00:00
        expect(getFormattedTime(date)).toBe('00:00');
    });
});

describe('getFormattedDate', () => {
    it('formats date correctly', () => {
        const date = new Date(2023, 0, 5); // Jan 5, 2023
        expect(getFormattedDate(date)).toBe('2023-01-05');
    });

    it('pads month and day correctly', () => {
        const date = new Date(2023, 9, 15); // Oct 15, 2023
        expect(getFormattedDate(date)).toBe('2023-10-15');
    });

    it('handles new year correctly', () => {
        const date = new Date(2023, 0, 1); // Jan 1, 2023
        expect(getFormattedDate(date)).toBe('2023-01-01');
    });
    
    it('handles end of year correctly', () => {
        const date = new Date(2023, 11, 31); // Dec 31, 2023
        expect(getFormattedDate(date)).toBe('2023-12-31');
    });
});

describe('getLocaleDateString', () => {
    it('returns empty string for empty input', () => {
        expect(getLocaleDateString('', 'en-US')).toBe('');
    });

    it('formats date correctly for en-US', () => {
        // 2023-01-10 -> Jan 10, 2023 (or Tue, Jan 10, 2023 depending on options)
        // options used in implementation: weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric'
        // For 'en-US': "Tue, 1/10/2023"
        const result = getLocaleDateString('2023-01-10', 'en-US');
        expect(result).toBe('Tue, 1/10/2023');
    });

    it('formats date correctly for de-DE', () => {
        // 2023-01-10 -> 10.1.2023 (or similar)
        // For 'de-DE': "Di., 10.1.2023"
        const result = getLocaleDateString('2023-01-10', 'de-DE');
        expect(result).toBe('Di., 10.1.2023');
    });

    it('handles single digit days and months correctly', () => {
        const result = getLocaleDateString('2023-05-05', 'en-US');
        expect(result).toBe('Fri, 5/5/2023');
    });
});
