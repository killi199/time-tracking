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
    toJalaali,
    toGregorian,
    getJalaliMonthDays,
    JALALI_MONTH_NAMES_FA,
    JALALI_MONTH_NAMES_EN,
    JALALI_WEEKDAY_SHORT_FA,
} from '../utils/jalali'

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
}

const WEEKDAYS_EN = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']

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
}: JalaliDatePickerDialogProps) {
    const theme = useTheme()
    const isFa = locale?.startsWith('fa') ?? false
    const monthNames = isFa ? JALALI_MONTH_NAMES_FA : JALALI_MONTH_NAMES_EN
    const weekdayLabels = isFa ? JALALI_WEEKDAY_SHORT_FA : WEEKDAYS_EN

    const initialJalali = toJalaali(
        value.getFullYear(),
        value.getMonth() + 1,
        value.getDate(),
    )

    const [currentYear, setCurrentYear] = useState(initialJalali.jy)
    const [currentMonth, setCurrentMonth] = useState(initialJalali.jm)
    const [selectedDay, setSelectedDay] = useState(initialJalali.jd)
    const [prevVisible, setPrevVisible] = useState(visible)

    if (visible !== prevVisible) {
        setPrevVisible(visible)
        if (visible) {
            const j = toJalaali(
                value.getFullYear(),
                value.getMonth() + 1,
                value.getDate(),
            )
            setCurrentYear(j.jy)
            setCurrentMonth(j.jm)
            setSelectedDay(j.jd)
        }
    }

    if (!visible) return null

    const daysInMonth = getJalaliMonthDays(currentYear, currentMonth)

    // Calculate column offset for day 1 (0 = Saturday .. 6 = Friday)
    const firstDayGregorian = toGregorian(currentYear, currentMonth, 1)
    const firstDayDate = new Date(
        firstDayGregorian.gy,
        firstDayGregorian.gm - 1,
        firstDayGregorian.gd,
    )
    const firstDayOfWeek = firstDayDate.getDay() // 0 = Sun .. 6 = Sat
    const leadingEmptyDays = (firstDayOfWeek + 1) % 7

    const handlePrevMonth = () => {
        if (currentMonth === 1) {
            setCurrentYear((y) => y - 1)
            setCurrentMonth(12)
        } else {
            setCurrentMonth((m) => m - 1)
        }
    }

    const handleNextMonth = () => {
        if (currentMonth === 12) {
            setCurrentYear((y) => y + 1)
            setCurrentMonth(1)
        } else {
            setCurrentMonth((m) => m + 1)
        }
    }

    const isDateDisabled = (day: number) => {
        const g = toGregorian(currentYear, currentMonth, day)
        const d = new Date(g.gy, g.gm - 1, g.gd, 23, 59, 59, 999)
        const startOfDay = new Date(g.gy, g.gm - 1, g.gd, 0, 0, 0, 0)

        if (maximumDate && startOfDay > maximumDate) {
            return true
        }
        if (minimumDate && d < minimumDate) {
            return true
        }
        return false
    }

    const handleConfirm = () => {
        const safeDay = Math.min(selectedDay, daysInMonth)
        const g = toGregorian(currentYear, currentMonth, safeDay)
        const resultDate = new Date(
            g.gy,
            g.gm - 1,
            g.gd,
            value.getHours(),
            value.getMinutes(),
            value.getSeconds(),
        )

        let finalDate = resultDate
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
                        {selectedDay} {monthNames[currentMonth - 1]}{' '}
                        {currentYear}
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
                            {monthNames[currentMonth - 1]} {currentYear}
                        </Text>
                        <IconButton
                            icon="chevron-right"
                            onPress={handleNextMonth}
                            testID="jalali-picker-next-month"
                        />
                    </View>

                    <View style={styles.weekdayRow}>
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

                                    const isSelected = day === selectedDay
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
                                                setSelectedDay(day)
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
    dialog: {
        maxWidth: 360,
        alignSelf: 'center',
        width: '90%',
    },
    title: {
        paddingBottom: 0,
    },
    selectedTitleText: {
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 8,
    },
    monthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    monthYearText: {
        fontWeight: 'bold',
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 4,
    },
    daysGrid: {
        flexDirection: 'column',
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 2,
    },
    gridCell: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
