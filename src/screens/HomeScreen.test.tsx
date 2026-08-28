import {
    render,
    screen,
    userEvent,
    act,
    waitFor,
} from '@testing-library/react-native'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import HomeScreen from './HomeScreen'
import { useNavigation } from 'expo-router'
import { addEvent, updateEvent, deleteEvent } from '../db/database'
import { AppState } from 'react-native'
import { PaperProvider } from 'react-native-paper'

const mockSetOptions = jest.fn()

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({ setOptions: mockSetOptions })),
    useFocusEffect: jest.fn(),
}))

jest.mock('react-native-worklets', () => ({
    scheduleOnRN: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) =>
        fn(...args),
}))

jest.mock('react-native-reanimated', () => {
    const { View } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return {
        __esModule: true,
        default: { View },
        SlideInLeft: { duration: jest.fn().mockReturnThis() },
        SlideInRight: { duration: jest.fn().mockReturnThis() },
        FadeIn: { duration: jest.fn().mockReturnThis() },
    }
})

jest.mock('../db/database', () => ({
    addEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
}))

let panEndCallback: ((e: { translationX: number }) => void) | undefined

jest.mock('react-native-gesture-handler', () => {
    return {
        GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
            children,
        GestureDetector: ({
            children,
            gesture,
        }: {
            children: React.ReactNode
            gesture?: { _onEnd?: (e: { translationX: number }) => void }
        }) => {
            if (gesture?._onEnd) {
                panEndCallback = gesture._onEnd
            }
            return children
        },
        Gesture: {
            Pan: () => {
                let onEndCb: ((e: { translationX: number }) => void) | null =
                    null
                const builder: {
                    activeOffsetX: () => typeof builder
                    failOffsetY: () => typeof builder
                    onEnd: (
                        cb: (e: { translationX: number }) => void,
                    ) => typeof builder
                    _onEnd: ((e: { translationX: number }) => void) | null
                } = {
                    activeOffsetX: jest
                        .fn()
                        .mockReturnThis() as () => typeof builder,
                    failOffsetY: jest
                        .fn()
                        .mockReturnThis() as () => typeof builder,
                    onEnd: (cb: (e: { translationX: number }) => void) => {
                        onEndCb = cb
                        builder._onEnd = cb
                        return builder
                    },
                    _onEnd: onEndCb,
                }
                return builder
            },
        },
    }
})

jest.mock('./DayView', () => {
    const { View, Text, TouchableOpacity } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return function MockDayView(props: {
        onEditEvent: (event: import('../types').TimeEvent) => void
        onDeleteEvent: (event: import('../types').TimeEvent) => void
        onAddEvent: () => void
    }) {
        return (
            <View testID="day-view">
                <Text>DayView Component</Text>
                <TouchableOpacity
                    testID="edit-day"
                    onPress={() => {
                        props.onEditEvent({
                            id: 1,
                            date: '2023-10-10',
                            time: '10:00',
                            note: 'test day',
                            isManualEntry: true,
                        })
                    }}
                >
                    <Text>Edit Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    testID="delete-day"
                    onPress={() => {
                        props.onDeleteEvent({
                            id: 1,
                            date: '2023-10-10',
                            time: '10:00',
                            note: 'test day',
                            isManualEntry: false,
                        })
                    }}
                >
                    <Text>Delete Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    testID="add-day"
                    onPress={() => {
                        props.onAddEvent()
                    }}
                >
                    <Text>Add Day</Text>
                </TouchableOpacity>
            </View>
        )
    }
})
jest.mock('./WeekView', () => {
    const { View, Text } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return function MockWeekView() {
        return (
            <View testID="week-view">
                <Text>WeekView Component</Text>
            </View>
        )
    }
})
jest.mock('./MonthView', () => {
    const { View, Text } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return function MockMonthView() {
        return (
            <View testID="month-view">
                <Text>MonthView Component</Text>
            </View>
        )
    }
})

jest.mock('../components/AdaptiveDateTimePicker', () => {
    const { View, Text, TouchableOpacity } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return function MockAdaptiveDateTimePicker(props: {
        mode?: string
        visible?: boolean
        onConfirm: (date: Date) => void
        onDismiss: () => void
    }) {
        const mode = String(props.mode)
        return (
            <View testID={`adaptive-date-time-picker-${mode}`}>
                {props.visible ? (
                    <>
                        <TouchableOpacity
                            testID={`confirm-${mode}`}
                            onPress={() => {
                                props.onConfirm(new Date('2023-10-15T12:30:00'))
                            }}
                        >
                            <Text>Confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            testID={`dismiss-${mode}`}
                            onPress={() => {
                                props.onDismiss()
                            }}
                        >
                            <Text>Dismiss</Text>
                        </TouchableOpacity>
                    </>
                ) : null}
            </View>
        )
    }
})

const renderWithProvider = (ui: React.ReactElement) =>
    render(<PaperProvider>{ui}</PaperProvider>)

describe('HomeScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        panEndCallback = undefined
        jest.mocked(useNavigation).mockReturnValue({
            setOptions: mockSetOptions,
        })
    })

    it('renders DayView and allows adding, editing, and deleting events', async () => {
        const user = userEvent.setup()
        await renderWithProvider(<HomeScreen viewMode="day" />)

        expect(screen.getByText('DayView Component')).toBeVisible()

        // Trigger Add Event directly from DayView mock
        await user.press(screen.getByTestId('add-day'))
        expect(addEvent).toHaveBeenCalled()

        // Trigger Delete
        await user.press(screen.getByTestId('delete-day'))
        expect(screen.getByText('home.deleteEventTitle')).toBeOnTheScreen()
        await user.press(screen.getByText('common.delete'))
        expect(deleteEvent).toHaveBeenCalledWith(1)
        await waitFor(() => {
            expect(
                screen.queryByText('home.deleteEventTitle'),
            ).not.toBeOnTheScreen()
        })

        // Trigger Edit Dialog
        await user.press(screen.getByTestId('edit-day'))
        expect(screen.getByText('addEntry.editTitle')).toBeOnTheScreen()

        // Change Note
        const noteInput = screen.getByDisplayValue('test day')
        await user.clear(noteInput)
        await user.type(noteInput, 'new note updated')

        // Check late entry checkbox and save
        await user.press(screen.getByLabelText('addEntry.lateEntryLabel'))
        await user.press(screen.getByText('common.confirm'))

        // After editing note, it should call updateEvent
        expect(updateEvent).toHaveBeenCalledWith(
            1,
            '2023-10-10',
            '10:00',
            'new note updated',
            false,
        )
    })

    it('handles header right button to open Add Dialog and use date/time pickers', async () => {
        const user = userEvent.setup()
        await renderWithProvider(<HomeScreen viewMode="day" />)

        expect(mockSetOptions).toHaveBeenCalled()
        const options = (
            mockSetOptions.mock.calls[0] as unknown as [
                {
                    headerRight: () => React.ReactElement<{
                        onPress: () => void
                    }>
                },
            ]
        )[0]
        const headerRightElement = options.headerRight()
        // Simulate pressing the header button directly on the element
        await act(() => {
            headerRightElement.props.onPress()
        })

        expect(screen.getByText('addEntry.addTitle')).toBeOnTheScreen()

        // Press the dialog time input touchable to open time picker
        const timeInput = screen.getByDisplayValue(/^\d{2}:\d{2}$/)
        await user.press(timeInput)

        expect(screen.getByTestId('confirm-time')).toBeVisible()
        await user.press(screen.getByTestId('confirm-time'))

        // Press date input touchable to open date picker
        const dateInput = screen.getByDisplayValue(/^(?!\d{2}:\d{2}$).+/)
        await user.press(dateInput)

        expect(screen.getByTestId('confirm-date')).toBeVisible()
        await user.press(screen.getByTestId('confirm-date'))

        await user.press(screen.getByText('common.confirm'))
        expect(addEvent).toHaveBeenCalled()
    })

    it('handles navigating dates and swiping', async () => {
        const user = userEvent.setup()
        await renderWithProvider(<HomeScreen viewMode="day" />)
        const prevButton = screen.getByTestId('prev-date-btn')
        const backToNowButton = screen.getByText('home.backToNow')

        // Go back a day
        await user.press(prevButton)
        // Go back another day
        await user.press(prevButton)

        await user.press(backToNowButton)

        await act(() => {
            if (panEndCallback) {
                panEndCallback({ translationX: 60 }) // swipe right
                panEndCallback({ translationX: -60 }) // swipe left
            }
        })
        expect(screen.getByTestId('day-view')).toBeOnTheScreen()
    })

    it('renders correctly in month view mode', async () => {
        const user = userEvent.setup()
        await renderWithProvider(<HomeScreen viewMode="month" />)
        expect(screen.getByText('MonthView Component')).toBeVisible()
        await user.press(screen.getByTestId('prev-date-btn'))
        expect(screen.getByText('MonthView Component')).toBeVisible()
    })

    it('renders correctly in week view mode', async () => {
        const user = userEvent.setup()
        await renderWithProvider(<HomeScreen viewMode="week" />)
        expect(screen.getByText('WeekView Component')).toBeVisible()
        await user.press(screen.getByTestId('prev-date-btn'))
        expect(screen.getByText('WeekView Component')).toBeVisible()
    })

    it('handles AppState change to update dates when coming from background', async () => {
        await renderWithProvider(<HomeScreen viewMode="day" />)
        // Simulate AppState change
        const changeHandlers = jest
            .mocked(AppState.addEventListener)
            .mock.calls.map((c) => c[1])
        changeHandlers.forEach(
            (
                handler: (state: import('react-native').AppStateStatus) => void,
            ) => {
                handler('active')
            },
        )
        expect(screen.getByTestId('day-view')).toBeOnTheScreen()
    })
})
