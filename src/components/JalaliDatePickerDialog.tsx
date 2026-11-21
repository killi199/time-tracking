import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import {
    Portal,
    Dialog,
    Button,
    Text,
    IconButton,
    useTheme,
} from 'react-native-paper'
import {
    addDays as addDaysJalali,
    addMonths as addMonthsJalali,
    format as formatJalali,
    getDay as getDayJalali,
    getDaysInMonth as getDaysInMonthJalali,
    setDate as setDateJalali,
    startOfMonth as startOfMonthJalali,
    startOfWeek as startOfWeekJalali,
    subMonths as subMonthsJalali,
} from 'date-fns-jalali'
import { enUS } from 'date-fns-jalali/locale'
import {
    FirstDayOfWeek,
    getSavedFirstDayOfWeek,
    resolveFirstDayOfWeek,
} from '../utils/calendar'

export interface JalaliDatePickerDialogProps {
    readonly visible: boolean
    readonly onDismiss: () => void
    readonly onConfirm: (date: Date) => void
    readonly value: Date
    readonly maximumDate?: Date
    readonly minimumDate?: Date
    readonly cancelLabel: string
    readonly confirmLabel: string
    readonly locale?: string
    readonly firstDayOfWeek?: FirstDayOfWeek
}

export default function JalaliDatePickerDialog({
    visible,
    onDismiss,
    onConfirm,
    value,
    maximumDate,
    minimumDate,
    cancelLabel,
    confirmLabel,
    locale,
    firstDayOfWeek,
}: JalaliDatePickerDialogProps) {
    const theme = useTheme()
    const effectiveFirstDaySetting = firstDayOfWeek ?? getSavedFirstDayOfWeek()
    const weekStartsOn = resolveFirstDayOfWeek(
        effectiveFirstDaySetting,
        'jalali',
    )

    const [currentMonthDate, setCurrentMonthDate] = useState(() =>
        startOfMonthJalali(value),
    )
    const [selectedDate, setSelectedDate] = useState(value)
    const [prevVisible, setPrevVisible] = useState(visible)

    if (visible !== prevVisible) {
        setPrevVisible(visible)
        if (visible) {
            setCurrentMonthDate(startOfMonthJalali(value))
            setSelectedDate(value)
        }
    }

    if (!visible) return null

    const daysInMonth = getDaysInMonthJalali(currentMonthDate)
    const monthStart = startOfMonthJalali(currentMonthDate)
    // Offset for weekStartsOn: (getDay - weekStartsOn + 7) % 7
    const leadingEmptyDays = (getDayJalali(monthStart) - weekStartsOn + 7) % 7

    // Generate weekday labels starting from weekStartsOn
    const sampleStart = startOfWeekJalali(new Date(), { weekStartsOn })
    const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
        addDaysJalali(sampleStart, i)
            .toLocaleDateString(locale, { weekday: 'short' })
            .slice(0, 2),
    )

    const handlePrevMonth = () => {
        setCurrentMonthDate((d) => startOfMonthJalali(subMonthsJalali(d, 1)))
    }

    const handleNextMonth = () => {
        setCurrentMonthDate((d) => startOfMonthJalali(addMonthsJalali(d, 1)))
    }

    const isDateDisabled = (day: number) => {
        const candidate = setDateJalali(currentMonthDate, day)
        const endOfDay = new Date(candidate)
        endOfDay.setHours(23, 59, 59, 999)
        const startOfDay = new Date(candidate)
        startOfDay.setHours(0, 0, 0, 0)

        if (maximumDate && startOfDay > maximumDate) {
            return true
        }
        if (minimumDate && endOfDay < minimumDate) {
            return true
        }
        return false
    }

    const handleConfirm = () => {
        let finalDate = selectedDate
        if (maximumDate && finalDate > maximumDate) {
            finalDate = maximumDate
        }
        if (minimumDate && finalDate < minimumDate) {
            finalDate = minimumDate
        }

        onConfirm(finalDate)
    }

    const gridRows: (number | null)[][] = []
    let currentRow: (number | null)[] = []

    for (let i = 0; i < leadingEmptyDays; i++) {
        currentRow.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
        currentRow.push(day)
        if (currentRow.length === 7) {
            gridRows.push(currentRow)
            currentRow = []
        }
    }

    if (currentRow.length > 0) {
        while (currentRow.length < 7) {
            currentRow.push(null)
        }
        gridRows.push(currentRow)
    }

    const selectedDay = Number(formatJalali(selectedDate, 'd'))
    const isSameMonthAndYear =
        formatJalali(selectedDate, 'yyyy-MM') ===
        formatJalali(currentMonthDate, 'yyyy-MM')

    return (
        <Portal>
            <Dialog
                visible={visible}
                onDismiss={onDismiss}
                style={styles.dialog}
            >
                <Dialog.Title style={styles.title}>
                    <Text
                        variant="headlineSmall"
                        style={styles.selectedTitleText}
                    >
                        {formatJalali(selectedDate, 'd MMMM yyyy', {
                            locale: enUS,
                        })}
                    </Text>
                </Dialog.Title>

                <Dialog.Content style={styles.content}>
                    <View style={styles.monthHeader}>
                        <IconButton
                            icon="chevron-left"
                            onPress={handlePrevMonth}
                            testID="jalali-picker-prev-month"
                        />
                        <Text
                            variant="titleMedium"
                            style={styles.monthYearText}
                        >
                            {formatJalali(currentMonthDate, 'MMMM yyyy', {
                                locale: enUS,
                            })}
                        </Text>
                        <IconButton
                            icon="chevron-right"
                            onPress={handleNextMonth}
                            testID="jalali-picker-next-month"
                        />
                    </View>

                    <View
                        style={[
                            styles.weekdayRow,
                            { borderColor: theme.colors.outlineVariant },
                        ]}
                    >
                        {weekdayLabels.map((lbl, idx) => (
                            <View
                                key={`weekday-${String(idx)}`}
                                style={styles.gridCell}
                            >
                                <Text
                                    variant="labelSmall"
                                    style={{
                                        color: theme.colors.onSurfaceVariant,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {lbl}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.daysGrid}>
                        {gridRows.map((row, rowIdx) => (
                            <View
                                key={`row-${String(rowIdx)}`}
                                style={styles.gridRow}
                            >
                                {row.map((day, colIdx) => {
                                    if (day === null) {
                                        return (
                                            <View
                                                key={`empty-${String(rowIdx)}-${String(colIdx)}`}
                                                style={styles.gridCell}
                                            />
                                        )
                                    }

                                    const isSelected =
                                        isSameMonthAndYear &&
                                        day === selectedDay
                                    const disabled = isDateDisabled(day)
                                    let textColor = theme.colors.onSurface
                                    if (isSelected) {
                                        textColor = theme.colors.onPrimary
                                    } else if (disabled) {
                                        textColor = theme.colors.outline
                                    }

                                    return (
                                        <TouchableOpacity
                                            key={`day-${String(day)}`}
                                            style={[
                                                styles.gridCell,
                                                isSelected && {
                                                    backgroundColor:
                                                        theme.colors.primary,
                                                    borderRadius: 18,
                                                },
                                            ]}
                                            disabled={disabled}
                                            onPress={() => {
                                                const newDate = setDateJalali(
                                                    currentMonthDate,
                                                    day,
                                                )
                                                newDate.setHours(
                                                    value.getHours(),
                                                    value.getMinutes(),
                                                    value.getSeconds(),
                                                )
                                                setSelectedDate(newDate)
                                            }}
                                            testID={`jalali-day-${String(day)}`}
                                        >
                                            <Text
                                                variant="bodyMedium"
                                                style={{
                                                    color: textColor,
                                                    fontWeight: isSelected
                                                        ? 'bold'
                                                        : 'normal',
                                                }}
                                            >
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        ))}
                    </View>
                </Dialog.Content>

                <Dialog.Actions>
                    <Button onPress={onDismiss}>{cancelLabel}</Button>
                    <Button onPress={handleConfirm}>{confirmLabel}</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    )
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: 8,
    },
    daysGrid: {
        paddingTop: 8,
    },
    dialog: {
        maxHeight: '90%',
    },
    gridCell: {
        alignItems: 'center',
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 2,
    },
    monthHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    monthYearText: {
        fontWeight: 'bold',
    },
    selectedTitleText: {
        fontWeight: 'bold',
    },
    title: {
        paddingBottom: 8,
        textAlign: 'center',
    },
    weekdayRow: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingBottom: 4,
    },
})
