/* eslint-disable @typescript-eslint/unbound-method --
 * `expect(mock)` / `vi.mocked(mock)` never call the reference with `this`,
 * so passing mocked methods unbound is safe here. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Linking, ToastAndroid, BackHandler } from 'react-native'
import { getTodayEvents, addEvent } from '../db/database'
import { initNfcService } from './NFCService'
import { TimeEvent } from '../types'

const state = vi.hoisted(() => ({
    urlListener: null as ((event: { url: string }) => void) | null,
    subscription: { remove: vi.fn() },
}))

const platform = vi.hoisted(() => ({ OS: 'android' }))

vi.mock('react-native', () => ({
    Platform: platform,
    ToastAndroid: { show: vi.fn(), SHORT: 0 },
    BackHandler: { exitApp: vi.fn() },
    Linking: {
        getInitialURL: vi.fn(),
        addEventListener: (
            _event: string,
            listener: (event: { url: string }) => void,
        ) => {
            state.urlListener = listener
            return state.subscription
        },
    },
}))

vi.mock('../db/database', () => ({
    getTodayEvents: vi.fn(),
    addEvent: vi.fn(),
}))

vi.mock('i18next', () => ({
    default: { t: (key: string) => key },
}))

const NFC_URL = 'timetracking://nfc'

const makeEvent = (id: number, time: string): TimeEvent => ({
    id,
    date: '2026-07-05',
    time,
    note: null,
})

const initAndFlush = async () => {
    initNfcService()
    // let the getInitialURL promise chain settle
    await vi.advanceTimersByTimeAsync(0)
}

const receiveUrl = (url: string) => {
    if (!state.urlListener) throw new Error('url listener not registered')
    state.urlListener({ url })
}

beforeEach(() => {
    vi.clearAllMocks()
    state.urlListener = null
    platform.OS = 'android'
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 5, 9, 5))
    vi.mocked(getTodayEvents).mockReturnValue([])
    vi.mocked(Linking.getInitialURL).mockResolvedValue(null)
})

afterEach(() => {
    vi.useRealTimers()
})

describe('initNfcService', () => {
    it('checks in when launched with a matching initial url', async () => {
        vi.mocked(Linking.getInitialURL).mockResolvedValue(NFC_URL)

        await initAndFlush()

        expect(addEvent).toHaveBeenCalledWith(
            '2026-07-05',
            '09:05',
            'nfc.checkinEvent',
        )
    })

    it('checks out when the day has an odd number of events', async () => {
        vi.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

        await initAndFlush()
        receiveUrl(NFC_URL)

        expect(addEvent).toHaveBeenCalledWith(
            '2026-07-05',
            '09:05',
            'nfc.checkoutEvent',
        )
    })

    it('handles url events received while running', async () => {
        await initAndFlush()
        receiveUrl(NFC_URL)

        expect(addEvent).toHaveBeenCalledOnce()
        expect(ToastAndroid.show).toHaveBeenCalledWith(
            'nfc.checkedInAt 09:05',
            expect.anything(),
        )
    })

    it('ignores non-matching and null initial urls', async () => {
        await initAndFlush()
        receiveUrl('https://example.com')

        expect(addEvent).not.toHaveBeenCalled()
    })

    it('exits the app 1500 ms after handling a tag', async () => {
        await initAndFlush()
        receiveUrl(NFC_URL)

        vi.advanceTimersByTime(1499)
        expect(BackHandler.exitApp).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(BackHandler.exitApp).toHaveBeenCalledOnce()
    })

    it('does not show a toast on iOS but still exits', async () => {
        platform.OS = 'ios'

        await initAndFlush()
        receiveUrl(NFC_URL)

        expect(ToastAndroid.show).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1500)
        expect(BackHandler.exitApp).toHaveBeenCalledOnce()
    })

    it('catches database errors without scheduling an app exit', async () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        vi.mocked(getTodayEvents).mockImplementation(() => {
            throw new Error('db locked')
        })

        await initAndFlush()
        expect(() => {
            receiveUrl(NFC_URL)
        }).not.toThrow()

        vi.advanceTimersByTime(2000)
        expect(BackHandler.exitApp).not.toHaveBeenCalled()
        expect(errorSpy).toHaveBeenCalled()
    })

    it('returns a cleanup that removes the url listener', async () => {
        const cleanup = initNfcService()
        await vi.advanceTimersByTimeAsync(0)
        cleanup()

        expect(state.subscription.remove).toHaveBeenCalledOnce()
    })
})
