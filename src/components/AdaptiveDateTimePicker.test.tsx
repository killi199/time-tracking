import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import { Platform } from 'react-native'
import { PaperProvider } from 'react-native-paper'
import AdaptiveDateTimePicker from './AdaptiveDateTimePicker'
import { shiftToUTC, shiftToLocal } from '../utils/dateShift'

jest.mock('@expo/ui/community/datetime-picker', () => {
    const { View, Text, TouchableOpacity } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return function MockDateTimePicker(props: {
        testID?: string
        value: Date
        mode: string
        display?: string
        locale?: string
        presentation?: string
        maximumDate?: Date
        minimumDate?: Date
        onValueChange?: (event: unknown, date: Date) => void
        onDismiss?: () => void
    }) {
        return (
            <View testID={props.testID ?? 'mock-datetime-picker'}>
                <Text testID="picker-value">{props.value.toISOString()}</Text>
                <Text testID="picker-mode">{props.mode}</Text>
                {props.maximumDate ? (
                    <Text testID="picker-max-date">
                        {props.maximumDate.toISOString()}
                    </Text>
                ) : null}
                {props.minimumDate ? (
                    <Text testID="picker-min-date">
                        {props.minimumDate.toISOString()}
                    </Text>
                ) : null}
                <TouchableOpacity
                    testID="trigger-change"
                    onPress={() => {
                        props.onValueChange?.(
                            {},
                            new Date('2023-10-20T15:45:00.000Z'),
                        )
                    }}
                >
                    <Text>Change Date</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    testID="trigger-dismiss"
                    onPress={() => {
                        props.onDismiss?.()
                    }}
                >
                    <Text>Dismiss</Text>
                </TouchableOpacity>
            </View>
        )
    }
})

jest.mock('../utils/dateShift', () => ({
    shiftToUTC: jest.fn((d: Date) => new Date(d.getTime() + 1000)),
    shiftToLocal: jest.fn((d: Date) => new Date(d.getTime() - 1000)),
}))

describe('AdaptiveDateTimePicker', () => {
    const initialDate = new Date('2023-10-15T10:00:00.000Z')
    const mockOnDismiss = jest.fn()
    const mockOnConfirm = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        Platform.OS = 'android'
    })

    it('renders nothing when visible is false', async () => {
        await render(
            <PaperProvider>
                <AdaptiveDateTimePicker
                    visible={false}
                    onDismiss={mockOnDismiss}
                    onConfirm={mockOnConfirm}
                    value={initialDate}
                    mode="date"
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                />
            </PaperProvider>,
        )

        expect(
            screen.queryByTestId('mock-datetime-picker'),
        ).not.toBeOnTheScreen()
        expect(screen.queryByText('Cancel')).not.toBeOnTheScreen()
        expect(screen.queryByText('Confirm')).not.toBeOnTheScreen()
    })

    describe('iOS platform', () => {
        beforeEach(() => {
            Platform.OS = 'ios'
        })

        it('renders dialog with buttons and picker when visible is true', async () => {
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="time"
                        locale="en-US"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            expect(screen.getByTestId('mock-datetime-picker')).toBeVisible()
            expect(screen.getByText('Cancel')).toBeVisible()
            expect(screen.getByText('Confirm')).toBeVisible()
            expect(screen.getByTestId('picker-mode')).toHaveTextContent('time')
        })

        it('calls onDismiss when cancel button is pressed', async () => {
            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            await user.press(screen.getByText('Cancel'))
            expect(mockOnDismiss).toHaveBeenCalledTimes(1)
            expect(mockOnConfirm).not.toHaveBeenCalled()
        })

        it('calls onConfirm with the initial value when confirm is pressed without changes', async () => {
            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            await user.press(screen.getByText('Confirm'))
            expect(mockOnConfirm).toHaveBeenCalledWith(initialDate)
        })

        it('updates temp date when picker changes and confirms with updated date', async () => {
            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            await user.press(screen.getByTestId('trigger-change'))
            await user.press(screen.getByText('Confirm'))

            expect(mockOnConfirm).toHaveBeenCalledWith(
                new Date('2023-10-20T15:45:00.000Z'),
            )
        })

        it('resets tempDate when visible prop transitions from false to true', async () => {
            const user = userEvent.setup()
            const newDate = new Date('2023-12-01T08:00:00.000Z')

            const { rerender } = await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={false}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            await rerender(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={newDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            await user.press(screen.getByText('Confirm'))
            expect(mockOnConfirm).toHaveBeenCalledWith(newDate)
        })

        it('handles visible prop transitioning from true to false', async () => {
            const { rerender } = await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            expect(screen.getByTestId('mock-datetime-picker')).toBeVisible()

            await rerender(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={false}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            expect(
                screen.queryByTestId('mock-datetime-picker'),
            ).not.toBeOnTheScreen()
        })

        it('clamps confirmed date to maximumDate and minimumDate on iOS', async () => {
            const user = userEvent.setup()
            const maxDate = new Date('2023-10-18T00:00:00.000Z')
            const { unmount } = await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        maximumDate={maxDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            // Mock trigger-change emits 2023-10-20, which exceeds maxDate 2023-10-18
            await user.press(screen.getByTestId('trigger-change'))
            await user.press(screen.getByText('Confirm'))

            expect(mockOnConfirm).toHaveBeenCalledWith(maxDate)
            mockOnConfirm.mockClear()
            await unmount()

            // Test minimumDate clamp
            const minDate = new Date('2023-10-25T00:00:00.000Z')
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        minimumDate={minDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            // Mock trigger-change emits 2023-10-20, which is below minDate 2023-10-25
            await user.press(screen.getByTestId('trigger-change'))
            await user.press(screen.getByText('Confirm'))

            expect(mockOnConfirm).toHaveBeenCalledWith(minDate)
        })
    })

    describe('Android platform', () => {
        beforeEach(() => {
            Platform.OS = 'android'
        })

        it('passes maximumDate and minimumDate directly without UTC shifting on Android', async () => {
            const maxDate = new Date('2023-10-25T00:00:00.000Z')
            const minDate = new Date('2023-10-01T00:00:00.000Z')
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        maximumDate={maxDate}
                        minimumDate={minDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            expect(shiftToUTC).not.toHaveBeenCalledWith(maxDate)
            expect(shiftToUTC).not.toHaveBeenCalledWith(minDate)
            expect(screen.getByTestId('picker-max-date')).toHaveTextContent(
                maxDate.toISOString(),
            )
            expect(screen.getByTestId('picker-min-date')).toHaveTextContent(
                minDate.toISOString(),
            )
        })

        it('preserves late-evening maximumDate without shifting into next day on Android', async () => {
            const lateEveningDate = new Date(2026, 7, 28, 22, 56, 55)
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        maximumDate={lateEveningDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            expect(shiftToUTC).not.toHaveBeenCalledWith(lateEveningDate)
            expect(screen.getByTestId('picker-max-date')).toHaveTextContent(
                lateEveningDate.toISOString(),
            )
        })

        it('shifts date to UTC and shifts back to local on confirm in date mode', async () => {
            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            expect(shiftToUTC).toHaveBeenCalledWith(initialDate)
            await user.press(screen.getByTestId('trigger-change'))

            expect(shiftToLocal).toHaveBeenCalledWith(
                new Date('2023-10-20T15:45:00.000Z'),
            )
            expect(mockOnConfirm).toHaveBeenCalledWith(
                new Date('2023-10-20T15:44:59.000Z'), // -1000ms mock shiftToLocal
            )
        })

        it('passes value directly and confirms without shifting in time mode', async () => {
            const user = userEvent.setup()
            const maxDate = new Date('2023-10-25T18:00:00.000Z')
            const minDate = new Date('2023-10-25T08:00:00.000Z')
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        maximumDate={maxDate}
                        minimumDate={minDate}
                        mode="time"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            expect(shiftToUTC).not.toHaveBeenCalled()
            expect(screen.getByTestId('picker-max-date')).toBeVisible()
            expect(screen.getByTestId('picker-min-date')).toBeVisible()
            await user.press(screen.getByTestId('trigger-change'))

            expect(shiftToLocal).not.toHaveBeenCalled()
            expect(mockOnConfirm).toHaveBeenCalledWith(
                new Date('2023-10-20T15:45:00.000Z'),
            )
        })

        it('calls onDismiss when dismissed on Android', async () => {
            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <AdaptiveDateTimePicker
                        visible={true}
                        onDismiss={mockOnDismiss}
                        onConfirm={mockOnConfirm}
                        value={initialDate}
                        mode="date"
                        cancelLabel="Cancel"
                        confirmLabel="Confirm"
                    />
                </PaperProvider>,
            )

            await user.press(screen.getByTestId('trigger-dismiss'))
            expect(mockOnDismiss).toHaveBeenCalledTimes(1)
        })
    })
})
