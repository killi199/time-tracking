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
}

const WORK_HOURS_SECTION = '[WorkHours]'

export const exportToCSV = async (): Promise<CSVResult> => {
    try {
        const events = getAllEvents()

        const data = events.map((event) => ({
            Date: event.date,
            Time: event.time,
            Note: event.note || '',
            IsManualEntry: event.isManualEntry ? 'true' : 'false',
        }))

        let csvContent = Papa.unparse(data)

        const workHours = getWorkHoursHistory()
        if (workHours.length > 0) {
            const workHoursContent = Papa.unparse(
                workHours.map((entry) => ({
                    EffectiveDate: entry.effectiveDate,
                    DailyMinutes: entry.dailyMinutes,
                })),
            )
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

        // Split off the optional work-hours section (see exportToCSV)
        let eventsContent = content
        let workHoursContent: string | null = null
        const sectionIndex = content.indexOf(WORK_HOURS_SECTION)
        if (sectionIndex !== -1) {
            eventsContent = content.slice(0, sectionIndex)
            workHoursContent = content.slice(
                sectionIndex + WORK_HOURS_SECTION.length,
            )
        }

        const parsed = Papa.parse<CSVRow>(eventsContent, {
            header: true,
            skipEmptyLines: true,
        })

        const eventsToImport: Omit<TimeEvent, 'id'>[] = []

        parsed.data.forEach((row) => {
            if (row.Date && row.Time) {
                eventsToImport.push({
                    date: row.Date,
                    time: row.Time,
                    note: row.Note ?? null,
                    isManualEntry: row.IsManualEntry === 'true',
                })
            }
        })

        const workHoursToImport: WorkHoursEntry[] = []

        if (workHoursContent) {
            type WorkHoursRow = {
                EffectiveDate?: string
                DailyMinutes?: string
            }

            const parsedWorkHours = Papa.parse<WorkHoursRow>(
                workHoursContent.trim(),
                {
                    header: true,
                    skipEmptyLines: true,
                },
            )

            parsedWorkHours.data.forEach((row) => {
                const dailyMinutes = Number(row.DailyMinutes)
                if (
                    row.EffectiveDate &&
                    /^\d{4}-\d{2}-\d{2}$/.test(row.EffectiveDate) &&
                    Number.isInteger(dailyMinutes) &&
                    dailyMinutes > 0 &&
                    dailyMinutes < 24 * 60
                ) {
                    workHoursToImport.push({
                        effectiveDate: row.EffectiveDate,
                        dailyMinutes,
                    })
                }
            })
        }

        if (eventsToImport.length > 0 || workHoursToImport.length > 0) {
            if (eventsToImport.length > 0) {
                importEvents(eventsToImport)
            }
            if (workHoursToImport.length > 0) {
                importWorkHours(workHoursToImport)
            }
            return { success: true, count: eventsToImport.length }
        } else {
            return { success: false, message: 'No valid events found in CSV.' }
        }
    } catch (error) {
        console.error('Error importing CSV:', error)
        return { success: false, message: 'Failed to import CSV' }
    }
}
