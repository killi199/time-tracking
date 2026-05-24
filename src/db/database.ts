import * as SQLite from 'expo-sqlite'
import { TimeEvent } from '../types'
import { parseLocalTime } from '../utils/time'

const db = SQLite.openDatabaseSync('time_tracking.db')

export const initDatabase = (): void => {
    // Get the current database version
    const versionResult = db.getAllSync<{ user_version: number }>('PRAGMA user_version;')
    const currentVersion = versionResult.length > 0 ? versionResult[0].user_version : 0

    const targetVersion = 2

    if (currentVersion === 0) {
        // Fresh install: Create schema with final target structure
        db.execSync(`
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                note TEXT,
                isManualEntry INTEGER DEFAULT 0,
                timestamp TEXT
            );
        `)

        db.execSync(`
            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT
            );
        `)

        db.execSync(`PRAGMA user_version = ${targetVersion};`)
    } else {
        // Existing install: Perform migration steps sequentially
        if (currentVersion < 2) {
            db.execSync('ALTER TABLE events ADD COLUMN timestamp TEXT;')
            db.execSync('PRAGMA user_version = 2;')
        }
    }
}

export const getSetting = (key: string): string | null => {
    const result = db.getAllSync<{ value: string }>(
        'SELECT value FROM settings WHERE key = $key',
        {
            $key: key,
        },
    )
    return result.length > 0 ? result[0].value : null
}

export const setSetting = (key: string, value: string): void => {
    const statement = db.prepareSync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES ($key, $value)',
    )
    try {
        statement.executeSync({ $key: key, $value: value })
    } finally {
        statement.finalizeSync()
    }
}

/**
 * Adds a new event to the database.
 *
 * @param date - Date string in YYYY-MM-DD format. Use `getFormattedDate()` helper.
 * @param time - Time string in HH:MM format. Use `getFormattedTime()` helper.
 * @param note - Optional note for the event.
 * @returns The ID of the inserted event.
 */
export const addEvent = (
    date: string,
    time: string,
    note: string | null,
    isManualEntry: boolean = false,
    timestamp?: string,
): number => {
    const finalTimestamp = timestamp ?? (isManualEntry ? parseLocalTime(date, time).toISOString() : new Date().toISOString())
    const statement = db.prepareSync(
        'INSERT INTO events (date, time, note, isManualEntry, timestamp) VALUES ($date, $time, $note, $isManualEntry, $timestamp)',
    )
    try {
        const result = statement.executeSync({
            $date: date,
            $time: time,
            $note: note,
            $isManualEntry: isManualEntry ? 1 : 0,
            $timestamp: finalTimestamp,
        })
        return result.lastInsertRowId
    } finally {
        statement.finalizeSync()
    }
}

export const updateEvent = (
    id: number,
    date: string,
    time: string,
    note: string | null,
    isManualEntry: boolean = false,
    timestamp?: string,
): void => {
    const finalTimestamp = timestamp ?? parseLocalTime(date, time).toISOString()
    const statement = db.prepareSync(
        'UPDATE events SET date = $date, time = $time, note = $note, isManualEntry = $isManualEntry, timestamp = $timestamp WHERE id = $id',
    )
    try {
        statement.executeSync({
            $date: date,
            $time: time,
            $note: note,
            $isManualEntry: isManualEntry ? 1 : 0,
            $timestamp: finalTimestamp,
            $id: id,
        })
    } finally {
        statement.finalizeSync()
    }
}

export const deleteEvent = (id: number): void => {
    const statement = db.prepareSync('DELETE FROM events WHERE id = $id')
    try {
        statement.executeSync({ $id: id })
    } finally {
        statement.finalizeSync()
    }
}

export const getTodayEvents = (date: string): TimeEvent[] => {
    return db.getAllSync<TimeEvent>(
        'SELECT * FROM events WHERE date = $date ORDER BY time ASC',
        { $date: date },
    )
}

export const getMonthEvents = (month: string): TimeEvent[] => {
    // month format: 'YYYY-MM'
    return db.getAllSync<TimeEvent>(
        'SELECT * FROM events WHERE date LIKE $month || "%" ORDER BY date ASC, time ASC',
        { $month: month },
    )
}

export const getEventsRange = (
    startDate: string,
    endDate: string,
): TimeEvent[] => {
    return db.getAllSync<TimeEvent>(
        'SELECT * FROM events WHERE date >= $startDate AND date <= $endDate ORDER BY date ASC, time ASC',
        { $startDate: startDate, $endDate: endDate },
    )
}

export const getAllEvents = (): TimeEvent[] => {
    return db.getAllSync<TimeEvent>(
        'SELECT * FROM events ORDER BY date DESC, time DESC',
    )
}

export const getOverallStats = (
    cutoffDate?: string,
): {
    totalMinutesWorked: number
    overallBalanceMinutes: number
} => {
    let query = 'SELECT * FROM events'
    const params: Record<string, string | number | null> = {}

    if (cutoffDate) {
        query += ' WHERE date <= $cutoffDate'
        params.$cutoffDate = cutoffDate
    }

    query += ' ORDER BY date ASC, time ASC'

    const events = db.getAllSync<TimeEvent>(query, params)

    let totalMinutesWorked = 0
    const workedDays = new Set<string>()

    // Group events by date
    const eventsByDate: { [key: string]: TimeEvent[] } = {}
    events.forEach((event) => {
        if (!Object.prototype.hasOwnProperty.call(eventsByDate, event.date)) {
            eventsByDate[event.date] = []
        }
        eventsByDate[event.date].push(event)
    })

    Object.keys(eventsByDate).forEach((date) => {
        const dayEvents = eventsByDate[date]
        // Sort just in case
        dayEvents.sort((a, b) => a.time.localeCompare(b.time))

        let dayMinutes = 0
        for (let i = 0; i < dayEvents.length; i += 2) {
            if (i + 1 < dayEvents.length) {
                const start = dayEvents[i].timestamp
                    ? new Date(dayEvents[i].timestamp!)
                    : parseLocalTime(date, dayEvents[i].time)
                const end = dayEvents[i + 1].timestamp
                    ? new Date(dayEvents[i + 1].timestamp!)
                    : parseLocalTime(date, dayEvents[i + 1].time)
                const diff = (end.getTime() - start.getTime()) / 1000 / 60
                dayMinutes += diff
            }
        }

        if (dayEvents.length > 0) {
            totalMinutesWorked += dayMinutes
            workedDays.add(date)
        }
    })

    // Calculate expected minutes (8 hours per worked day)
    const expectedMinutes = workedDays.size * 8 * 60
    const overallBalanceMinutes = totalMinutesWorked - expectedMinutes

    return {
        totalMinutesWorked,
        overallBalanceMinutes,
    }
}

export const importEvents = (events: Omit<TimeEvent, 'id'>[]): void => {
    const insertStatement = db.prepareSync(
        'INSERT INTO events (date, time, note, isManualEntry, timestamp) VALUES ($date, $time, $note, $isManualEntry, $timestamp)',
    )

    try {
        db.withTransactionSync(() => {
            // Optional: Clear existing events?
            // For now, we append. User might want to clear, but append is safer.
            // Or maybe we should check for duplicates?
            // Let's just append for now as requested "import this file again".

            events.forEach((event) => {
                const finalTimestamp = event.timestamp ?? parseLocalTime(event.date, event.time).toISOString()
                insertStatement.executeSync({
                    $date: event.date,
                    $time: event.time,
                    $note: event.note || null,
                    $isManualEntry: event.isManualEntry ? 1 : 0,
                    $timestamp: finalTimestamp,
                })
            })
        })
    } finally {
        insertStatement.finalizeSync()
    }
}

/**
 * Checks if the user is currently checked in globally (i.e. total number of events is odd).
 */
export const isCurrentlyCheckedIn = (): boolean => {
    const result = db.getAllSync<{ count: number }>('SELECT COUNT(*) as count FROM events')
    return result.length > 0 && result[0].count % 2 !== 0
}

