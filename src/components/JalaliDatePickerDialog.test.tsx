import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import JalaliDatePickerDialog from './JalaliDatePickerDialog'

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
                    locale="fa"
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
})
