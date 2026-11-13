import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
    View,
    StyleSheet,
    AppState,
    TouchableOpacity,
    Keyboard,
} from 'react-native'
import {
    Button,
    Text,
    IconButton,
    Portal,
    Dialog,
    TextInput,
    useTheme,
    Checkbox,
} from 'react-native-paper'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import AdaptiveDateTimePicker from '../components/AdaptiveDateTimePicker'
import { useFocusEffect, useNavigation } from 'expo-router'
import { addEvent, updateEvent, deleteEvent } from '../db/database'
import { TimeEvent } from '../types'
import { useTranslation } from 'react-i18next'
import {
    getFormattedTime,
    getFormattedDate,
    getFormattedMonth,
} from '../utils/time'
import {
    getActiveCalendarSystem,
    getSavedFirstDayOfWeek,
    getWeekRange,
    getMonthRange,
    stepMonth,
    formatHeaderDate,
} from '../utils/calendar'
import DayView from './DayView'
import MonthView from './MonthView'
import WeekView from './WeekView'

type ViewMode = 'day' | 'week' | 'month'
type SlideDirection = 'left' | 'right' | 'none'

const getEnteringAnimation = (direction: SlideDirection) => {
    if (direction === 'right') {
        return SlideInRight.duration(220)
    }
    if (direction === 'left') {
        return SlideInLeft.duration(220)
    }
    return undefined
}

interface HomeScreenProps {
    readonly viewMode: ViewMode
}

export default function HomeScreen({
    viewMode: initialViewMode,
}: HomeScreenProps) {
    const viewMode = initialViewMode
    const [currentDate, setCurrentDate] = useState<string>(
        getFormattedDate(new Date()),
    )
    const [currentMonth, setCurrentMonth] = useState<string>(
        getFormattedMonth(new Date()), // YYYY-MM
    )
    const [direction, setDirection] = useState<SlideDirection>('none')

    // Refresh trigger to force updates in child components
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    // Dialog State (Add/Edit)
    const [visible, setVisible] = useState(false)
    const [dialogDate, setDialogDate] = useState('')
    const [dialogTime, setDialogTime] = useState('')
    const dialogNoteRef = useRef('')
    const [dialogNoteInput, setDialogNoteInput] = useState({
        key: 0,
        defaultValue: '',
    })

    const resetDialogNote = (note: string) => {
        dialogNoteRef.current = note
        setDialogNoteInput((prev) => ({
            key: prev.key + 1,
            defaultValue: note,
        }))
    }
    const [dialogIsLateEntry, setDialogIsLateEntry] = useState(true)
    const [editingEvent, setEditingEvent] = useState<TimeEvent | null>(null)
    const [timePickerVisible, setTimePickerVisible] = useState(false)
    const [createDatePickerVisible, setCreateDatePickerVisible] =
        useState(false)
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<TimeEvent | null>(null)

    const theme = useTheme()
    const { t, i18n } = useTranslation()

    const calendarSystem = getActiveCalendarSystem()
    const firstDayOfWeek = getSavedFirstDayOfWeek()

    // Track app state and date to auto-update on resume
    const appState = useRef(AppState.currentState)
    const lastActiveDateRef = useRef(getFormattedDate(new Date()))
    const lastActiveMonthRef = useRef(getFormattedMonth(new Date()))

    useEffect(() => {
        const subscription = AppState.addEventListener(
            'change',
            (nextAppState) => {
                if (
                    /inactive|background/.exec(appState.current) &&
                    nextAppState === 'active'
                ) {
                    const now = new Date()
                    const newToday = getFormattedDate(now)
                    const newMonth = getFormattedMonth(now)

                    // If real day changed and we were viewing "Today", update to new "Today"
                    if (newToday !== lastActiveDateRef.current) {
                        if (currentDate === lastActiveDateRef.current) {
                            setCurrentDate(newToday)
                        }
                        lastActiveDateRef.current = newToday
                    }

                    // Same for month
                    if (newMonth !== lastActiveMonthRef.current) {
                        if (currentMonth === lastActiveMonthRef.current) {
                            setCurrentMonth(newMonth)
                        }
                        lastActiveMonthRef.current = newMonth
                    }

                    // Always refresh data on resume
                    setRefreshTrigger((prev) => prev + 1)
                }

                appState.current = nextAppState
            },
        )

        return () => {
            subscription.remove()
        }
    }, [currentDate, currentMonth])

    const navigation = useNavigation()

    useFocusEffect(() => {
        // Trigger a refresh when screen comes into focus
        setRefreshTrigger((prev) => prev + 1)
    })

    const canGoForward = (() => {
        const today = new Date()
        const todayStr = getFormattedDate(today)

        if (viewMode === 'month') {
            const currentMonthEnd = getMonthRange(
                currentDate,
                calendarSystem,
            ).end
            const todayMonthEnd = getMonthRange(todayStr, calendarSystem).end
            return currentMonthEnd < todayMonthEnd
        } else if (viewMode === 'week') {
            const currentWeekStart = getWeekRange(
                currentDate,
                firstDayOfWeek,
                calendarSystem,
            ).start
            const todayWeekStart = getWeekRange(
                todayStr,
                firstDayOfWeek,
                calendarSystem,
            ).start
            return currentWeekStart < todayWeekStart
        } else {
            return currentDate < todayStr
        }
    })()

    const changeDate = (step: number) => {
        if (step > 0 && !canGoForward) return

        setDirection(step > 0 ? 'right' : 'left')
        const today = new Date()
        const todayStr = getFormattedDate(today)

        if (viewMode === 'month') {
            const steppedDate = stepMonth(currentDate, step, calendarSystem)
            const newDateStr = steppedDate > todayStr ? todayStr : steppedDate
            setCurrentDate(newDateStr)
            setCurrentMonth(getFormattedMonth(new Date(newDateStr)))
        } else if (viewMode === 'week') {
            const date = new Date(currentDate)
            date.setDate(date.getDate() + step * 7)
            const newDateStr = getFormattedDate(date)
            setCurrentDate(newDateStr > todayStr ? todayStr : newDateStr)
        } else {
            const date = new Date(currentDate)
            date.setDate(date.getDate() + step)
            const newDateStr = getFormattedDate(date)
            setCurrentDate(newDateStr > todayStr ? todayStr : newDateStr)
        }
    }

    const goToToday = () => {
        const now = new Date()
        const todayDate = getFormattedDate(now)
        const todayMonth = getFormattedMonth(now)
        let nextDirection: SlideDirection = 'none'
        if (todayDate > currentDate) {
            nextDirection = 'right'
        } else if (todayDate < currentDate) {
            nextDirection = 'left'
        }
        setDirection(nextDirection)
        setCurrentDate(todayDate)
        setCurrentMonth(todayMonth)
    }

    const formattedDate = formatHeaderDate(
        currentDate,
        viewMode,
        calendarSystem,
        i18n.language,
        firstDayOfWeek,
    )

    const activeItemCloseCallback = useRef<(() => void) | undefined>(undefined)

    const showAddDialogRef = useRef<() => void>(() => {})
    useLayoutEffect(() => {
        showAddDialogRef.current = () => {
            setEditingEvent(null)
            setDialogDate(currentDate)
            setDialogTime(getFormattedTime(new Date()))
            resetDialogNote('')
            setDialogIsLateEntry(true)
            setVisible(true)
        }
    })

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <IconButton
                    icon="plus"
                    onPress={() => {
                        showAddDialogRef.current()
                    }}
                />
            ),
        })
    }, [navigation])

    const showEditDialog = (item: TimeEvent, close?: () => void) => {
        setDialogTime(item.time)
        resetDialogNote(item.note || '')
        setDialogIsLateEntry(item.isManualEntry ?? false)
        setEditingEvent(item)
        activeItemCloseCallback.current = close
        setVisible(true)
    }

    const hideDialog = () => {
        setVisible(false)
        setEditingEvent(null)
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current()
            activeItemCloseCallback.current = undefined
        }
    }

    const handleConfirm = () => {
        const timeRegex = /^([0-1]?\d|2[0-3]):[0-5]\d$/
        if (!timeRegex.test(dialogTime)) {
            alert(t('dialog.invalidTime'))
            return
        }

        if (editingEvent) {
            updateEvent(
                editingEvent.id,
                editingEvent.date,
                dialogTime,
                dialogNoteRef.current,
                dialogIsLateEntry,
            )
        } else {
            addEvent(
                dialogDate,
                dialogTime,
                dialogNoteRef.current || null,
                dialogIsLateEntry,
            )
        }

        setRefreshTrigger((prev) => prev + 1)
        hideDialog()
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current()
            activeItemCloseCallback.current = undefined
        }
    }

    const onDismissTimePicker = () => {
        setTimePickerVisible(false)
    }

    const onConfirmTimePicker = ({
        hours,
        minutes,
    }: {
        hours: number
        minutes: number
    }) => {
        setTimePickerVisible(false)
        const h = hours.toString().padStart(2, '0')
        const m = minutes.toString().padStart(2, '0')
        setDialogTime(`${h}:${m}`)
    }

    const onDismissCreateDatePicker = () => {
        setCreateDatePickerVisible(false)
    }

    const onConfirmCreateDatePicker = (params: { date: Date | undefined }) => {
        setCreateDatePickerVisible(false)
        if (params.date) {
            const todayStr = getFormattedDate(new Date())
            const formatted = getFormattedDate(params.date)
            setDialogDate(formatted > todayStr ? todayStr : formatted)
        }
    }

    const showDeleteDialog = (item: TimeEvent, close?: () => void) => {
        setItemToDelete(item)
        activeItemCloseCallback.current = close
        setDeleteDialogVisible(true)
    }

    const confirmDelete = () => {
        if (!itemToDelete) return
        deleteEvent(itemToDelete.id)
        setRefreshTrigger((prev) => prev + 1)
        setDeleteDialogVisible(false)
        setItemToDelete(null)
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current()
            activeItemCloseCallback.current = undefined
        }
    }

    const cancelDelete = () => {
        setDeleteDialogVisible(false)
        setItemToDelete(null)
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current()
            activeItemCloseCallback.current = undefined
        }
    }

    const handleAddEvent = () => {
        const now = new Date()
        const timeString = getFormattedTime(now)
        addEvent(currentDate, timeString, null)
        setRefreshTrigger((prev) => prev + 1)
    }

    // Date Picker State
    const [datePickerVisible, setDatePickerVisible] = useState(false)

    const onDismissDatePicker = () => {
        setDatePickerVisible(false)
    }

    const onConfirmDatePicker = (params: { date: Date | undefined }) => {
        setDatePickerVisible(false)
        if (!params.date) return

        const todayDate = getFormattedDate(new Date())
        const todayMonth = getFormattedMonth(new Date())

        if (viewMode === 'month') {
            const newMonth = getFormattedMonth(params.date)
            const targetMonth = newMonth > todayMonth ? todayMonth : newMonth
            let nextDirection: SlideDirection = 'none'
            if (targetMonth > currentMonth) {
                nextDirection = 'right'
            } else if (targetMonth < currentMonth) {
                nextDirection = 'left'
            }
            setDirection(nextDirection)
            setCurrentMonth(targetMonth)
            const newDate = getFormattedDate(params.date)
            setCurrentDate(newDate > todayDate ? todayDate : newDate)
        } else {
            const newDate = getFormattedDate(params.date)
            const targetDate = newDate > todayDate ? todayDate : newDate
            let nextDirection: SlideDirection = 'none'
            if (targetDate > currentDate) {
                nextDirection = 'right'
            } else if (targetDate < currentDate) {
                nextDirection = 'left'
            }
            setDirection(nextDirection)
            setCurrentDate(targetDate)
        }
    }

    const dateForPicker = (() => {
        if (viewMode === 'month') {
            const [y, m] = currentMonth.split('-').map(Number)
            return new Date(y, m - 1, 1)
        } else {
            const [y, m, d] = currentDate.split('-').map(Number)
            return new Date(y, m - 1, d)
        }
    })()

    // Ensure the date is valid (fallback to now if invalid)
    const validDateForPicker = isNaN(dateForPicker.getTime())
        ? new Date()
        : dateForPicker

    // Helper to extract hours/minutes from dialogTime for the picker
    const getPickerTime = () => {
        if (!dialogTime)
            return {
                hours: new Date().getHours(),
                minutes: new Date().getMinutes(),
            }
        const parts = dialogTime.split(':')
        if (parts.length === 2) {
            const h = parseInt(parts[0], 10)
            const m = parseInt(parts[1], 10)
            if (!isNaN(h) && !isNaN(m)) return { hours: h, minutes: m }
        }
        return {
            hours: new Date().getHours(),
            minutes: new Date().getMinutes(),
        }
    }

    const { hours: pickerHours, minutes: pickerMinutes } = getPickerTime()

    const swipeGesture = Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-30, 30])
        .onEnd((e) => {
            if (e.translationX < -50) {
                if (canGoForward) {
                    scheduleOnRN(changeDate, 1) // Swipe left -> Next day/week/month
                }
            } else if (e.translationX > 50) {
                scheduleOnRN(changeDate, -1) // Swipe right -> Previous day/week/month
            }
        })

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.dateNav}>
                    <IconButton
                        icon="chevron-left"
                        testID="prev-date-btn"
                        onPress={() => {
                            changeDate(-1)
                        }}
                    />
                    <TouchableOpacity
                        style={styles.dateTouchable}
                        onPress={() => {
                            setDatePickerVisible(true)
                        }}
                    >
                        <Text variant="titleLarge" style={styles.dateText}>
                            {formattedDate}
                        </Text>
                    </TouchableOpacity>
                    <IconButton
                        icon="chevron-right"
                        testID="next-date-btn"
                        onPress={() => {
                            changeDate(1)
                        }}
                        disabled={!canGoForward}
                    />
                </View>
                <Button
                    mode="contained-tonal"
                    onPress={goToToday}
                    disabled={!canGoForward}
                >
                    {t('home.backToNow')}
                </Button>
            </View>

            <AdaptiveDateTimePicker
                visible={datePickerVisible}
                onDismiss={onDismissDatePicker}
                onConfirm={(date) => {
                    onConfirmDatePicker({ date })
                }}
                value={validDateForPicker}
                maximumDate={new Date()}
                mode="date"
                locale={i18n.language}
                cancelLabel={t('common.cancel')}
                confirmLabel={t('common.confirm')}
                calendar={calendarSystem}
            />

            <AdaptiveDateTimePicker
                visible={timePickerVisible}
                onDismiss={onDismissTimePicker}
                onConfirm={(date) => {
                    onConfirmTimePicker({
                        hours: date.getHours(),
                        minutes: date.getMinutes(),
                    })
                }}
                value={(() => {
                    const d = new Date()
                    d.setHours(pickerHours, pickerMinutes, 0, 0)
                    return d
                })()}
                mode="time"
                locale={i18n.language}
                cancelLabel={t('common.cancel')}
                confirmLabel={t('common.confirm')}
            />

            <AdaptiveDateTimePicker
                visible={createDatePickerVisible}
                onDismiss={onDismissCreateDatePicker}
                onConfirm={(date) => {
                    onConfirmCreateDatePicker({ date })
                }}
                value={(() => {
                    if (!dialogDate) return new Date()
                    const [y, m, d] = dialogDate.split('-').map(Number)
                    return new Date(y, m - 1, d)
                })()}
                maximumDate={new Date()}
                mode="date"
                locale={i18n.language}
                cancelLabel={t('common.cancel')}
                confirmLabel={t('common.confirm')}
                calendar={calendarSystem}
            />

            <GestureDetector gesture={swipeGesture}>
                <View style={styles.contentContainer}>
                    <Animated.View
                        key={`${viewMode}-${viewMode === 'month' ? currentMonth : currentDate}`}
                        entering={getEnteringAnimation(direction)}
                        style={styles.animatedView}
                    >
                        {(() => {
                            if (viewMode === 'day') {
                                return (
                                    <DayView
                                        date={currentDate}
                                        onEditEvent={showEditDialog}
                                        onDeleteEvent={showDeleteDialog}
                                        onAddEvent={handleAddEvent}
                                        refreshTrigger={refreshTrigger}
                                    />
                                )
                            } else if (viewMode === 'week') {
                                return (
                                    <WeekView
                                        date={currentDate}
                                        calendar={calendarSystem}
                                        firstDayOfWeek={firstDayOfWeek}
                                        onEditEvent={showEditDialog}
                                        onDeleteEvent={showDeleteDialog}
                                        refreshTrigger={refreshTrigger}
                                    />
                                )
                            } else {
                                return (
                                    <MonthView
                                        month={currentDate}
                                        calendar={calendarSystem}
                                        onEditEvent={showEditDialog}
                                        onDeleteEvent={showDeleteDialog}
                                        refreshTrigger={refreshTrigger}
                                    />
                                )
                            }
                        })()}
                    </Animated.View>
                </View>
            </GestureDetector>

            <Portal>
                <Dialog visible={visible} onDismiss={hideDialog}>
                    <Dialog.Title>
                        {editingEvent
                            ? t('addEntry.editTitle')
                            : t('addEntry.addTitle')}
                    </Dialog.Title>
                    <Dialog.Content>
                        {!editingEvent ? (
                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss()
                                    setCreateDatePickerVisible(true)
                                }}
                            >
                                <View pointerEvents="none">
                                    <TextInput
                                        label={t('addEntry.dateLabel')}
                                        value={formatHeaderDate(
                                            dialogDate,
                                            'day',
                                            calendarSystem,
                                            i18n.language,
                                        )}
                                        mode="outlined"
                                        style={styles.dialogInput}
                                        editable={false}
                                        right={
                                            <TextInput.Icon icon="calendar" />
                                        }
                                    />
                                </View>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            onPress={() => {
                                Keyboard.dismiss()
                                setTimePickerVisible(true)
                            }}
                        >
                            <View pointerEvents="none">
                                <TextInput
                                    label={t('dialog.timeLabel')}
                                    value={dialogTime}
                                    mode="outlined"
                                    style={styles.dialogInput}
                                    editable={false}
                                    right={
                                        <TextInput.Icon icon="clock-outline" />
                                    }
                                />
                            </View>
                        </TouchableOpacity>
                        <TextInput
                            label={t('dialog.noteLabel')}
                            key={dialogNoteInput.key}
                            defaultValue={dialogNoteInput.defaultValue}
                            onChangeText={(note) => {
                                dialogNoteRef.current = note
                            }}
                            mode="outlined"
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                Keyboard.dismiss()
                            }}
                        />
                        <Checkbox.Item
                            label={t('addEntry.lateEntryLabel')}
                            status={dialogIsLateEntry ? 'checked' : 'unchecked'}
                            onPress={() => {
                                setDialogIsLateEntry(!dialogIsLateEntry)
                            }}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog}>
                            {t('common.cancel')}
                        </Button>
                        <Button onPress={handleConfirm}>
                            {t('common.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog visible={deleteDialogVisible} onDismiss={cancelDelete}>
                    <Dialog.Title>{t('home.deleteEventTitle')}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            {t('home.deleteSession')}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={cancelDelete}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onPress={confirmDelete}
                            textColor={theme.colors.error}
                        >
                            {t('common.delete')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    animatedView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    dateNav: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dateTouchable: {
        flex: 1,
    },
    dialogInput: {
        marginBottom: 10,
    },
    dateText: {
        textAlign: 'center',
    },
})
