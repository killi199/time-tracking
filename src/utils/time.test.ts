import { describe, it, expect } from 'vitest';
import { formatTime } from './time';

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
