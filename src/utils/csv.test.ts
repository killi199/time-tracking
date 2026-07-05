import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import {
    getAllEvents,
    getWorkHoursHistory,
    importEvents,
    importWorkHours,
} from '../db/database'
import { exportToCSV, importFromCSV } from './csv'
import { TimeEvent } from '../types'

const fileState = vi.hoisted(() => ({
    written: [] as { name: string; content: string }[],
    textContent: '',
    writeError: null as Error | null,
    textError: null as Error | null,
}))

vi.mock('expo-file-system', () => {
    class File {
        readonly name: string

        constructor(...parts: string[]) {
            this.name = parts.join('/')
        }

        get uri() {
            return `file://${this.name}`
        }

        create() {
            // nothing to create in memory
        }

        write(content: string) {
            if (fileState.writeError) throw fileState.writeError
            fileState.written.push({ name: this.name, content })
        }

        text() {
            if (fileState.textError) {
                return Promise.reject(fileState.textError)
            }
            return Promise.resolve(fileState.textContent)
        }
    }

    return { File, Paths: { document: '/documents' } }
})

vi.mock('expo-sharing', () => ({
    isAvailableAsync: vi.fn(),
    shareAsync: vi.fn(),
}))

vi.mock('expo-document-picker', () => ({
    getDocumentAsync: vi.fn(),
}))

vi.mock('../db/database', () => ({
    getAllEvents: vi.fn(),
    getWorkHoursHistory: vi.fn(),
    importEvents: vi.fn(),
    importWorkHours: vi.fn(),
}))

const makeEvent = (overrides: Partial<TimeEvent>): TimeEvent => ({
    id: 1,
    date: '2024-01-15',
    time: '09:00',
    note: null,
    isManualEntry: false,
    ...overrides,
})

const pickFile = (content: string) => {
    fileState.textContent = content
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
        canceled: false,
        assets: [
            {
                uri: 'file:///picked/import.csv',
                name: 'import.csv',
                mimeType: 'text/csv',
                lastModified: 0,
            },
        ],
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    fileState.written = []
    fileState.textContent = ''
    fileState.writeError = null
    fileState.textError = null
    vi.mocked(getAllEvents).mockReturnValue([])
    vi.mocked(getWorkHoursHistory).mockReturnValue([])
    vi.mocked(Sharing.isAvailableAsync).mockResolvedValue(true)
})

afterEach(() => {
    vi.useRealTimers()
})

describe('exportToCSV', () => {
    it('writes the header row even without events and shares the file', async () => {
        const result = await exportToCSV()

        expect(result).toEqual({ success: true })
        expect(fileState.written).toHaveLength(1)
        // papaparse emits a trailing newline when there are no data rows
        expect(fileState.written[0].content).toBe(
            'Date,Time,Note,IsManualEntry\r\n',
        )
        expect(Sharing.shareAsync).toHaveBeenCalledWith(
            `file://${fileState.written[0].name}`,
        )
    })

    it('writes one row per event with true/false manual-entry strings', async () => {
        vi.mocked(getAllEvents).mockReturnValue([
            makeEvent({ note: 'Morning', isManualEntry: true }),
            makeEvent({ id: 2, time: '17:00' }),
        ])

        await exportToCSV()

        expect(fileState.written[0].content).toBe(
            'Date,Time,Note,IsManualEntry\r\n' +
                '2024-01-15,09:00,Morning,true\r\n' +
                '2024-01-15,17:00,,false',
        )
    })

    it('appends the work-hours section when history exists', async () => {
        vi.mocked(getWorkHoursHistory).mockReturnValue([
            { effectiveDate: '2024-01-01', dailyMinutes: 480 },
            { effectiveDate: '2024-06-01', dailyMinutes: 420 },
        ])

        await exportToCSV()

        expect(fileState.written[0].content).toBe(
            'Date,Time,Note,IsManualEntry\r\n' +
                '\r\n\r\n[WorkHours]\r\n' +
                '2024-01-01=480\r\n2024-06-01=420',
        )
    })

    it('omits the work-hours section when the history is empty', async () => {
        await exportToCSV()

        expect(fileState.written[0].content).not.toContain('[WorkHours]')
    })

    it('names the file with the current date', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2024, 0, 15, 12, 0))

        await exportToCSV()

        expect(fileState.written[0].name).toBe(
            '/documents/time_tracking_export_2024-01-15.csv',
        )
    })

    it('reports when sharing is unavailable and does not share', async () => {
        vi.mocked(Sharing.isAvailableAsync).mockResolvedValue(false)

        const result = await exportToCSV()

        expect(result).toEqual({
            success: false,
            message: 'csv.sharingUnavailable',
        })
        expect(Sharing.shareAsync).not.toHaveBeenCalled()
    })

    it('reports a failure when writing throws', async () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        fileState.writeError = new Error('disk full')

        const result = await exportToCSV()

        expect(result).toEqual({ success: false, message: 'csv.exportFailed' })
        expect(errorSpy).toHaveBeenCalled()
    })
})

describe('importFromCSV', () => {
    it('reports cancellation without touching the database', async () => {
        vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
            canceled: true,
            assets: null,
        })

        const result = await importFromCSV()

        expect(result).toEqual({ success: false, cancelled: true })
        expect(importEvents).not.toHaveBeenCalled()
        expect(importWorkHours).not.toHaveBeenCalled()
    })

    it('imports events and maps the manual-entry flag', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '2024-01-15,09:00,Morning,true\r\n' +
                '2024-01-15,17:00,,false',
        )

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 2, workHoursCount: 0 })
        expect(importEvents).toHaveBeenCalledWith([
            {
                date: '2024-01-15',
                time: '09:00',
                note: 'Morning',
                isManualEntry: true,
            },
            {
                date: '2024-01-15',
                time: '17:00',
                note: '',
                isManualEntry: false,
            },
        ])
        expect(importWorkHours).not.toHaveBeenCalled()
    })

    it('maps a missing note column to null', async () => {
        pickFile('Date,Time\r\n2024-01-15,09:00')

        await importFromCSV()

        expect(importEvents).toHaveBeenCalledWith([
            {
                date: '2024-01-15',
                time: '09:00',
                note: null,
                isManualEntry: false,
            },
        ])
    })

    it('skips rows without a time value', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '2024-01-15,,broken,false\r\n' +
                '2024-01-15,09:00,,false',
        )

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 1, workHoursCount: 0 })
    })

    it('parses the work-hours section', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '2024-01-15,09:00,,false\r\n' +
                '[WorkHours]\r\n' +
                '2024-01-01=480\r\n' +
                '2024-06-01=420',
        )

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 1, workHoursCount: 2 })
        expect(importWorkHours).toHaveBeenCalledWith([
            { effectiveDate: '2024-01-01', dailyMinutes: 480 },
            { effectiveDate: '2024-06-01', dailyMinutes: 420 },
        ])
    })

    it('rejects out-of-range daily minutes', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '[WorkHours]\r\n' +
                '2024-01-01=0\r\n' +
                '2024-01-02=1440\r\n' +
                '2024-01-03=1439',
        )

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 0, workHoursCount: 1 })
        expect(importWorkHours).toHaveBeenCalledWith([
            { effectiveDate: '2024-01-03', dailyMinutes: 1439 },
        ])
    })

    it('ignores malformed work-hours lines', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '[WorkHours]\r\n' +
                'not-a-date=480\r\n' +
                '2024-01-01=abc\r\n' +
                '2024-01-01480',
        )

        const result = await importFromCSV()

        expect(result).toEqual({
            success: false,
            message: 'csv.noImportableData',
        })
    })

    it('does not treat the marker inside a quoted note as the section start', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '2024-01-15,09:00,"[WorkHours]",false\r\n' +
                '2024-01-15,17:00,,false',
        )

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 2, workHoursCount: 0 })
        expect(importEvents).toHaveBeenCalledWith([
            expect.objectContaining({ note: '[WorkHours]' }),
            expect.objectContaining({ time: '17:00' }),
        ])
    })

    it('does not import event-shaped rows after the section marker', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '2024-01-15,09:00,,false\r\n' +
                '[WorkHours]\r\n' +
                '2024-01-16,10:00,Sneaky,false',
        )

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 1, workHoursCount: 0 })
        expect(importEvents).toHaveBeenCalledWith([
            expect.objectContaining({ time: '09:00' }),
        ])
    })

    it('reports a header-only file as not importable', async () => {
        pickFile('Date,Time,Note,IsManualEntry')

        const result = await importFromCSV()

        expect(result).toEqual({
            success: false,
            message: 'csv.noImportableData',
        })
        expect(importEvents).not.toHaveBeenCalled()
        expect(importWorkHours).not.toHaveBeenCalled()
    })

    it('only calls the importers that received data', async () => {
        pickFile(
            'Date,Time,Note,IsManualEntry\r\n' +
                '[WorkHours]\r\n' +
                '2024-01-01=480',
        )

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 0, workHoursCount: 1 })
        expect(importEvents).not.toHaveBeenCalled()
        expect(importWorkHours).toHaveBeenCalledOnce()
    })

    it('reports a failure when reading the file throws', async () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        pickFile('irrelevant')
        fileState.textError = new Error('unreadable')

        const result = await importFromCSV()

        expect(result).toEqual({ success: false, message: 'csv.importFailed' })
        expect(errorSpy).toHaveBeenCalled()
    })

    it('round-trips notes with commas, quotes and newlines', async () => {
        const trickyNotes = [
            'has, a comma',
            'has "quotes" inside',
            'spans\nmultiple lines',
        ]
        vi.mocked(getAllEvents).mockReturnValue(
            trickyNotes.map((note, index) =>
                makeEvent({ id: index + 1, note }),
            ),
        )
        vi.mocked(getWorkHoursHistory).mockReturnValue([
            { effectiveDate: '2024-01-01', dailyMinutes: 480 },
        ])

        await exportToCSV()
        pickFile(fileState.written[0].content)

        const result = await importFromCSV()

        expect(result).toEqual({ success: true, count: 3, workHoursCount: 1 })
        expect(importEvents).toHaveBeenCalledWith(
            trickyNotes.map(
                (note) => expect.objectContaining({ note }) as unknown,
            ),
        )
        expect(importWorkHours).toHaveBeenCalledWith([
            { effectiveDate: '2024-01-01', dailyMinutes: 480 },
        ])
    })
})
