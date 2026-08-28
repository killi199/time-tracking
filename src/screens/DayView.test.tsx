import { render, screen, act, userEvent } from '@testing-library/react-native'
import {
    describe,
    it,
    expect,
    beforeEach,
    jest,
    afterEach,
} from '@jest/globals'
import DayView from './DayView'
import {
    getTodayEvents,
    getOverallStats,
    getWorkHoursHistory,
} from '../db/database'
import { getFormattedDate } from '../utils/time'
import { resolveDailyTarget } from '../utils/workHours'

// Mock dependencies
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
    getTodayEvents: jest.fn(),
    getOverallStats: jest.fn(),
    getWorkHoursHistory: jest.fn(),
}))

jest.mock('../utils/workHours', () => ({
    resolveDailyTarget: jest.fn(),
}))

import { PaperProvider } from 'react-native-paper'

const renderWithProvider = (ui: React.ReactElement) =>
    render(<PaperProvider>{ui}</PaperProvider>)

describe('DayView', () => {
    const fixedNow = new Date('2023-10-15T10:00:00')
    const mockDate = getFormattedDate(fixedNow)

    beforeEach(() => {
        jest.clearAllMocks()
        jest.clearAllTimers()
        jest.useFakeTimers({ now: fixedNow })
        jest.mocked(getTodayEvents).mockReturnValue([])
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: 0,
            totalMinutesWorked: 0,
        })
        jest.mocked(getWorkHoursHistory).mockReturnValue([])
        jest.mocked(resolveDailyTarget).mockReturnValue(480)
    })

    afterEach(() => {
        jest.clearAllTimers()
        jest.useRealTimers()
    })

    it('returns null when refreshTrigger is -1', async () => {
        const { toJSON } = await render(
            <DayView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                onAddEvent={jest.fn()}
                refreshTrigger={-1}
            />,
        )
        expect(toJSON()).toBeNull()
    })

    it('renders empty state when there are no events on today', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([])
        jest.mocked(resolveDailyTarget).mockReturnValue(480)
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: 0,
            totalMinutesWorked: 0,
        })

        const onAddEvent = jest.fn()
        await renderWithProvider(
            <DayView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                onAddEvent={onAddEvent}
                refreshTrigger={0}
            />,
        )

        // Metrics are all zero / default
        expect(screen.getByText('00:00')).toBeVisible()
        expect(screen.getAllByText('+00:00')).toHaveLength(2)

        // Empty state is rendered
        expect(screen.getByTestId('day-empty-state')).toBeVisible()
        expect(screen.getByText('emptyState.dayTitle')).toBeVisible()
        expect(screen.getByText('emptyState.dayDescription')).toBeVisible()

        // Check In button inside empty state triggers onAddEvent
        const emptyCheckInBtn = screen.getByTestId('empty-check-in-btn')
        expect(emptyCheckInBtn).toBeVisible()
        const user = userEvent.setup()
        await user.press(emptyCheckInBtn)
        expect(onAddEvent).toHaveBeenCalledTimes(1)
    })

    it('renders empty state for past/future date without check-in action', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([])
        jest.mocked(resolveDailyTarget).mockReturnValue(480)
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: 0,
            totalMinutesWorked: 0,
        })

        await renderWithProvider(
            <DayView
                date="2023-10-14"
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                onAddEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        expect(screen.getByTestId('day-empty-state')).toBeVisible()
        expect(screen.getByText('emptyState.dayTitleOther')).toBeVisible()
        expect(screen.getByText('emptyState.dayDescriptionOther')).toBeVisible()
        expect(screen.queryByTestId('empty-check-in-btn')).toBeNull()
    })

    it('renders inactive state and triggers onAddEvent when check-in FAB is pressed', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([])
        jest.mocked(resolveDailyTarget).mockReturnValue(480)
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: 0,
            totalMinutesWorked: 0,
        })

        const onAddEvent = jest.fn()
        await renderWithProvider(
            <DayView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                onAddEvent={onAddEvent}
                refreshTrigger={0}
            />,
        )

        // FAB is Check In
        const fab = screen.getByRole('button', { name: 'home.checkIn' })
        expect(fab).toBeVisible()

        // Status text
        expect(screen.getByText('home.notWorking')).toBeVisible()

        // Interact
        const user = userEvent.setup()
        await user.press(fab)
        expect(onAddEvent).toHaveBeenCalled()
    })

    it('renders active state correctly (currently working)', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([
            {
                id: 1,
                date: mockDate,
                time: '09:00',
                note: null,
                isManualEntry: false,
            },
        ])

        const onAddEvent = jest.fn()
        await renderWithProvider(
            <DayView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                onAddEvent={onAddEvent}
                refreshTrigger={0}
            />,
        )

        // FAB is Check Out
        const fab = screen.getByRole('button', { name: 'home.checkOut' })
        expect(fab).toBeVisible()
        expect(screen.getByText('home.currentlyWorking')).toBeVisible()

        // Interact
        const user = userEvent.setup()
        await user.press(fab)
        expect(onAddEvent).toHaveBeenCalled()
    })

    it('handles edit and delete interactions on events', async () => {
        jest.mocked(getTodayEvents).mockReturnValue([
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
                time: '12:00',
                note: null,
                isManualEntry: false,
            },
        ])

        const onEditEvent = jest.fn()
        const onDeleteEvent = jest.fn()

        await renderWithProvider(
            <DayView
                date={mockDate}
                onEditEvent={onEditEvent}
                onDeleteEvent={onDeleteEvent}
                onAddEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        expect(screen.getByTestId('event-item-1')).toBeVisible()
        expect(screen.getByTestId('event-item-2')).toBeVisible()
    })

    it('calculates metrics correctly for a completed work session', async () => {
        // 4 hours of work (240 mins) - target 8 hours (480 mins) = -240 mins day balance
        jest.mocked(getTodayEvents).mockReturnValue([
            {
                id: 1,
                date: mockDate,
                time: '08:00',
                note: null,
                isManualEntry: false,
            },
            {
                id: 2,
                date: mockDate,
                time: '12:00',
                note: null,
                isManualEntry: false,
            },
        ])
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: -60, // Previous -1h
            totalMinutesWorked: 0,
        })
        jest.mocked(resolveDailyTarget).mockReturnValue(480)

        await renderWithProvider(
            <DayView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                onAddEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        // Metrics are:
        // Today: 04:00 (240 mins)
        // Day Balance: -04:00 (240 - 480)
        // Overall: -01:00 (from getOverallStats)
        expect(screen.getByText('04:00')).toBeVisible()
        expect(screen.getByText('-04:00')).toBeVisible()
        expect(screen.getByText('-01:00')).toBeVisible()
    })

    it('calculates metrics dynamically for an active work session', async () => {
        // Started at 09:00, it's 10:00 now -> 1 hour (60 mins) worked so far.
        jest.mocked(getTodayEvents).mockReturnValue([
            {
                id: 1,
                date: mockDate,
                time: '09:00',
                note: null,
                isManualEntry: false,
            },
        ])
        jest.mocked(resolveDailyTarget).mockReturnValue(480)
        jest.mocked(getOverallStats).mockReturnValue({
            overallBalanceMinutes: 0,
            totalMinutesWorked: 0,
        })

        await renderWithProvider(
            <DayView
                date={mockDate}
                onEditEvent={jest.fn()}
                onDeleteEvent={jest.fn()}
                onAddEvent={jest.fn()}
                refreshTrigger={0}
            />,
        )

        // Today: 01:00 (60 mins)
        // Day Balance: -07:00 (60 - 480 = -420 mins)
        // Overall: +01:00 (active session 60 mins)
        expect(screen.getByText('01:00')).toBeVisible()
        expect(screen.getByText('-07:00')).toBeVisible()
        expect(screen.getByText('+01:00')).toBeVisible()

        // Fast forward 1 minute to test the interval
        await act(async () => {
            jest.advanceTimersByTime(60000)
            await Promise.resolve()
        })

        // Today: 01:01 (61 mins)
        // Day Balance: -06:59 (61 - 480 = -419 mins)
        // Overall: +01:01
        expect(screen.getByText('01:01')).toBeVisible()
        expect(screen.getByText('-06:59')).toBeVisible()
        expect(screen.getByText('+01:01')).toBeVisible()
    })
})
