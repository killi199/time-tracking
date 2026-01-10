import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { View, StyleSheet, AppState, TouchableOpacity, Keyboard } from 'react-native';
import {
    Button,
    Text,
    IconButton,
    Portal,
    Dialog,
    TextInput,
    useTheme,
    Checkbox,
} from 'react-native-paper';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { en, de, registerTranslation } from 'react-native-paper-dates';
import { useFocusEffect } from '@react-navigation/native';
import {
    addEvent,
    updateEvent,
    deleteEvent,
} from '../db/database';
import { TimeEvent } from '../types';
import { useTranslation } from 'react-i18next';
import { getFormattedTime, getFormattedDate, getLocaleDateString } from '../utils/time';
import DayView from './DayView';
import MonthView from './MonthView';
import WeekView from './WeekView';

registerTranslation('en', en);
registerTranslation('de', de);

// Helper to get week range text
const getWeekRangeData = (dateStr: string) => {
    const curr = new Date(dateStr);
    const day = curr.getDay(); // 0-6
    const diffToMonday = day === 0 ? 6 : day - 1;
    const first = new Date(curr);
    first.setDate(curr.getDate() - diffToMonday);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    return { start: first, end: last };
};

export default function HomeScreen({
    navigation,
    route,
}: {
    navigation: any;
    route: any;
}) {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState<string>(
        getFormattedDate(new Date()),
    );
    const [currentMonth, setCurrentMonth] = useState<string>(
        new Date().toISOString().slice(0, 7), // YYYY-MM
    );

    // Refresh trigger to force updates in child components
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Dialog State (Add/Edit)
    const [visible, setVisible] = useState(false);
    const [dialogDate, setDialogDate] = useState('');
    const [dialogTime, setDialogTime] = useState('');
    const [dialogNote, setDialogNote] = useState('');
    const [dialogIsLateEntry, setDialogIsLateEntry] = useState(true);
    const [editingEvent, setEditingEvent] = useState<TimeEvent | null>(null);
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [createDatePickerVisible, setCreateDatePickerVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<TimeEvent | null>(null);

    const theme = useTheme();
    const { t, i18n } = useTranslation();

    // Track app state and date to auto-update on resume
    const appState = useRef(AppState.currentState);
    const lastActiveDateRef = useRef(getFormattedDate(new Date()));
    const lastActiveMonthRef = useRef(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                const now = new Date();
                const newToday = getFormattedDate(now);
                const newMonth = now.toISOString().slice(0, 7);

                // If real day changed and we were viewing "Today", update to new "Today"
                if (newToday !== lastActiveDateRef.current) {
                    if (currentDate === lastActiveDateRef.current) {
                        setCurrentDate(newToday);
                    }
                    lastActiveDateRef.current = newToday;
                }

                // Same for month
                if (newMonth !== lastActiveMonthRef.current) {
                    if (currentMonth === lastActiveMonthRef.current) {
                        setCurrentMonth(newMonth);
                    }
                    lastActiveMonthRef.current = newMonth;
                }

                // Always refresh data on resume
                setRefreshTrigger(prev => prev + 1);
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [currentDate, currentMonth]);

    useFocusEffect(
        useCallback(() => {
            if (route.params?.viewMode) {
                setViewMode(route.params.viewMode);
                // Reset params to avoid stuck state
                navigation.setParams({ viewMode: undefined });
            }
            // Trigger a refresh when screen comes into focus
            setRefreshTrigger(prev => prev + 1);
        }, [route.params, navigation]),
    );

    useEffect(() => {
        let title = t('home.day');
        if (viewMode === 'month') title = t('home.month');
        if (viewMode === 'week') title = t('home.week');

        navigation.setOptions({
            title,
        });
    }, [navigation, viewMode, t]);

    const changeDate = (step: number) => {
        if (viewMode === 'month') {
            const date = new Date(`${currentMonth}-01`);
            date.setMonth(date.getMonth() + step);
            setCurrentMonth(date.toISOString().slice(0, 7));
        } else if (viewMode === 'week') {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + (step * 7));
            setCurrentDate(getFormattedDate(date));
        } else {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + step);
            setCurrentDate(date.toISOString().split('T')[0]);
        }
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentDate(getFormattedDate(now));
        setCurrentMonth(now.toISOString().slice(0, 7));
    };

    const formattedDate = React.useMemo(() => {
        if (viewMode === 'month') {
            return new Date(`${currentMonth}-01`).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'long',
            });
        } else if (viewMode === 'week') {
            const { start, end } = getWeekRangeData(currentDate);
            const startStr = start.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
            const endStr = end.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
            return `${startStr} - ${endStr}`;
        } else {
            return new Date(currentDate).toLocaleDateString(i18n.language, {
                weekday: 'short',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
            });
        }
    }, [viewMode, currentDate, currentMonth, i18n.language]);

    const activeItemCloseCallback = useRef<(() => void) | undefined>(undefined);

    const showAddDialog = () => {
        setEditingEvent(null);
        setDialogDate(currentDate);
        setDialogTime(getFormattedTime(new Date()));
        setDialogNote('');
        setDialogIsLateEntry(true);
        setVisible(true);
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <IconButton
                    icon="plus"
                    onPress={showAddDialog}
                />
            ),
        });
    }, [navigation, showAddDialog]);

    const showEditDialog = (item: TimeEvent, close?: () => void) => {
        setDialogTime(item.time);
        setDialogNote(item.note || '');
        setDialogIsLateEntry(item.isManualEntry ?? false);
        setEditingEvent(item);
        activeItemCloseCallback.current = close;
        setVisible(true);
    };

    const hideDialog = () => {
        setVisible(false);
        setEditingEvent(null);
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current();
            activeItemCloseCallback.current = undefined;
        }
    };

    const handleConfirm = () => {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(dialogTime)) {
            alert(t('dialog.invalidTime'));
            return;
        }

        if (editingEvent) {
            updateEvent(
                editingEvent.id,
                editingEvent.date,
                dialogTime,
                dialogNote,
                dialogIsLateEntry,
            );
        } else {
            addEvent(dialogDate, dialogTime, dialogNote || null, dialogIsLateEntry);
        }

        setRefreshTrigger(prev => prev + 1);
        hideDialog();
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current();
            activeItemCloseCallback.current = undefined;
        }
    };

    const onDismissTimePicker = useCallback(() => {
        setTimePickerVisible(false);
    }, [setTimePickerVisible]);

    const onConfirmTimePicker = useCallback(
        ({ hours, minutes }: { hours: number; minutes: number }) => {
            setTimePickerVisible(false);
            const h = hours.toString().padStart(2, '0');
            const m = minutes.toString().padStart(2, '0');
            setDialogTime(`${h}:${m}`);
        },
        [setTimePickerVisible, setDialogTime]
    );

    const onDismissCreateDatePicker = useCallback(() => {
        setCreateDatePickerVisible(false);
    }, [setCreateDatePickerVisible]);

    const onConfirmCreateDatePicker = useCallback(
        (params: { date: Date | undefined }) => {
            setCreateDatePickerVisible(false);
            if (params.date) {
                setDialogDate(getFormattedDate(params.date));
            }
        },
        [setCreateDatePickerVisible, setDialogDate]
    );

    const showDeleteDialog = (item: TimeEvent, close?: () => void) => {
        setItemToDelete(item);
        activeItemCloseCallback.current = close;
        setDeleteDialogVisible(true);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        deleteEvent(itemToDelete.id);
        setRefreshTrigger(prev => prev + 1);
        setDeleteDialogVisible(false);
        setItemToDelete(null);
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current();
            activeItemCloseCallback.current = undefined;
        }
    };

    const cancelDelete = () => {
        setDeleteDialogVisible(false);
        setItemToDelete(null);
        if (activeItemCloseCallback.current) {
            activeItemCloseCallback.current();
            activeItemCloseCallback.current = undefined;
        }
    };

    const showBackToNowCalculated = React.useMemo(() => {
        const today = new Date();
        const todayStr = getFormattedDate(today);
        const currentMonthStr = today.toISOString().slice(0, 7);

        if (viewMode === 'month') {
            return currentMonth !== currentMonthStr;
        } else if (viewMode === 'week') {
            const { start, end } = getWeekRangeData(currentDate);
            const todayTime = today.getTime();
            // Extend end to include end of day
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);

            return !(todayTime >= start.getTime() && todayTime <= endOfDay.getTime());
        } else {
            return currentDate !== todayStr;
        }
    }, [viewMode, currentDate, currentMonth]);

    const handleAddEvent = () => {
        const now = new Date();
        const timeString = getFormattedTime(now);
        addEvent(currentDate, timeString, null);
        setRefreshTrigger((prev) => prev + 1);
    };

    // Date Picker State
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    const onDismissDatePicker = useCallback(() => {
        setDatePickerVisible(false);
    }, [setDatePickerVisible]);

    const onConfirmDatePicker = useCallback(
        (params: { date: Date | undefined }) => {
            setDatePickerVisible(false);
            if (params.date) {
                if (viewMode === 'month') {
                    // Update month
                    const newMonth = params.date.toISOString().slice(0, 7);
                    setCurrentMonth(newMonth);
                } else {
                    // Update date
                    const newDate = getFormattedDate(params.date);
                    setCurrentDate(newDate);
                }
            }
        },
        [setDatePickerVisible, viewMode, setCurrentMonth, setCurrentDate]
    );

    const dateForPicker = viewMode === 'month'
        ? new Date(`${currentMonth}-01`)
        : new Date(currentDate);

    // Ensure the date is valid (fallback to now if invalid)
    const validDateForPicker = isNaN(dateForPicker.getTime()) ? new Date() : dateForPicker;

    // Helper to extract hours/minutes from dialogTime for the picker
    const getPickerTime = () => {
        if (!dialogTime) return { hours: new Date().getHours(), minutes: new Date().getMinutes() };
        const parts = dialogTime.split(':');
        if (parts.length === 2) {
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (!isNaN(h) && !isNaN(m)) return { hours: h, minutes: m };
        }
        return { hours: new Date().getHours(), minutes: new Date().getMinutes() };
    };

    const { hours: pickerHours, minutes: pickerMinutes } = getPickerTime();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.dateNav}>
                    <IconButton
                        icon="chevron-left"
                        onPress={() => changeDate(-1)}
                    />
                    <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                        <Text variant="titleLarge" style={styles.dateText}>{formattedDate}</Text>
                    </TouchableOpacity>
                    <IconButton
                        icon="chevron-right"
                        onPress={() => changeDate(1)}
                    />
                </View>
                <Button mode="contained-tonal" onPress={goToToday} disabled={!showBackToNowCalculated}>
                    {t('home.backToNow')}
                </Button>
            </View>

            <DatePickerModal
                locale={i18n.language}
                mode="single"
                visible={datePickerVisible}
                onDismiss={onDismissDatePicker}
                date={validDateForPicker}
                onConfirm={onConfirmDatePicker}
                startWeekOnMonday
            />

            <TimePickerModal
                visible={timePickerVisible}
                onDismiss={onDismissTimePicker}
                onConfirm={onConfirmTimePicker}
                hours={pickerHours}
                minutes={pickerMinutes}
                locale={i18n.language}
            />

            <DatePickerModal
                locale={i18n.language}
                mode="single"
                visible={createDatePickerVisible}
                onDismiss={onDismissCreateDatePicker}
                date={new Date(dialogDate || new Date().toISOString())}
                onConfirm={onConfirmCreateDatePicker}
                startWeekOnMonday
            />

            {viewMode === 'day' ? (
                <DayView
                    date={currentDate}
                    onEditEvent={showEditDialog}
                    onDeleteEvent={showDeleteDialog}
                    onAddEvent={handleAddEvent}
                    refreshTrigger={refreshTrigger}
                />
            ) : viewMode === 'week' ? (
                <WeekView
                    date={currentDate}
                    onEditEvent={showEditDialog}
                    onDeleteEvent={showDeleteDialog}
                    refreshTrigger={refreshTrigger}
                />
            ) : (
                <MonthView
                    month={currentMonth}
                    onEditEvent={showEditDialog}
                    onDeleteEvent={showDeleteDialog}
                    refreshTrigger={refreshTrigger}
                />
            )}

            <Portal>
                <Dialog visible={visible} onDismiss={hideDialog}>
                    <Dialog.Title>
                        {editingEvent ? t('addEntry.editTitle') : t('addEntry.addTitle')}
                    </Dialog.Title>
                    <Dialog.Content>
                        {!editingEvent && (
                            <TouchableOpacity onPress={() => {
                                Keyboard.dismiss();
                                setCreateDatePickerVisible(true);
                            }}>
                                <View pointerEvents="none">
                                    <TextInput
                                        label={t('addEntry.dateLabel')}
                                        value={getLocaleDateString(dialogDate, i18n.language)}
                                        mode="outlined"
                                        style={styles.dialogInput}
                                        editable={false}
                                        right={<TextInput.Icon icon="calendar" />}
                                    />
                                </View>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => {
                            Keyboard.dismiss();
                            setTimePickerVisible(true);
                        }}>
                            <View pointerEvents="none">
                                <TextInput
                                    label={t('dialog.timeLabel')}
                                    value={dialogTime}
                                    mode="outlined"
                                    style={styles.dialogInput}
                                    editable={false}
                                    right={<TextInput.Icon icon="clock-outline" />}
                                />
                            </View>
                        </TouchableOpacity>
                        <TextInput
                            label={t('dialog.noteLabel')}
                            value={dialogNote}
                            onChangeText={setDialogNote}
                            mode="outlined"
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Checkbox.Item
                            label={t('addEntry.lateEntryLabel')}
                            status={dialogIsLateEntry ? 'checked' : 'unchecked'}
                            onPress={() => setDialogIsLateEntry(!dialogIsLateEntry)}
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
    );
}

const styles = StyleSheet.create({
    container: {
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
    },
    dialogInput: {
        marginBottom: 10,
    },
    dateText: {
        minWidth: 230,
        textAlign: 'center',
    },
});
