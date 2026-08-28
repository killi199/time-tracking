import { render, screen, userEvent } from '@testing-library/react-native'
import { describe, it, expect, jest } from '@jest/globals'
import { PaperProvider } from 'react-native-paper'
import { EmptyState } from './EmptyState'

const renderWithProvider = async (ui: React.ReactElement) =>
    await render(<PaperProvider>{ui}</PaperProvider>)

describe('EmptyState', () => {
    it('renders title and icon correctly', async () => {
        await renderWithProvider(
            <EmptyState
                icon="calendar-today"
                title="No events today"
                testID="empty-state-test"
            />,
        )

        expect(screen.getByTestId('empty-state-test')).toBeVisible()
        expect(screen.getByText('No events today')).toBeVisible()
        expect(screen.queryByText('Description')).toBeNull()
    })

    it('renders description when provided', async () => {
        await renderWithProvider(
            <EmptyState
                icon="calendar-week"
                title="No events this week"
                description="Check in to start tracking."
            />,
        )

        expect(screen.getByText('No events this week')).toBeVisible()
        expect(screen.getByText('Check in to start tracking.')).toBeVisible()
    })

    it('renders action button and triggers onPress', async () => {
        const onActionPress = jest.fn()
        await renderWithProvider(
            <EmptyState
                icon="calendar-today"
                title="No events"
                action={{
                    label: 'Check In',
                    onPress: onActionPress,
                    icon: 'play',
                    testID: 'empty-state-action',
                }}
            />,
        )

        const button = screen.getByTestId('empty-state-action')
        expect(button).toBeVisible()
        expect(screen.getByText('Check In')).toBeVisible()

        const user = userEvent.setup()
        await user.press(button)
        expect(onActionPress).toHaveBeenCalledTimes(1)
    })
})
