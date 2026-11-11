import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import CalendarSettingsScreen from './CalendarSettingsScreen'
import { getSetting, setSetting } from '../../db/database'
import { PaperProvider } from 'react-native-paper'

jest.mock('../../db/database', () => ({
    getSetting: jest.fn(),
    setSetting: jest.fn(),
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
    })

    it('defaults to gregorian if setting is not saved', async () => {
        ;(getSetting as jest.Mock).mockReturnValue(null)

        await render(
            <PaperProvider>
                <CalendarSettingsScreen />
            </PaperProvider>,
        )

        expect(getSetting).toHaveBeenCalledWith('calendar_system')
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
