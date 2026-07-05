import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    jest,
} from '@jest/globals'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import { addEvent, getTodayEvents } from '../db/database'
import { LOCATION_TASK_NAME } from './LocationTask'
import { TimeEvent } from '../types'

type TaskBody = { data: unknown; error: unknown }

jest.mock('expo-task-manager', () => ({
    defineTask: jest.fn(),
}))

jest.mock('expo-location', () => ({
    GeofencingEventType: { Enter: 1, Exit: 2 },
}))

jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
}))

jest.mock('../db/database', () => ({
    addEvent: jest.fn(),
    getTodayEvents: jest.fn(),
}))

// Importing ./LocationTask above already registered the task and the
// notification handler; capture both here, before the jest.clearAllMocks()
// in beforeEach wipes the recorded calls.
const [taskName, taskCallback] = jest.mocked(TaskManager.defineTask).mock
    .calls[0] as unknown as [string, (body: TaskBody) => Promise<void> | void]

const notificationHandler = jest.mocked(Notifications.setNotificationHandler)
    .mock.calls[0][0] as unknown as {
    handleNotification: () => Promise<unknown>
}

const ENTER = { eventType: 1 }
const EXIT = { eventType: 2 }

const makeEvent = (id: number, time: string): TimeEvent => ({
    id,
    date: '2026-07-05',
    time,
    note: null,
})

const runTask = async (body: TaskBody) => {
    await taskCallback(body)
}

beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 6, 5, 9, 5))
    jest.mocked(getTodayEvents).mockReturnValue([])
})

afterEach(() => {
    jest.useRealTimers()
})

describe('LocationTask', () => {
    it('registers the geofence task and a notification handler on import', async () => {
        expect(taskName).toBe(LOCATION_TASK_NAME)
        expect(taskCallback).toBeDefined()

        expect(notificationHandler).toBeDefined()
        await expect(
            notificationHandler.handleNotification(),
        ).resolves.toMatchObject({ shouldShowBanner: true })
    })

    it('checks in with a notification when entering while checked out', async () => {
        await runTask({ data: ENTER, error: null })

        expect(addEvent).toHaveBeenCalledWith(
            '2026-07-05',
            '09:05',
            'Auto check-in geofence',
        )
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.objectContaining({
                    body: 'Checked in at 09:05',
                }),
            }),
        )
    })

    it('skips the auto check-in when already checked in', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

        await runTask({ data: ENTER, error: null })

        expect(addEvent).not.toHaveBeenCalled()
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
    })

    it('checks out with a notification when exiting while checked in', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

        await runTask({ data: EXIT, error: null })

        expect(addEvent).toHaveBeenCalledWith(
            '2026-07-05',
            '09:05',
            'Auto check-out geofence',
        )
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.objectContaining({
                    body: 'Checked out at 09:05',
                }),
            }),
        )
    })

    it('skips the auto check-out when already checked out', async () => {
        await runTask({ data: EXIT, error: null })

        expect(addEvent).not.toHaveBeenCalled()
    })

    it('logs task errors without touching the database', async () => {
        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)

        await runTask({ data: ENTER, error: new Error('location failed') })

        expect(errorSpy).toHaveBeenCalled()
        expect(getTodayEvents).not.toHaveBeenCalled()
    })

    it('does nothing without data', async () => {
        await runTask({ data: null, error: null })

        expect(getTodayEvents).not.toHaveBeenCalled()
    })

    it('catches database errors and does not notify', async () => {
        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        jest.mocked(addEvent).mockImplementation(() => {
            throw new Error('db locked')
        })

        await expect(
            runTask({ data: ENTER, error: null }),
        ).resolves.not.toThrow()

        expect(errorSpy).toHaveBeenCalled()
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
    })
})
