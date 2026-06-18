import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import Papa from 'papaparse'
import { getAllEvents, importEvents } from '../db/database'
import { TimeEvent } from '../types'
import { getFormattedDate } from './time'

export type CSVResult = {
    success: boolean
    message?: string
    count?: number
}

export const exportToCSV = async (): Promise<CSVResult> => {
    try {
        const events = getAllEvents()

        const data = events.map((event) => ({
            Date: event.date,
            Time: event.time,
            Note: event.note || '',
            IsManualEntry: event.isManualEntry ? 'true' : 'false',
        }))

        const csvContent = Papa.unparse(data)

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

        if (eventsToImport.length > 0) {
            importEvents(eventsToImport)
            return { success: true, count: eventsToImport.length }
        } else {
            return { success: false, message: 'No valid events found in CSV.' }
        }
    } catch (error) {
        console.error('Error importing CSV:', error)
        return { success: false, message: 'Failed to import CSV' }
    }
}
