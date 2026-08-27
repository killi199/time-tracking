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
    const RN = jest.requireActual<typeof import('react-native')>('react-native')
    return {
        __esModule: true,
        default: (props: {
            testID?: string
            children?: React.ReactNode
            renderLeftActions?: () => React.ReactNode
            renderRightActions?: () => React.ReactNode
        }) => (
            <RN.View testID={props.testID}>
                {props.renderLeftActions ? props.renderLeftActions() : null}
                {props.children}
                {props.renderRightActions ? props.renderRightActions() : null}
            </RN.View>
        ),
        SwipeDirection: { LEFT: 'left', RIGHT: 'right' },
    }
})

jest.mock('../db/database', () => ({
    getEventsRange: jest.fn(),
    getOverallStats: jest.fn(),
    getWorkHoursHistory: jest.fn(),
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
