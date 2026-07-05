/* eslint-disable @typescript-eslint/unbound-method --
 * `expect(mock)` / `vi.mocked(mock)` never call the reference with `this`,
 * so passing mocked methods unbound is safe here. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as QuickActions from 'expo-quick-actions'
import { ToastAndroid } from 'react-native'
import { getTodayEvents, addEvent } from '../db/database'
import { initQuickActions } from './QuickActionService'
import { TimeEvent } from '../types'

const state = vi.hoisted(() => ({
    initial: null as { id: string } | null,
    listener: null as ((action: { id: string } | null) => void) | null,
    subscription: { remove: vi.fn() },
}))

const platform = vi.hoisted(() => ({ OS: 'android' }))

vi.mock('expo-quick-actions', () => ({
    get initial() {
        return state.initial
    },
    setItems: vi.fn(),
    addListener: (listener: (action: { id: string } | null) => void) => {
        state.listener = listener
        return state.subscription
    },
}))

vi.mock('react-native', () => ({
    Platform: platform,
    ToastAndroid: { show: vi.fn(), SHORT: 0 },
}))

vi.mock('../db/database', () => ({
    getTodayEvents: vi.fn(),
    addEvent: vi.fn(),
}))

vi.mock('i18next', () => ({
    default: { t: (key: string) => key },
}))

const makeEvent = (id: number, time: string): TimeEvent => ({
    id,
    date: '2026-07-05',
    time,
    note: null,
})

const trigger = (action: { id: string } | null) => {
    if (!state.listener) throw new Error('listener not registered')
    state.listener(action)
}

const toggleAction = { id: 'toggle_status' }

beforeEach(() => {
    vi.clearAllMocks()
    state.initial = null
    state.listener = null
    platform.OS = 'android'
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 5, 9, 5))
    vi.mocked(getTodayEvents).mockReturnValue([])
})

afterEach(() => {
    vi.useRealTimers()
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
        state.initial = { id: 'toggle_status' }

        initQuickActions()

        expect(addEvent).toHaveBeenCalledOnce()
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
        vi.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

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
        platform.OS = 'ios'

        initQuickActions()
        trigger(toggleAction)

        expect(addEvent).toHaveBeenCalledOnce()
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

        expect(state.subscription.remove).toHaveBeenCalledOnce()
    })

    it('catches database errors without throwing', () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        vi.mocked(getTodayEvents).mockImplementation(() => {
            throw new Error('db locked')
        })

        initQuickActions()
        expect(() => {
            trigger(toggleAction)
        }).not.toThrow()
        expect(errorSpy).toHaveBeenCalled()
    })
})
