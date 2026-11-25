import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import MonthStartSettingsScreen from './MonthStartSettingsScreen'
import { getSetting, setSetting } from '../../db/database'

jest.mock('../../db/database', () => ({
    getSetting: jest.fn(),
    setSetting: jest.fn(),
    subscribeSettings: jest.fn(() => () => {}),
}))

describe('MonthStartSettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getSetting as jest.Mock).mockReturnValue('1')
    })

    it('renders note and day options from 1 to 28', async () => {
        await render(
            <PaperProvider>
                <MonthStartSettingsScreen />
            </PaperProvider>,
        )

        expect(screen.getByText('settings.monthStartDayNote')).toBeVisible()
        expect(screen.getByText('settings.monthStartDayDefault')).toBeVisible()
        expect(screen.getByText('2')).toBeVisible()
        expect(screen.getByText('10')).toBeVisible()
    })

    it('loads saved setting on mount', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('5')

        await render(
            <PaperProvider>
                <MonthStartSettingsScreen />
            </PaperProvider>,
        )

        expect(getSetting).toHaveBeenCalledWith('month_start_day')
        const radios = screen.getAllByRole('radio')
        expect(radios[4]).toBeChecked()
        expect(radios[0]).not.toBeChecked()
    })

    it('defaults to 1 if setting is not saved or invalid', async () => {
        ;(getSetting as jest.Mock).mockReturnValue(null)

        const { rerender } = await render(
            <PaperProvider>
                <MonthStartSettingsScreen />
            </PaperProvider>,
        )

        let radios = screen.getAllByRole('radio')
        expect(radios[0]).toBeChecked()

        ;(getSetting as jest.Mock).mockReturnValue('31')
        await rerender(
            <PaperProvider>
                <MonthStartSettingsScreen />
            </PaperProvider>,
        )

        radios = screen.getAllByRole('radio')
        expect(radios[0]).toBeChecked()
    })

    it('changes month start day and saves setting', async () => {
        await render(
            <PaperProvider>
                <MonthStartSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('7'))

        expect(setSetting).toHaveBeenCalledWith('month_start_day', '7')
    })

    it('changes month start day back to default 1', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('5')

        await render(
            <PaperProvider>
                <MonthStartSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.monthStartDayDefault'))

        expect(setSetting).toHaveBeenCalledWith('month_start_day', '1')
    })
})
