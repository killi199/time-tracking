import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Run the real SQL against an in-memory node:sqlite database.
jest.mock('expo-sqlite', () => jest.requireActual('../test/expoSqliteAdapter'))

type DatabaseModule = typeof import('./database')

let db: DatabaseModule

beforeEach(() => {
    // The database handle is a module-level singleton; re-requiring the
    // module gives every test a fresh in-memory database. (jest.requireActual
    // instead of a dynamic import, which jest's CJS runtime cannot execute.)
    jest.resetModules()
    db = jest.requireActual<DatabaseModule>('./database')
    db.initDatabase()
})

const addPair = (date: string, start: string, end: string) => {
    db.addEvent(date, start, null)
    db.addEvent(date, end, null)
}

describe('initDatabase', () => {
    it('can be called multiple times', () => {
        expect(() => {
            db.initDatabase()
        }).not.toThrow()
    })
})

describe('settings', () => {
    it('returns null for an unset key', () => {
        expect(db.getSetting('language')).toBeNull()
    })

    it('stores and retrieves a value', () => {
        db.setSetting('language', 'de')
        expect(db.getSetting('language')).toBe('de')
    })

    it('replaces the value on repeated set', () => {
        db.setSetting('language', 'de')
        db.setSetting('language', 'en')
        expect(db.getSetting('language')).toBe('en')
    })
})

describe('addEvent / updateEvent / deleteEvent', () => {
    it('returns incrementing row ids', () => {
        const first = db.addEvent('2024-01-15', '09:00', null)
        const second = db.addEvent('2024-01-15', '17:00', null)
        expect(second).toBe(first + 1)
    })

    it('persists all fields', () => {
        db.addEvent('2024-01-15', '09:00', 'Morning shift', true)
        db.addEvent('2024-01-15', '17:00', null)

        const events = db.getTodayEvents('2024-01-15')
        expect(events).toHaveLength(2)
        expect(events[0]).toMatchObject({
            date: '2024-01-15',
            time: '09:00',
            note: 'Morning shift',
            isManualEntry: 1,
        })
        expect(events[1]).toMatchObject({
            time: '17:00',
            note: null,
            isManualEntry: 0,
        })
    })

    it('updates only the event with the given id', () => {
        const id = db.addEvent('2024-01-15', '09:00', null)
        db.addEvent('2024-01-15', '17:00', null)

        db.updateEvent(id, '2024-01-16', '09:30', 'Corrected', true)

        const updated = db.getTodayEvents('2024-01-16')
        expect(updated).toHaveLength(1)
        expect(updated[0]).toMatchObject({
            id,
            time: '09:30',
            note: 'Corrected',
            isManualEntry: 1,
        })
        expect(db.getTodayEvents('2024-01-15')).toHaveLength(1)
    })

    it('deletes only the event with the given id', () => {
        const id = db.addEvent('2024-01-15', '09:00', null)
        db.addEvent('2024-01-15', '17:00', null)

        db.deleteEvent(id)

        const remaining = db.getTodayEvents('2024-01-15')
        expect(remaining).toHaveLength(1)
        expect(remaining[0].time).toBe('17:00')
    })
})

describe('event queries', () => {
    it('getTodayEvents returns only the given date ordered by time', () => {
        db.addEvent('2024-01-15', '17:00', null)
        db.addEvent('2024-01-15', '09:00', null)
        db.addEvent('2024-01-16', '10:00', null)

        const events = db.getTodayEvents('2024-01-15')
        expect(events.map((event) => event.time)).toEqual(['09:00', '17:00'])
    })

    it('getMonthEvents filters by month prefix and orders by date and time', () => {
        db.addEvent('2024-01-20', '09:00', null)
        db.addEvent('2024-01-05', '17:00', null)
        db.addEvent('2024-01-05', '09:00', null)
        db.addEvent('2024-11-05', '09:00', null) // must not match '2024-01'
        db.addEvent('2023-12-31', '09:00', null)

        const events = db.getMonthEvents('2024-01')
        expect(events.map((event) => `${event.date} ${event.time}`)).toEqual([
            '2024-01-05 09:00',
            '2024-01-05 17:00',
            '2024-01-20 09:00',
        ])
    })

    it('getEventsRange includes both boundary dates', () => {
        db.addEvent('2024-01-14', '09:00', null)
        db.addEvent('2024-01-15', '09:00', null)
        db.addEvent('2024-01-17', '09:00', null)
        db.addEvent('2024-01-18', '09:00', null)

        const events = db.getEventsRange('2024-01-15', '2024-01-17')
        expect(events.map((event) => event.date)).toEqual([
            '2024-01-15',
            '2024-01-17',
        ])
    })

    it('getAllEvents orders by date and time descending', () => {
        db.addEvent('2024-01-15', '09:00', null)
        db.addEvent('2024-01-16', '09:00', null)
        db.addEvent('2024-01-15', '17:00', null)

        const events = db.getAllEvents()
        expect(events.map((event) => `${event.date} ${event.time}`)).toEqual([
            '2024-01-16 09:00',
            '2024-01-15 17:00',
            '2024-01-15 09:00',
        ])
    })
})

describe('importEvents', () => {
    it('appends without clearing existing events', () => {
        db.addEvent('2024-01-15', '09:00', null)

        db.importEvents([
            {
                date: '2024-01-16',
                time: '10:00',
                note: 'Imported',
                isManualEntry: true,
            },
        ])

        const events = db.getAllEvents()
        expect(events).toHaveLength(2)
        expect(events[0]).toMatchObject({
            date: '2024-01-16',
            note: 'Imported',
            isManualEntry: 1,
        })
    })

    it('normalizes an empty-string note to null', () => {
        db.importEvents([
            {
                date: '2024-01-15',
                time: '09:00',
                note: '',
                isManualEntry: false,
            },
        ])

        expect(db.getAllEvents()[0].note).toBeNull()
    })
})

describe('work hours', () => {
    it('imports entries and replaces those with the same effective date', () => {
        db.importWorkHours([
            { effectiveDate: '2024-01-01', dailyMinutes: 480 },
            { effectiveDate: '2024-06-01', dailyMinutes: 420 },
        ])
        db.importWorkHours([{ effectiveDate: '2024-06-01', dailyMinutes: 360 }])

        expect(db.getWorkHoursHistory()).toEqual([
            { effectiveDate: '2024-01-01', dailyMinutes: 480 },
            { effectiveDate: '2024-06-01', dailyMinutes: 360 },
        ])
    })

    it('returns the history sorted by effective date ascending', () => {
        db.importWorkHours([
            { effectiveDate: '2024-06-01', dailyMinutes: 420 },
            { effectiveDate: '2024-01-01', dailyMinutes: 480 },
        ])

        expect(
            db.getWorkHoursHistory().map((entry) => entry.effectiveDate),
        ).toEqual(['2024-01-01', '2024-06-01'])
    })

    it('setDailyTargetMinutes upserts the entry for the given date', () => {
        db.setDailyTargetMinutes(420, '2024-01-01')
        db.setDailyTargetMinutes(360, '2024-01-01')

        expect(db.getWorkHoursHistory()).toEqual([
            { effectiveDate: '2024-01-01', dailyMinutes: 360 },
        ])
    })

    it('getDailyTargetMinutes falls back to the default without history', () => {
        expect(db.getDailyTargetMinutes('2024-01-15')).toBe(480)
    })

    it('getDailyTargetMinutes resolves the latest entry effective on or before the date', () => {
        db.importWorkHours([
            { effectiveDate: '2024-01-01', dailyMinutes: 420 },
            { effectiveDate: '2024-06-01', dailyMinutes: 360 },
        ])

        expect(db.getDailyTargetMinutes('2023-12-31')).toBe(480)
        expect(db.getDailyTargetMinutes('2024-01-01')).toBe(420)
        expect(db.getDailyTargetMinutes('2024-05-31')).toBe(420)
        expect(db.getDailyTargetMinutes('2024-06-01')).toBe(360)
    })
})

describe('getOverallStats', () => {
    it('returns zeros for an empty database', () => {
        expect(db.getOverallStats()).toEqual({
            totalMinutesWorked: 0,
            overallBalanceMinutes: 0,
        })
    })

    it('computes the minutes of a single check-in/check-out pair', () => {
        addPair('2024-01-15', '09:00', '17:00')

        expect(db.getOverallStats()).toEqual({
            totalMinutesWorked: 480,
            overallBalanceMinutes: 0, // 480 worked - 480 default target
        })
    })

    it('sums multiple pairs on one day excluding the pause', () => {
        addPair('2024-01-15', '09:00', '12:00')
        addPair('2024-01-15', '13:00', '17:00')

        expect(db.getOverallStats()).toEqual({
            totalMinutesWorked: 420, // 180 + 240, pause not counted
            overallBalanceMinutes: -60,
        })
    })

    it('ignores an odd trailing event but still counts the day against the target', () => {
        addPair('2024-01-15', '09:00', '12:00')
        db.addEvent('2024-01-15', '13:00', null) // still checked in

        expect(db.getOverallStats()).toEqual({
            totalMinutesWorked: 180,
            overallBalanceMinutes: -300,
        })
    })

    it('only counts events up to the cutoff date', () => {
        addPair('2024-01-15', '09:00', '17:00')
        addPair('2024-01-16', '09:00', '17:00')

        expect(db.getOverallStats('2024-01-15')).toEqual({
            totalMinutesWorked: 480,
            overallBalanceMinutes: 0,
        })
    })

    it('uses an explicitly passed work-hours history over the stored one', () => {
        db.importWorkHours([{ effectiveDate: '2024-01-01', dailyMinutes: 480 }])
        addPair('2024-01-15', '09:00', '17:00')

        const stats = db.getOverallStats(undefined, [
            { effectiveDate: '2024-01-01', dailyMinutes: 240 },
        ])
        expect(stats).toEqual({
            totalMinutesWorked: 480,
            overallBalanceMinutes: 240,
        })
    })

    it('applies effective-dated targets per worked day', () => {
        // Default target (480) applies on the 15th, reduced target from the 16th.
        db.importWorkHours([{ effectiveDate: '2024-01-16', dailyMinutes: 240 }])
        addPair('2024-01-15', '09:00', '17:00') // 480 worked vs 480 target
        addPair('2024-01-16', '09:00', '17:00') // 480 worked vs 240 target

        expect(db.getOverallStats()).toEqual({
            totalMinutesWorked: 960,
            overallBalanceMinutes: 240,
        })
    })
})
