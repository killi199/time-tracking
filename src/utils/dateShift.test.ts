import { describe, it, expect } from '@jest/globals'
import { shiftToUTC, shiftToLocal } from './dateShift'

describe('shiftToUTC', () => {
    it('copies the local wall-clock fields into UTC fields', () => {
        const date = new Date(2023, 5, 15, 14, 30, 45) // Jun 15, 2023 14:30:45 local
        const shifted = shiftToUTC(date)

        expect(shifted.getUTCFullYear()).toBe(2023)
        expect(shifted.getUTCMonth()).toBe(5)
        expect(shifted.getUTCDate()).toBe(15)
        expect(shifted.getUTCHours()).toBe(14)
        expect(shifted.getUTCMinutes()).toBe(30)
        expect(shifted.getUTCSeconds()).toBe(45)
    })

    it('handles the end of the year', () => {
        const date = new Date(2023, 11, 31, 23, 59, 59)
        const shifted = shiftToUTC(date)

        expect(shifted.getUTCFullYear()).toBe(2023)
        expect(shifted.getUTCMonth()).toBe(11)
        expect(shifted.getUTCDate()).toBe(31)
        expect(shifted.getUTCHours()).toBe(23)
        expect(shifted.getUTCMinutes()).toBe(59)
    })
})

describe('shiftToLocal', () => {
    it('copies the UTC fields into local wall-clock fields', () => {
        const date = new Date(Date.UTC(2023, 5, 15, 14, 30, 45))
        const shifted = shiftToLocal(date)

        expect(shifted.getFullYear()).toBe(2023)
        expect(shifted.getMonth()).toBe(5)
        expect(shifted.getDate()).toBe(15)
        expect(shifted.getHours()).toBe(14)
        expect(shifted.getMinutes()).toBe(30)
        expect(shifted.getSeconds()).toBe(45)
    })

    it('is the inverse of shiftToUTC', () => {
        const dates = [
            new Date(2023, 0, 1, 0, 0, 0),
            new Date(2023, 5, 15, 14, 30, 45),
            new Date(2023, 11, 31, 23, 59, 59),
            new Date(2024, 1, 29, 12, 0, 0), // leap day
        ]

        for (const date of dates) {
            expect(shiftToLocal(shiftToUTC(date)).getTime()).toBe(
                date.getTime(),
            )
            expect(shiftToUTC(shiftToLocal(date)).getTime()).toBe(
                date.getTime(),
            )
        }
    })
})
