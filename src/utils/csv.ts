import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import Papa from 'papaparse'
import {
    getAllEvents,
    getWorkHoursHistory,
    importEvents,
    importWorkHours,
} from '../db/database'
import { TimeEvent } from '../types'
import { WorkHoursEntry } from './workHours'
import { getFormattedDate } from './time'

export type CSVResult = {
    success: boolean
    message?: string
    count?: number
    workHoursCount?: number
}

// Marker row starting the work-hours section. Its rows are single-column
// ('YYYY-MM-DD=minutes') on purpose: importers of app versions without this
// feature parse them as rows lacking a Time field and skip them.
const WORK_HOURS_SECTION = '[WorkHours]'
const WORK_HOURS_LINE_PATTERN = /^(\d{4}-\d{2}-\d{2})=(\d+)$/

export const exportToCSV = async (): Promise<CSVResult> => {
    try {
        const events = getAllEvents()

        // Explicit fields so the header row is emitted even without events —
        // the import relies on it to parse the file (and the section marker).
        let csvContent = Papa.unparse({
            fields: ['Date', 'Time', 'Note', 'IsManualEntry'],
            data: events.map((event) => [
                event.date,
                event.time,
                event.note || '',
                event.isManualEntry ? 'true' : 'false',
            ]),
        })

        const workHours = getWorkHoursHistory()
        if (workHours.length > 0) {
            const workHoursContent = workHours
                .map(
                    (entry) =>
                        `${entry.effectiveDate}=${String(entry.dailyMinutes)}`,
                )
                .join('\r\n')
            csvContent += `\r\n\r\n${WORK_HOURS_SECTION}\r\n${workHoursContent}`
        }

        const fileName = `time_tracking_export_${getFormattedDate(new Date())}.csv`

        const file = new File(Paths.document, fileName)

        file.create({ overwrite: true })
        file.write(csvContent)

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri)
            return { success: true }
        } else {
            return {
                success: false,
                message: 'Sharing is not available on this device',
            }
        }
    } catch (error) {
        console.error('Error exporting CSV:', error)
        return { success: false, message: 'Failed to export CSV' }
    }
}

export const importFromCSV = async (): Promise<CSVResult> => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: [
                'text/csv',
                'text/comma-separated-values',
                'application/csv',
            ],
            copyToCacheDirectory: true,
        })

        if (result.canceled) {
            return { success: false, message: 'Cancelled' }
        }

        const fileUri = result.assets[0].uri
        const file = new File(fileUri)
        const content = await file.text()

        type CSVRow = {
            Date?: string
            Time?: string
            Note?: string
            IsManualEntry?: string
        }

        const parsed = Papa.parse<CSVRow>(content, {
            header: true,
            skipEmptyLines: true,
        })

        const eventsToImport: Omit<TimeEvent, 'id'>[] = []
        const workHoursToImport: WorkHoursEntry[] = []

        // Rows are events until the [WorkHours] marker row. Papa respects CSV
        // quoting, so the marker inside a note can never start the section.
        let inWorkHoursSection = false

        parsed.data.forEach((row) => {
            if (!inWorkHoursSection && row.Date === WORK_HOURS_SECTION) {
                inWorkHoursSection = true
                return
            }

            if (inWorkHoursSection) {
                const match = row.Date
                    ? WORK_HOURS_LINE_PATTERN.exec(row.Date)
                    : null
                if (match) {
                    const dailyMinutes = Number(match[2])
                    if (dailyMinutes > 0 && dailyMinutes < 24 * 60) {
                        workHoursToImport.push({
                            effectiveDate: match[1],
                            dailyMinutes,
                        })
                    }
                }
                return
            }

            if (row.Date && row.Time) {
                eventsToImport.push({
                    date: row.Date,
                    time: row.Time,
                    note: row.Note ?? null,
                    isManualEntry: row.IsManualEntry === 'true',
                })
            }
        })

        if (eventsToImport.length === 0 && workHoursToImport.length === 0) {
            return {
                success: false,
                message: 'No importable data found in CSV.',
            }
        }
        if (eventsToImport.length > 0) {
            importEvents(eventsToImport)
        }
        if (workHoursToImport.length > 0) {
            importWorkHours(workHoursToImport)
        }
        return {
            success: true,
            count: eventsToImport.length,
            workHoursCount: workHoursToImport.length,
        }
    } catch (error) {
        console.error('Error importing CSV:', error)
        return { success: false, message: 'Failed to import CSV' }
    }
}
