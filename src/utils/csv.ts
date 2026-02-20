import * as FileSystem from 'expo-file-system/legacy'
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

        const documentDirectory = FileSystem.documentDirectory

        if (!documentDirectory) {
            throw new Error('FileSystem.documentDirectory is null')
        }

        const fileUri = documentDirectory + fileName

        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
            encoding: 'utf8',
        })

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri)
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
        const content = await FileSystem.readAsStringAsync(fileUri)

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
