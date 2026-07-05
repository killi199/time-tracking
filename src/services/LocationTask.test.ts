import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Notifications from 'expo-notifications'
import { addEvent, getTodayEvents } from '../db/database'
import { LOCATION_TASK_NAME } from './LocationTask'
import { TimeEvent } from '../types'

type TaskBody = { data: unknown; error: unknown }

const state = vi.hoisted(() => ({
    taskName: null as string | null,
    taskCallback: null as ((body: TaskBody) => Promise<void> | void) | null,
    notificationHandler: null as {
        handleNotification: () => Promise<unknown>
    } | null,
}))

vi.mock('expo-task-manager', () => ({
    defineTask: (
        name: string,
        callback: (body: TaskBody) => Promise<void> | void,
    ) => {
        state.taskName = name
        state.taskCallback = callback
    },
}))

vi.mock('expo-location', () => ({
    GeofencingEventType: { Enter: 1, Exit: 2 },
}))

vi.mock('expo-notifications', () => ({
    setNotificationHandler: (handler: {
        handleNotification: () => Promise<unknown>
    }) => {
        state.notificationHandler = handler
    },
    scheduleNotificationAsync: vi.fn(),
}))

vi.mock('../db/database', () => ({
    addEvent: vi.fn(),
    getTodayEvents: vi.fn(),
}))

const ENTER = { eventType: 1 }
const EXIT = { eventType: 2 }

const makeEvent = (id: number, time: string): TimeEvent => ({
    id,
    date: '2026-07-05',
    time,
    note: null,
})

const runTask = async (body: TaskBody) => {
    if (!state.taskCallback) throw new Error('task not registered')
    await state.taskCallback(body)
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 5, 9, 5))
    vi.mocked(getTodayEvents).mockReturnValue([])
})

afterEach(() => {
    vi.useRealTimers()
})

describe('LocationTask', () => {
    it('registers the geofence task and a notification handler on import', async () => {
        expect(state.taskName).toBe(LOCATION_TASK_NAME)
        expect(state.taskCallback).not.toBeNull()

        expect(state.notificationHandler).not.toBeNull()
        await expect(
            state.notificationHandler?.handleNotification(),
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
                }) as unknown,
            }),
        )
    })

    it('skips the auto check-in when already checked in', async () => {
        vi.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

        await runTask({ data: ENTER, error: null })

        expect(addEvent).not.toHaveBeenCalled()
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
    })

    it('checks out with a notification when exiting while checked in', async () => {
        vi.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

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
                }) as unknown,
            }),
        )
    })

    it('skips the auto check-out when already checked out', async () => {
        await runTask({ data: EXIT, error: null })

        expect(addEvent).not.toHaveBeenCalled()
    })

    it('logs task errors without touching the database', async () => {
        const errorSpy = vi
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
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        vi.mocked(addEvent).mockImplementation(() => {
            throw new Error('db locked')
        })

        await expect(
            runTask({ data: ENTER, error: null }),
        ).resolves.not.toThrow()

        expect(errorSpy).toHaveBeenCalled()
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
    })
})
