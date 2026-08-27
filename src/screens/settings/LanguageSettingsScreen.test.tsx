import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import LanguageSettingsScreen from './LanguageSettingsScreen'
import { getSetting, setSetting } from '../../db/database'
import i18n from 'i18next'
import * as Localization from 'expo-localization'
import { PaperProvider } from 'react-native-paper'

jest.mock('../../db/database', () => ({
    getSetting: jest.fn(),
    setSetting: jest.fn(),
}))

jest.mock('expo-localization', () => ({
    getLocales: jest.fn(),
}))

describe('LanguageSettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(Localization.getLocales as jest.Mock).mockReturnValue([
            { languageCode: 'en' },
        ])
        ;(getSetting as jest.Mock).mockReturnValue('auto')
    })

    it('renders all language options correctly', async () => {
        await render(
            <PaperProvider>
                <LanguageSettingsScreen />
            </PaperProvider>,
        )

        expect(screen.getByText('settings.auto')).toBeVisible()
        expect(screen.getByText('settings.english')).toBeVisible()
        expect(screen.getByText('settings.german')).toBeVisible()
    })

    it('loads the saved language setting on mount', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('de')

        await render(
            <PaperProvider>
                <LanguageSettingsScreen />
            </PaperProvider>,
        )

        // Since we are mocking getSetting, we can check if it was called
        expect(getSetting).toHaveBeenCalledWith('language')
    })

    it('changes language to English and saves setting', async () => {
        await render(
            <PaperProvider>
                <LanguageSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.english'))

        expect(setSetting).toHaveBeenCalledWith('language', 'en')
        expect(i18n.changeLanguage).toHaveBeenCalledWith('en')
    })

    it('changes language to German and saves setting', async () => {
        await render(
            <PaperProvider>
                <LanguageSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.german'))

        expect(setSetting).toHaveBeenCalledWith('language', 'de')
        expect(i18n.changeLanguage).toHaveBeenCalledWith('de')
    })

    it('handles auto language selection defaulting to device language', async () => {
        ;(Localization.getLocales as jest.Mock).mockReturnValue([
            { languageCode: 'de' },
        ])

        await render(
            <PaperProvider>
                <LanguageSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.auto'))

        expect(setSetting).toHaveBeenCalledWith('language', 'auto')
        // since device language is 'de', it should change i18n language to 'de'
        expect(i18n.changeLanguage).toHaveBeenCalledWith('de')
    })

    it('handles auto language selection when device language is not German', async () => {
        ;(Localization.getLocales as jest.Mock).mockReturnValue([
            { languageCode: 'fr' },
        ])

        await render(
            <PaperProvider>
                <LanguageSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.auto'))

        expect(setSetting).toHaveBeenCalledWith('language', 'auto')
        // since device language is 'fr' (not 'de'), it should default to 'en'
        expect(i18n.changeLanguage).toHaveBeenCalledWith('en')
    })
})
