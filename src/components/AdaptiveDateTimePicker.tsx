import DateTimePicker from '@expo/ui/community/datetime-picker'
import { shiftToUTC, shiftToLocal } from '../utils/dateShift'
import JalaliDatePickerDialog from './JalaliDatePickerDialog'
import { FirstDayOfWeek } from '../utils/calendar'

export interface AdaptiveDateTimePickerProps {
    visible: boolean
    onDismiss: () => void
    onConfirm: (date: Date) => void
    value: Date
    mode: 'date' | 'time'
    locale?: string
    cancelLabel: string
    confirmLabel: string
    maximumDate?: Date
    minimumDate?: Date
    calendar?: 'gregorian' | 'jalali'
    firstDayOfWeek?: FirstDayOfWeek
}

const AdaptiveDateTimePicker = ({
    visible,
    onDismiss,
    onConfirm,
    value,
    mode,
    locale,
    cancelLabel,
    confirmLabel,
    maximumDate,
    minimumDate,
    calendar = 'gregorian',
    firstDayOfWeek,
}: AdaptiveDateTimePickerProps) => {
    if (!visible) return <></>

    if (calendar === 'jalali' && mode === 'date') {
        return (
            <JalaliDatePickerDialog
                visible={visible}
                onDismiss={onDismiss}
                onConfirm={onConfirm}
                value={value}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                cancelLabel={cancelLabel}
                confirmLabel={confirmLabel}
                locale={locale}
                firstDayOfWeek={firstDayOfWeek}
            />
        )
    }

    const androidValue = mode === 'date' ? shiftToUTC(value) : value

    return (
        <DateTimePicker
            value={androidValue}
            mode={mode}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            presentation="dialog"
            onValueChange={(_, selectedDate) => {
                onConfirm(
                    mode === 'date' ? shiftToLocal(selectedDate) : selectedDate,
                )
            }}
            onDismiss={onDismiss}
        />
    )
}

export default AdaptiveDateTimePicker
