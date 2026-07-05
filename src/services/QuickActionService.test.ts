/* eslint-disable @typescript-eslint/unbound-method --
 * `expect(mock)` / `jest.mocked(mock)` never call the reference with `this`,
 * so passing mocked methods unbound is safe here. */
import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    jest,
} from '@jest/globals'
import * as QuickActions from 'expo-quick-actions'
import { Platform, ToastAndroid } from 'react-native'
import { getTodayEvents, addEvent } from '../db/database'
import { initQuickActions } from './QuickActionService'
import { TimeEvent } from '../types'

jest.mock('expo-quick-actions', () => {
    const state = { initial: null as { id: string } | null }
    const subscription = { remove: jest.fn() }
    return {
        get initial() {
            return state.initial
        },
        __setInitial: (action: { id: string } | null) => {
            state.initial = action
        },
        setItems: jest.fn(),
        addListener: jest.fn(() => subscription),
    }
})

jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
    ToastAndroid: { show: jest.fn(), SHORT: 0 },
}))

jest.mock('../db/database', () => ({
    getTodayEvents: jest.fn(),
    addEvent: jest.fn(),
}))

jest.mock('i18next', () => ({
    __esModule: true,
    default: { t: (key: string) => key },
}))

// The factory replaces the read-only `initial` property with a getter and
// exposes this setter for it.
const setInitialAction = (
    QuickActions as unknown as {
        __setInitial: (action: { id: string } | null) => void
    }
).__setInitial

const makeEvent = (id: number, time: string): TimeEvent => ({
    id,
    date: '2026-07-05',
    time,
    note: null,
})

const setPlatformOS = (os: string) => {
    ;(Platform as { OS: string }).OS = os
}

const trigger = (action: { id: string } | null) => {
    const listener = jest
        .mocked(QuickActions.addListener)
        .mock.calls.at(-1)?.[0] as
        ((action: { id: string } | null) => void) | undefined
    if (!listener) throw new Error('listener not registered')
    listener(action)
}

const registeredSubscription = () =>
    jest.mocked(QuickActions.addListener).mock.results[0].value as {
        remove: () => void
    }

const toggleAction = { id: 'toggle_status' }

beforeEach(() => {
    jest.clearAllMocks()
    setInitialAction(null)
    setPlatformOS('android')
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 6, 5, 9, 5))
    jest.mocked(getTodayEvents).mockReturnValue([])
})

afterEach(() => {
    jest.useRealTimers()
})

describe('initQuickActions', () => {
    it('registers the toggle quick-action item', () => {
        initQuickActions()

        expect(QuickActions.setItems).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'toggle_status',
                title: 'quickAction.title',
                icon: 'shortcut_timer',
            }),
        ])
    })

    it('handles a pending initial action', () => {
        setInitialAction({ id: 'toggle_status' })

        initQuickActions()

        expect(addEvent).toHaveBeenCalledTimes(1)
    })

    it('checks in when the day has an even number of events', () => {
        initQuickActions()
        trigger(toggleAction)

        expect(addEvent).toHaveBeenCalledWith(
            '2026-07-05',
            '09:05',
            'quickAction.checkinEvent',
        )
    })

    it('checks out when the day has an odd number of events', () => {
        jest.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

        initQuickActions()
        trigger(toggleAction)

        expect(addEvent).toHaveBeenCalledWith(
            '2026-07-05',
            '09:05',
            'quickAction.checkoutEvent',
        )
    })

    it('shows an Android toast containing the time', () => {
        initQuickActions()
        trigger(toggleAction)

        expect(ToastAndroid.show).toHaveBeenCalledWith(
            'quickAction.checkedInAt 09:05',
            expect.anything(),
        )
    })

    it('does not show a toast on iOS', () => {
        setPlatformOS('ios')

        initQuickActions()
        trigger(toggleAction)

        expect(addEvent).toHaveBeenCalledTimes(1)
        expect(ToastAndroid.show).not.toHaveBeenCalled()
    })

    it('ignores unrelated and null actions', () => {
        initQuickActions()
        trigger({ id: 'something_else' })
        trigger(null)

        expect(addEvent).not.toHaveBeenCalled()
    })

    it('returns a cleanup that removes the listener subscription', () => {
        const cleanup = initQuickActions()
        cleanup()

        expect(registeredSubscription().remove).toHaveBeenCalledTimes(1)
    })

    it('catches database errors without throwing', () => {
        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        jest.mocked(getTodayEvents).mockImplementation(() => {
            throw new Error('db locked')
        })

        initQuickActions()
        expect(() => {
            trigger(toggleAction)
        }).not.toThrow()
        expect(errorSpy).toHaveBeenCalled()
    })
})
