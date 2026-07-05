/* eslint-disable @typescript-eslint/unbound-method --
 * `expect(mock)` / `vi.mocked(mock)` never call the reference with `this`,
 * so passing mocked methods unbound is safe here. */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import i18n from 'i18next'
import * as Localization from 'expo-localization'
import { getSetting } from '../db/database'
import initI18n from './i18n'

vi.mock('i18next', () => {
    const i18next = {
        use: vi.fn(),
        init: vi.fn().mockResolvedValue(undefined),
    }
    i18next.use.mockReturnValue(i18next)
    return { default: i18next }
})

vi.mock('react-i18next', () => ({
    initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

vi.mock('expo-localization', () => ({
    getLocales: vi.fn(),
}))

vi.mock('../db/database', () => ({
    getSetting: vi.fn(),
}))

const setDeviceLanguage = (languageCode: string | null) => {
    vi.mocked(Localization.getLocales).mockReturnValue([
        { languageCode } as Localization.Locale,
    ])
}

const initializedLanguage = () => {
    const options = vi.mocked(i18n.init).mock.calls[0][0]
    return options.lng
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(i18n.use).mockReturnValue(i18n)
    vi.mocked(getSetting).mockReturnValue(null)
    setDeviceLanguage('en')
})

describe('initI18n', () => {
    it('uses a saved language setting', async () => {
        vi.mocked(getSetting).mockReturnValue('de')
        setDeviceLanguage('en')

        await initI18n()

        expect(getSetting).toHaveBeenCalledWith('language')
        expect(initializedLanguage()).toBe('de')
    })

    it('prefers the saved language over the device locale', async () => {
        vi.mocked(getSetting).mockReturnValue('en')
        setDeviceLanguage('de')

        await initI18n()

        expect(initializedLanguage()).toBe('en')
    })

    it('uses the device locale when the setting is auto', async () => {
        vi.mocked(getSetting).mockReturnValue('auto')
        setDeviceLanguage('de')

        await initI18n()

        expect(initializedLanguage()).toBe('de')
    })

    it('uses the device locale when no setting is stored', async () => {
        setDeviceLanguage('de')

        await initI18n()

        expect(initializedLanguage()).toBe('de')
    })

    it('falls back to English for unsupported device locales', async () => {
        setDeviceLanguage('fr')

        await initI18n()

        expect(initializedLanguage()).toBe('en')
    })

    it('falls back to English when the device locale is unknown', async () => {
        setDeviceLanguage(null)

        await initI18n()

        expect(initializedLanguage()).toBe('en')
    })

    it('falls back to English when reading the setting fails', async () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        vi.mocked(getSetting).mockImplementation(() => {
            throw new Error('db locked')
        })

        await initI18n()

        expect(initializedLanguage()).toBe('en')
        expect(errorSpy).toHaveBeenCalled()
    })

    it('initializes with the react-i18next plugin and an English fallback', async () => {
        await initI18n()

        expect(i18n.use).toHaveBeenCalledOnce()
        expect(i18n.init).toHaveBeenCalledWith(
            expect.objectContaining({
                fallbackLng: 'en',
                resources: expect.objectContaining({
                    en: expect.anything() as unknown,
                    de: expect.anything() as unknown,
                }) as unknown,
            }),
        )
    })
})
