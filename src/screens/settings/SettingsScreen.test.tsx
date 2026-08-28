import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import SettingsScreen from './SettingsScreen'
import { useRouter } from 'expo-router'
import { getDailyTargetMinutes, setDailyTargetMinutes } from '../../db/database'
import { getFormattedDate } from '../../utils/time'
import { PaperProvider } from 'react-native-paper'

jest.mock('expo-router', () => ({
    useRouter: jest.fn(),
}))

jest.mock('../../db/database', () => ({
    getDailyTargetMinutes: jest.fn(),
    setDailyTargetMinutes: jest.fn(),
}))

jest.mock('../../utils/time', () => ({
    getFormattedDate: jest.fn(),
}))

jest.mock('../../components/AdaptiveDateTimePicker', () => {
    return function MockAdaptiveDateTimePicker(props: {
        visible?: boolean
        onConfirm?: (date: Date) => void
        onDismiss?: () => void
    }) {
        const { View, Button } =
            jest.requireActual<typeof import('react-native')>('react-native')

        if (!props.visible) return null
        return (
            <View testID="mock-date-picker">
                <Button
                    testID="mock-date-picker-confirm"
                    title="Confirm"
                    onPress={() =>
                        props.onConfirm?.(new Date(2000, 0, 1, 8, 30))
                    }
                />
                <Button
                    testID="mock-date-picker-confirm-zero"
                    title="Confirm Zero"
                    onPress={() =>
                        props.onConfirm?.(new Date(2000, 0, 1, 0, 0))
                    }
                />
                <Button
                    testID="mock-date-picker-cancel"
                    title="Cancel"
                    onPress={() => props.onDismiss?.()}
                />
            </View>
        )
    }
})

describe('SettingsScreen', () => {
    const mockRouter = {
        push: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(useRouter).mockReturnValue(
            mockRouter as unknown as ReturnType<typeof useRouter>,
        )
        jest.mocked(getFormattedDate).mockReturnValue('2023-01-01')
        jest.mocked(getDailyTargetMinutes).mockReturnValue(480) // 8 hours
    })

    it('renders correctly with default work hours', async () => {
        await render(
            <PaperProvider>
                <SettingsScreen />
            </PaperProvider>,
        )

        expect(screen.getByText('settings.language')).toBeVisible()
        expect(screen.getByText('settings.workHours')).toBeVisible()
        expect(screen.getByText('8 h 0 min')).toBeVisible()
    })

    it('navigates to language settings on press', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <SettingsScreen />
            </PaperProvider>,
        )

        await user.press(screen.getByText('settings.language'))
        expect(mockRouter.push).toHaveBeenCalledWith('/language-settings')
    })

    it('opens time picker and updates work hours on confirm', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <SettingsScreen />
            </PaperProvider>,
        )

        // Time picker shouldn't be visible initially
        expect(screen.queryByTestId('mock-date-picker')).not.toBeOnTheScreen()

        // Open the time picker
        await user.press(screen.getByText('settings.workHours'))
        expect(await screen.findByTestId('mock-date-picker')).toBeOnTheScreen()

        // Confirm new time (8h 30m = 510 minutes, from our mock)
        await user.press(screen.getByTestId('mock-date-picker-confirm'))

        expect(setDailyTargetMinutes).toHaveBeenCalledWith(510, '2023-01-01')
        expect(await screen.findByText('8 h 30 min')).toBeOnTheScreen()
        expect(
            screen.getByText('settings.workHoursEffectiveNote'),
        ).toBeOnTheScreen() // Snackbar text

        // Time picker should close
        expect(screen.queryByTestId('mock-date-picker')).not.toBeOnTheScreen()
    })

    it('shows error snackbar and does not update DB if 0 minutes selected', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <SettingsScreen />
            </PaperProvider>,
        )

        // Open the time picker
        await user.press(screen.getByText('settings.workHours'))

        // Confirm 0 time
        await user.press(screen.getByTestId('mock-date-picker-confirm-zero'))

        expect(setDailyTargetMinutes).not.toHaveBeenCalled()
        expect(
            await screen.findByText('settings.workHoursInvalid'),
        ).toBeOnTheScreen() // Error snackbar

        // Time picker should close
        expect(screen.queryByTestId('mock-date-picker')).not.toBeOnTheScreen()
    })

    it('dismisses time picker on cancel', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <SettingsScreen />
            </PaperProvider>,
        )

        // Open the time picker
        await user.press(screen.getByText('settings.workHours'))
        expect(await screen.findByTestId('mock-date-picker')).toBeOnTheScreen()

        // Cancel
        await user.press(screen.getByTestId('mock-date-picker-cancel'))

        expect(setDailyTargetMinutes).not.toHaveBeenCalled()
        expect(screen.queryByTestId('mock-date-picker')).not.toBeOnTheScreen()
    })
})
