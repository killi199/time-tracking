import { describe, it, expect } from 'vitest';
import { formatTime, getFormattedTime, getFormattedDate } from './time';

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
