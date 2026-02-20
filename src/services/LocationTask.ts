import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { addEvent, getTodayEvents } from '../db/database'
import { getFormattedTime, getFormattedDate } from '../utils/time'

export const LOCATION_TASK_NAME = 'background-geofence-task'

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: () =>
        Promise.resolve({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
})

interface GeofencingData {
    eventType: Location.GeofencingEventType
}

const processGeofenceEntry = async (
    dateStr: string,
    timeStr: string,
    isCheckedIn: boolean,
) => {
    console.log('Entered geofence')

    if (isCheckedIn) {
        console.log('Already checked in, skipping auto check-in')
        return
    }

    try {
        addEvent(dateStr, timeStr, 'Auto check-in geofence')

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Auto check-in',
                body: `Checked in at ${timeStr}`,
            },
            trigger: null,
        })
    } catch (err) {
        console.error('Failed to auto check-in:', err)
    }
}

const processGeofenceExit = async (
    dateStr: string,
    timeStr: string,
    isCheckedIn: boolean,
) => {
    console.log('Exited geofence')

    if (!isCheckedIn) {
        console.log('Already checked out, skipping auto check-out')
        return
    }

    try {
        addEvent(dateStr, timeStr, 'Auto check-out geofence')

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Auto check-out',
                body: `Checked out at ${timeStr}`,
            },
            trigger: null,
        })
    } catch (err) {
        console.error('Failed to auto check-out:', err)
    }
}

const handleGeofenceEvent = async (data: unknown) => {
    const taskData = data as GeofencingData
    const eventType = taskData.eventType
    const now = new Date()
    const dateStr = getFormattedDate(now)
    const timeStr = getFormattedTime(now)

    const todayEvents = getTodayEvents(dateStr)
    const isCheckedIn = todayEvents.length % 2 !== 0

    if (eventType === Location.GeofencingEventType.Enter) {
        await processGeofenceEntry(dateStr, timeStr, isCheckedIn)
    } else {
        await processGeofenceExit(dateStr, timeStr, isCheckedIn)
    }
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error)
        return
    }
    if (data) {
        await handleGeofenceEvent(data)
    }
})
