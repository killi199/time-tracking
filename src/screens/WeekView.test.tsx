import { render, screen } from '@testing-library/react-native'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import WeekView from './WeekView'
import {
    getEventsRange,
    getOverallStats,
    getWorkHoursHistory,
} from '../db/database'
import { getFormattedDate } from '../utils/time'
import { PaperProvider } from 'react-native-paper'

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
    const { View } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return {
        __esModule: true,
        default: (props: {
            testID?: string
            children?: React.ReactNode
            renderLeftActions?: () => React.ReactNode
            renderRightActions?: () => React.ReactNode
        }) => (
            <View testID={props.testID}>
                {props.renderLeftActions ? props.renderLeftActions() : null}
                {props.children}
                {props.renderRightActions ? props.renderRightActions() : null}
            </View>
        ),
        SwipeDirection: { LEFT: 'left', RIGHT: 'right' },
    }
})

jest.mock('../db/database', () => ({
    getEventsRange: jest.fn(),
    getOverallStats: jest.fn(),
    getWorkHoursHistory: jest.fn(),
    getSetting: jest.fn(),
}))

const renderWithProvider = (ui: React.ReactElement) =>
    render(<PaperProvider>{ui}</PaperProvider>)

describe('WeekView', () => {
    const mockDate = getFormattedDate(new Date())

    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(getEventsRange).mockReturnValue([])
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: 120, // 2 hours
            totalMinutesWorked: 0,
        })
        jest.mocked(getWorkHoursHistory).mockReturnValue([
            { effectiveDate: '2000-01-01', dailyMinutes: 480 },
        ])
    })

    it('renders metrics and handles empty state correctly', async () => {
        await renderWithProvider(
            <WeekView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        expect(screen.getByText('home.week')).toBeVisible()
        expect(screen.getByText('00:00')).toBeVisible() // empty week worked
        expect(screen.getByText('home.weekBalance')).toBeVisible()
        expect(screen.getByText('home.overall')).toBeVisible()
        expect(screen.getByText('+02:00')).toBeVisible() // overall balance

        // Empty state is rendered
        expect(screen.getByTestId('week-empty-state')).toBeVisible()
        expect(screen.getByText('emptyState.weekTitle')).toBeVisible()
        expect(screen.getByText('emptyState.weekDescription')).toBeVisible()
    })

    it('calculates statistics correctly with multiple events', async () => {
        // Mock events for today: 09:00 to 17:30 (8h 30m)
        jest.mocked(getEventsRange).mockReturnValue([
            {
                id: 1,
                date: mockDate,
                time: '09:00',
                note: null,
                isManualEntry: false,
            },
            {
                id: 2,
                date: mockDate,
                time: '17:30',
                note: null,
                isManualEntry: false,
            },
        ])

        await renderWithProvider(
            <WeekView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        // 8h 30m = 08:30 worked
        expect(screen.getByText('08:30')).toBeVisible()

        // Target is 8h (from work history mock). Balance = +00:30
        expect(screen.getByText('+00:30')).toBeVisible()

        // Overall is 120m base + 30m week diff?
        // Wait, getOverallStats provides overallBalanceMinutes=120.
        // calculateMetrics adds active session diff to it, but there is no active session (even number of events).
        // So overall should be 120m = +02:00
        expect(screen.getByText('+02:00')).toBeVisible()
    })

    it('renders event list items correctly', async () => {
        jest.mocked(getEventsRange).mockReturnValue([
            {
                id: 1,
                date: mockDate,
                time: '09:00',
                note: 'Morning work',
                isManualEntry: false,
            },
        ])

        await renderWithProvider(
            <WeekView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        expect(screen.getByTestId('event-item-1')).toBeVisible()
        expect(screen.getByText('Morning work')).toBeVisible()
    })

    it('queries events with Jalali range and formats subheader in Jalali when calendar is jalali with Saturday start', async () => {
        // 2026-11-11 is Wednesday. Week starting on Saturday runs from 2026-11-07 to 2026-11-13.
        jest.mocked(getEventsRange).mockReturnValue([
            {
                id: 1,
                date: '2026-11-11',
                time: '09:00',
                note: 'Jalali week work',
                isManualEntry: false,
            },
        ])

        await renderWithProvider(
            <WeekView
                date="2026-11-11"
                calendar="jalali"
                firstDayOfWeek="saturday"
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        // Verifies range query matches week with Saturday start
        expect(getEventsRange).toHaveBeenCalledWith('2026-11-07', '2026-11-13')

        // Verifies event item rendered
        expect(screen.getByTestId('event-item-1')).toBeVisible()

        // Verifies subheader formatted in Jalali calendar
        expect(screen.getByText(/20 Aban 1405/)).toBeVisible()
    })

    it('queries events with custom Sunday start when firstDayOfWeek is sunday', async () => {
        // 2026-11-11 is Wednesday. In Gregorian with Sunday start, week runs from 2026-11-08 to 2026-11-14.
        jest.mocked(getEventsRange).mockReturnValue([
            {
                id: 2,
                date: '2026-11-11',
                time: '10:00',
                note: 'Sunday start work',
                isManualEntry: false,
            },
        ])

        await renderWithProvider(
            <WeekView
                date="2026-11-11"
                calendar="gregorian"
                firstDayOfWeek="sunday"
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        // Verifies range query matches week with Sunday start
        expect(getEventsRange).toHaveBeenCalledWith('2026-11-08', '2026-11-14')

        // Verifies event item rendered
        expect(screen.getByTestId('event-item-2')).toBeVisible()

        // Verifies subheader formatted in Gregorian
        expect(screen.getByText(/2026/)).toBeVisible()
    })

    it('handles missing refreshTrigger gracefully', async () => {
        const { toJSON } = await render(
            <WeekView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={-1}
            />,
        )
        expect(toJSON()).toBeNull()
    })
})
