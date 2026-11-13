import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import WeekStartSettingsScreen from './WeekStartSettingsScreen'
import { getSetting, setSetting } from '../../db/database'
import { PaperProvider } from 'react-native-paper'

jest.mock('../../db/database', () => ({
    getSetting: jest.fn(),
    setSetting: jest.fn(),
}))

describe('WeekStartSettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getSetting as jest.Mock).mockReturnValue('auto')
    })

    it('renders all week start options correctly', async () => {
        await render(
            <PaperProvider>
                <WeekStartSettingsScreen />
            </PaperProvider>,
        )

        expect(screen.getByText('settings.autoFirstDay')).toBeVisible()
        expect(screen.getByText('settings.saturday')).toBeVisible()
        expect(screen.getByText('settings.sunday')).toBeVisible()
        expect(screen.getByText('settings.monday')).toBeVisible()
    })

    it('loads saved setting on mount', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('saturday')

        await render(
            <PaperProvider>
                <WeekStartSettingsScreen />
            </PaperProvider>,
        )

        expect(getSetting).toHaveBeenCalledWith('first_day_of_week')
    })

    it('defaults to auto if setting is not saved', async () => {
        ;(getSetting as jest.Mock).mockReturnValue(null)

        await render(
            <PaperProvider>
                <WeekStartSettingsScreen />
            </PaperProvider>,
        )

        expect(getSetting).toHaveBeenCalledWith('first_day_of_week')
    })

    it.each([
        { text: 'settings.saturday', value: 'saturday' },
        { text: 'settings.sunday', value: 'sunday' },
        { text: 'settings.monday', value: 'monday' },
    ])(
        'changes start day to $value and saves setting',
        async ({ text, value }) => {
            await render(
                <PaperProvider>
                    <WeekStartSettingsScreen />
                </PaperProvider>,
            )

            const user = userEvent.setup()
            await user.press(screen.getByText(text))

            expect(setSetting).toHaveBeenCalledWith('first_day_of_week', value)
        },
    )

    it('changes start day to Auto and saves setting', async () => {
        ;(getSetting as jest.Mock).mockReturnValue('saturday')

        await render(
            <PaperProvider>
                <WeekStartSettingsScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        await user.press(screen.getByText('settings.autoFirstDay'))

        expect(setSetting).toHaveBeenCalledWith('first_day_of_week', 'auto')
    })
})
