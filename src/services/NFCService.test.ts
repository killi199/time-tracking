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
import { Platform, Linking, ToastAndroid, BackHandler } from 'react-native'
import { getTodayEvents, addEvent } from '../db/database'
import { initNfcService } from './NFCService'
import { TimeEvent } from '../types'

jest.mock('react-native', () => {
    const subscription = { remove: jest.fn() }
    return {
        Platform: { OS: 'android' },
        ToastAndroid: { show: jest.fn(), SHORT: 0 },
        BackHandler: { exitApp: jest.fn() },
        Linking: {
            getInitialURL: jest.fn(),
            addEventListener: jest.fn(() => subscription),
        },
    }
})

jest.mock('../db/database', () => ({
    getTodayEvents: jest.fn(),
    addEvent: jest.fn(),
}))

jest.mock('i18next', () => ({
    __esModule: true,
    default: { t: (key: string) => key },
}))

const NFC_URL = 'timetracking://nfc'

const makeEvent = (id: number, time: string): TimeEvent => ({
    id,
    date: '2026-07-05',
    time,
    note: null,
})

const setPlatformOS = (os: string) => {
    ;(Platform as { OS: string }).OS = os
}

const initAndFlush = async () => {
    initNfcService()
    // let the getInitialURL promise chain settle
    await jest.advanceTimersByTimeAsync(0)
}

const receiveUrl = (url: string) => {
    const listener = jest
        .mocked(Linking.addEventListener)
        .mock.calls.at(-1)?.[1]
    if (!listener) throw new Error('url listener not registered')
    listener({ url })
}

const registeredSubscription = () =>
    jest.mocked(Linking.addEventListener).mock.results[0].value as {
        remove: () => void
    }

beforeEach(() => {
    jest.clearAllMocks()
    setPlatformOS('android')
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 6, 5, 9, 5))
    jest.mocked(getTodayEvents).mockReturnValue([])
    jest.mocked(Linking.getInitialURL).mockResolvedValue(null)
})

afterEach(() => {
    jest.useRealTimers()
})

describe('initNfcService', () => {
    it('checks in when launched with a matching initial url', async () => {
        jest.mocked(Linking.getInitialURL).mockResolvedValue(NFC_URL)

        await initAndFlush()

        expect(addEvent).toHaveBeenCalledWith(
            '2026-07-05',
            '09:05',
            'nfc.checkinEvent',
        )
    })

    it('checks out when the day has an odd number of events', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([makeEvent(1, '08:00')])

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

        expect(addEvent).toHaveBeenCalledTimes(1)
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

        jest.advanceTimersByTime(1499)
        expect(BackHandler.exitApp).not.toHaveBeenCalled()

        jest.advanceTimersByTime(1)
        expect(BackHandler.exitApp).toHaveBeenCalledTimes(1)
    })

    it('does not show a toast on iOS but still exits', async () => {
        setPlatformOS('ios')

        await initAndFlush()
        receiveUrl(NFC_URL)

        expect(ToastAndroid.show).not.toHaveBeenCalled()

        jest.advanceTimersByTime(1500)
        expect(BackHandler.exitApp).toHaveBeenCalledTimes(1)
    })

    it('catches database errors without scheduling an app exit', async () => {
        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        jest.mocked(getTodayEvents).mockImplementation(() => {
            throw new Error('db locked')
        })

        await initAndFlush()
        expect(() => {
            receiveUrl(NFC_URL)
        }).not.toThrow()

        jest.advanceTimersByTime(2000)
        expect(BackHandler.exitApp).not.toHaveBeenCalled()
        expect(errorSpy).toHaveBeenCalled()
    })

    it('returns a cleanup that removes the url listener', async () => {
        const cleanup = initNfcService()
        await jest.advanceTimersByTimeAsync(0)
        cleanup()

        expect(registeredSubscription().remove).toHaveBeenCalledTimes(1)
    })
})
