import { describe, it, expect, jest, afterEach } from '@jest/globals'
import {
    render,
    screen,
    userEvent,
    within,
} from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import JalaliDatePickerDialog from './JalaliDatePickerDialog'

jest.mock('../db/database', () => ({
    getSetting: jest.fn(() => null),
}))

describe('JalaliDatePickerDialog', () => {
    const fixedDate = new Date(2026, 10, 11) // 1405-08-20
    const onConfirmMock = jest.fn()
    const onDismissMock = jest.fn()

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders correctly when visible and displays Jalali month and year', async () => {
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        expect(screen.getAllByText(/Aban 1405/).length).toBeGreaterThan(0)
        expect(screen.getByText('20 Aban 1405')).toBeOnTheScreen()
        expect(screen.getByText('Confirm')).toBeOnTheScreen()
        expect(screen.getByText('Cancel')).toBeOnTheScreen()
    })

    it('returns null when visible is false and updates state when visible changes', async () => {
        const { rerender } = await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={false}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                />
            </PaperProvider>,
        )

        expect(screen.queryByText(/Aban/)).toBeNull()

        // Re-render with visible: true and a different date (e.g. Farvardin)
        const farvardinDate = new Date(2024, 2, 20) // 1403-01-01
        await rerender(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={farvardinDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        expect(screen.getAllByText(/Farvardin 1403/).length).toBeGreaterThan(0)
    })

    it('allows navigating to next and previous months, including across year boundaries', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        // Click next month: Aban -> Azar
        const nextBtn = screen.getByTestId('jalali-picker-next-month')
        await user.press(nextBtn)
        expect(screen.getAllByText(/Azar 1405/).length).toBeGreaterThan(0)

        // Click prev month twice: Azar -> Aban -> Mehr
        const prevBtn = screen.getByTestId('jalali-picker-prev-month')
        await user.press(prevBtn)
        expect(screen.getAllByText(/Aban 1405/).length).toBeGreaterThan(0)
        await user.press(prevBtn)
        expect(screen.getAllByText(/Mehr 1405/).length).toBeGreaterThan(0)
    })

    it('allows navigating across year boundaries (Farvardin to Esfand of previous year and Esfand to Farvardin of next year)', async () => {
        const user = userEvent.setup()
        // Farvardin date: 2024-03-25 = 1403-01-06
        const farvardinDate = new Date(2024, 2, 25)
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={farvardinDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        // Prev month from Farvardin 1403 -> Esfand 1402
        const prevBtn = screen.getByTestId('jalali-picker-prev-month')
        await user.press(prevBtn)
        expect(screen.getAllByText(/Esfand 1402/).length).toBeGreaterThan(0)

        // Next month from Esfand 1402 -> Farvardin 1403
        const nextBtn = screen.getByTestId('jalali-picker-next-month')
        await user.press(nextBtn)
        expect(screen.getAllByText(/Farvardin 1403/).length).toBeGreaterThan(0)
    })

    it('allows selecting another day and confirming', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        // Select day 15
        const day15Btn = screen.getByTestId('jalali-day-15')
        await user.press(day15Btn)
        expect(screen.getByText('15 Aban 1405')).toBeOnTheScreen()

        // Confirm
        const confirmBtn = screen.getByText('Confirm')
        await user.press(confirmBtn)

        expect(onConfirmMock).toHaveBeenCalledTimes(1)
        const confirmedDate: Date = onConfirmMock.mock.calls[0][0] as Date
        // 1405-08-15 is 2026-11-06
        expect(confirmedDate.getFullYear()).toBe(2026)
        expect(confirmedDate.getMonth()).toBe(10) // November
        expect(confirmedDate.getDate()).toBe(6)
    })

    it('calls onDismiss when cancel button is clicked', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                />
            </PaperProvider>,
        )

        const cancelBtn = screen.getByText('Cancel')
        await user.press(cancelBtn)
        expect(onDismissMock).toHaveBeenCalledTimes(1)
    })

    it('disables days beyond maximumDate and minimumDate and clamps on confirm', async () => {
        const user = userEvent.setup()
        // Value: 1405-08-20 (2026-11-11)
        // Max date: 1405-08-25 (2026-11-16)
        // Min date: 1405-08-10 (2026-11-01)
        const minDate = new Date(2026, 10, 1)
        const maxDate = new Date(2026, 10, 16)

        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    minimumDate={minDate}
                    maximumDate={maxDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        // Day 28 should be disabled (beyond maxDate 25)
        const day28 = screen.getByTestId('jalali-day-28')
        expect(day28).toBeDisabled()

        // Day 5 should be disabled (before minDate 10)
        const day5 = screen.getByTestId('jalali-day-5')
        expect(day5).toBeDisabled()

        // Confirm
        const confirmBtn = screen.getByText('Confirm')
        await user.press(confirmBtn)
        expect(onConfirmMock).toHaveBeenCalledTimes(1)
    })

    it('clamps to maximumDate if value exceeds it upon confirm', async () => {
        const user = userEvent.setup()
        const maxDate = new Date(2026, 10, 5) // Nov 5
        const valueExceeding = new Date(2026, 10, 11) // Nov 11

        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={valueExceeding}
                    maximumDate={maxDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                />
            </PaperProvider>,
        )

        const confirmBtn = screen.getByText('Confirm')
        await user.press(confirmBtn)
        expect(onConfirmMock).toHaveBeenCalledWith(maxDate)
    })

    it('clamps to minimumDate if value is below it upon confirm', async () => {
        const user = userEvent.setup()
        const minDate = new Date(2026, 10, 20) // Nov 20
        const valueBelow = new Date(2026, 10, 11) // Nov 11

        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={valueBelow}
                    minimumDate={minDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                />
            </PaperProvider>,
        )

        const confirmBtn = screen.getByText('Confirm')
        await user.press(confirmBtn)
        expect(onConfirmMock).toHaveBeenCalledWith(minDate)
    })

    it('renders German weekday abbreviations when locale is de', async () => {
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Abbrechen"
                    confirmLabel="Bestätigen"
                    locale="de"
                />
            </PaperProvider>,
        )

        // German weekdays starting on Saturday: Sa, So, Mo, Di, Mi, Do, Fr
        expect(screen.getByText('So')).toBeOnTheScreen()
        expect(screen.getByText('Di')).toBeOnTheScreen()
        expect(screen.getByText('Mi')).toBeOnTheScreen()
        expect(screen.getByText('Do')).toBeOnTheScreen()
    })

    it('renders Spanish weekday abbreviations when locale is es', async () => {
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancelar"
                    confirmLabel="Confirmar"
                    locale="es"
                />
            </PaperProvider>,
        )

        // Spanish weekdays starting on Saturday: sá, do, lu, ma, mi, ju, vi
        expect(screen.getByText('sá')).toBeOnTheScreen()
        expect(screen.getByText('do')).toBeOnTheScreen()
        expect(screen.getByText('lu')).toBeOnTheScreen()
    })

    it('aligns weekdays and day grid according to firstDayOfWeek prop', async () => {
        // Month: Aban 1405 (starts on Friday, 1405-08-01 / 2026-10-23)
        // If week starts on Sunday (0):
        // Headers: Su, Mo, Tu, We, Th, Fr, Sa
        // Friday offset: (5 - 0 + 7) % 7 = 5 leading empty cells
        const { unmount } = await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    firstDayOfWeek="sunday"
                    locale="en"
                />
            </PaperProvider>,
        )

        // Day 1 should exist
        expect(screen.getByTestId('jalali-day-1')).toBeOnTheScreen()

        // Weekday header order starting on Sunday
        const sundayWeekdayRow = screen.getByTestId('jalali-picker-weekday-row')
        const sundayLabels = within(sundayWeekdayRow)
            .getAllByText(/.+/)
            .map((el) => String((el.props as Record<string, unknown>).children))
        expect(sundayLabels).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])

        // Friday offset with Sunday start has 5 leading empty cells
        expect(screen.getAllByTestId('jalali-leading-empty-cell')).toHaveLength(
            5,
        )

        await unmount()

        // If week starts on Saturday (6):
        // Headers: Sa, Su, Mo, Tu, We, Th, Fr
        // Friday offset: (5 - 6 + 7) % 7 = 6 leading empty cells
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    firstDayOfWeek="saturday"
                    locale="en"
                />
            </PaperProvider>,
        )

        const saturdayWeekdayRow = screen.getByTestId(
            'jalali-picker-weekday-row',
        )
        const saturdayLabels = within(saturdayWeekdayRow)
            .getAllByText(/.+/)
            .map((el) => String((el.props as Record<string, unknown>).children))
        expect(saturdayLabels).toEqual([
            'Sa',
            'Su',
            'Mo',
            'Tu',
            'We',
            'Th',
            'Fr',
        ])
        expect(screen.getAllByTestId('jalali-leading-empty-cell')).toHaveLength(
            6,
        )
    })

    it('does not mutate selectedDate or highlight a disabled day when browsing months with maximumDate', async () => {
        const user = userEvent.setup()
        // Today: 1405-08-20 (fixedDate = 2026-11-11)
        // With maximumDate set to today
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    maximumDate={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        // Title initially shows selectedDate: "20 Aban 1405"
        expect(screen.getByText('20 Aban 1405')).toBeOnTheScreen()
        expect(screen.getByText('Aban 1405')).toBeOnTheScreen()

        // Day 20 in current month (Aban) is enabled and selected
        const day20Aban = screen.getByTestId('jalali-day-20')
        expect(day20Aban).not.toBeDisabled()

        // Navigate forward to next month (Azar 1405)
        const nextBtn = screen.getByTestId('jalali-picker-next-month')
        await user.press(nextBtn)

        // Month header advances to Azar 1405
        expect(screen.getByText('Azar 1405')).toBeOnTheScreen()

        // Chevron-right is now disabled (at most one month past maximumDate)
        expect(nextBtn).toBeDisabled()

        // Dialog title keeps the original selectedDate unchanged
        expect(screen.getByText('20 Aban 1405')).toBeOnTheScreen()
        expect(screen.queryByText(/20 Azar 1405/)).toBeNull()

        // Day 20 in Azar is disabled (past maximumDate) and NOT highlighted as selected
        const day20Azar = screen.getByTestId('jalali-day-20')
        expect(day20Azar).toBeDisabled()
        const flattenedStyle = [day20Azar.props.style].flat().filter(Boolean)
        const hasPrimaryBg = flattenedStyle.some(
            (s) =>
                (s as { backgroundColor?: string }).backgroundColor !==
                undefined,
        )
        expect(hasPrimaryBg).toBe(false)

        // Navigate back to Aban 1405
        const prevBtn = screen.getByTestId('jalali-picker-prev-month')
        await user.press(prevBtn)
        expect(screen.getByText('Aban 1405')).toBeOnTheScreen()
        expect(nextBtn).not.toBeDisabled()

        // Confirming restores and preserves selectedDate
        const confirmBtn = screen.getByText('Confirm')
        await user.press(confirmBtn)
        expect(onConfirmMock).toHaveBeenCalledWith(fixedDate)
    })

    it('disables chevron-left once browsing one month before minimumDate', async () => {
        const user = userEvent.setup()
        // fixedDate = 2026-11-11 (Aban 1405)
        // With minimumDate set to fixedDate
        await render(
            <PaperProvider>
                <JalaliDatePickerDialog
                    visible={true}
                    onDismiss={onDismissMock}
                    onConfirm={onConfirmMock}
                    value={fixedDate}
                    minimumDate={fixedDate}
                    cancelLabel="Cancel"
                    confirmLabel="Confirm"
                    locale="en"
                />
            </PaperProvider>,
        )

        const prevBtn = screen.getByTestId('jalali-picker-prev-month')
        expect(prevBtn).not.toBeDisabled()

        // Navigate back one month (Mehr 1405)
        await user.press(prevBtn)
        expect(screen.getByText('Mehr 1405')).toBeOnTheScreen()

        // Chevron-left is now disabled (at most one month before minimumDate)
        expect(prevBtn).toBeDisabled()
    })
})
