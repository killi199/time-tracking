import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import CalendarSettingsScreen from './CalendarSettingsScreen'
import { getSetting, setSetting } from '../../db/database'
import { PaperProvider } from 'react-native-paper'

jest.mock('../../db/database', () => ({
    getSetting: jest.fn(),
    setSetting: jest.fn(),
    subscribeSettings: jest.fn(() => () => {}),
}))

describe('CalendarSettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getSetting as jest.Mock).mockReturnValue('gregorian')
    })

    it('renders all calendar options correctly', async () => {
        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        expect(screen.getByText('settings.auto')).toBeVisible()
        expect(screen.getByText('settings.calendarGregorian')).toBeVisible()
        expect(screen.getByText('settings.calendarJalali')).toBeVisible()
    })

    it('loads saved calendar setting on mount', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('jalali')

        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        expect(getSetting).toHaveBeenCalledWith('calendar_system')
        const radios = screen.getAllByRole('radio')
        expect(radios[2]).toBeChecked()
        expect(radios[0]).not.toBeChecked()
    })

    it('defaults to auto if setting is not saved', async () => {
        ;(getSetting as jest.Mock).mockReturnValue(null)

        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        expect(getSetting).toHaveBeenCalledWith('calendar_system')
        const radios = screen.getAllByRole('radio')
        expect(radios[0]).toBeChecked()
        expect(radios[1]).not.toBeChecked()
        expect(radios[2]).not.toBeChecked()
    })

    it('defaults to auto if setting contains an invalid value', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('invalid-calendar')

        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        expect(getSetting).toHaveBeenCalledWith('calendar_system')
        const radios = screen.getAllByRole('radio')
        expect(radios[0]).toBeChecked()
        expect(radios[1]).not.toBeChecked()
        expect(radios[2]).not.toBeChecked()
    })

    it('changes calendar system to auto and saves setting', async () => {
        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.auto'))

        expect(setSetting).toHaveBeenCalledWith('calendar_system', 'auto')
    })

    it('changes calendar system to Jalali and saves setting', async () => {
        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.calendarJalali'))

        expect(setSetting).toHaveBeenCalledWith('calendar_system', 'jalali')
    })

    it('changes calendar system to Gregorian and saves setting', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('jalali')

        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.calendarGregorian'))

        expect(setSetting).toHaveBeenCalledWith('calendar_system', 'gregorian')
    })
})
