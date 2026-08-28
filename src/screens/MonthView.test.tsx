import { render, screen } from '@testing-library/react-native'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import MonthView from './MonthView'
import {
    getMonthEvents,
    getOverallStats,
    getWorkHoursHistory,
} from '../db/database'
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
    getMonthEvents: jest.fn(),
    getOverallStats: jest.fn(),
    getWorkHoursHistory: jest.fn(),
}))

const renderWithProvider = (ui: React.ReactElement) =>
    render(<PaperProvider>{ui}</PaperProvider>)

describe('MonthView', () => {
    const mockMonth = '2023-10'

    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(getMonthEvents).mockReturnValue([])
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: -60, // -1 hour
            totalMinutesWorked: 0,
        })
        jest.mocked(getWorkHoursHistory).mockReturnValue([
            { effectiveDate: '2000-01-01', dailyMinutes: 480 },
        ])
    })

    it('renders metrics and handles empty state correctly', async () => {
        await renderWithProvider(
            <MonthView
                month={mockMonth}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        expect(screen.getByText('home.month')).toBeVisible()
        expect(screen.getByText('00:00')).toBeVisible() // empty month worked
        expect(screen.getByText('home.monthBalance')).toBeVisible()
        expect(screen.getByText('home.overall')).toBeVisible()
        expect(screen.getByText('-01:00')).toBeVisible() // overall balance

        // Empty state is rendered
        expect(screen.getByTestId('month-empty-state')).toBeVisible()
        expect(screen.getByText('emptyState.monthTitle')).toBeVisible()
        expect(screen.getByText('emptyState.monthDescription')).toBeVisible()
    })

    it('calculates statistics correctly with multiple events', async () => {
        // Mock events for Oct 1st: 08:00 to 12:00 (4 hours)
        jest.mocked(getMonthEvents).mockReturnValue([
            {
                id: 1,
                date: '2023-10-01',
                time: '08:00',
                note: null,
                isManualEntry: false,
            },
            {
                id: 2,
                date: '2023-10-01',
                time: '12:00',
                note: null,
                isManualEntry: false,
            },
        ])

        await renderWithProvider(
            <MonthView
                month={mockMonth}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        // 4h worked
        expect(screen.getByText('04:00')).toBeVisible()

        // Target is 8h (from work history mock). Balance = -04:00
        expect(screen.getByText('-04:00')).toBeVisible()

        // Overall is -60m (-01:00) from mock
        expect(screen.getByText('-01:00')).toBeVisible()
    })

    it('renders event list items correctly', async () => {
        jest.mocked(getMonthEvents).mockReturnValue([
            {
                id: 1,
                date: '2023-10-01',
                time: '09:00',
                note: 'Month work session',
                isManualEntry: false,
            },
        ])

        await renderWithProvider(
            <MonthView
                month={mockMonth}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        expect(screen.getByTestId('event-item-1')).toBeVisible()
        expect(screen.getByText('Month work session')).toBeVisible()
    })

    it('handles missing refreshTrigger gracefully', async () => {
        const { toJSON } = await render(
            <MonthView
                month={mockMonth}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                refreshTrigger={-1}
            />,
        )
        expect(toJSON()).toBeNull()
    })
})
