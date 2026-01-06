import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import {
    Button,
    Text,
    IconButton,
    Portal,
    Dialog,
    TextInput,
    useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import {
    addEvent,
    updateEvent,
    deleteEvent,
    getTodayEvents,
} from '../db/database';
import { TimeEvent } from '../types';
import { useTranslation } from 'react-i18next';
import { getFormattedTime, getFormattedDate } from '../utils/time';
import DayView from './DayView';
import MonthView from './MonthView';

export default function HomeScreen({
    navigation,
    route,
}: {
    navigation: any;
    route: any;
}) {
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
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
    const [dialogTime, setDialogTime] = useState('');
    const [dialogNote, setDialogNote] = useState('');
    const [editingEvent, setEditingEvent] = useState<TimeEvent | null>(null);

    // Delete Dialog State
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
        navigation.setOptions({
            title: viewMode === 'month' ? t('home.month') : t('home.day'),
        });
    }, [navigation, viewMode, t]);

    const changeDate = (step: number) => {
        if (viewMode === 'month') {
            const date = new Date(`${currentMonth}-01`);
            date.setMonth(date.getMonth() + step);
            setCurrentMonth(date.toISOString().slice(0, 7));
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

    const formattedDate =
        viewMode === 'month'
            ? new Date(`${currentMonth}-01`).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'long',
            })
            : new Date(currentDate).toLocaleDateString(i18n.language, {
                weekday: 'short',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
            });

    const showEditDialog = (item: TimeEvent) => {
        setDialogTime(item.time);
        setDialogNote(item.note || '');
        setEditingEvent(item);
        setVisible(true);
    };

    const hideDialog = () => {
        setVisible(false);
        setEditingEvent(null);
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
            );
        } else {
            addEvent(currentDate, dialogTime, dialogNote);
        }

        setRefreshTrigger(prev => prev + 1);
        hideDialog();
    };

    const showDeleteDialog = (item: TimeEvent) => {
        setItemToDelete(item);
        setDeleteDialogVisible(true);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        deleteEvent(itemToDelete.id);
        setRefreshTrigger(prev => prev + 1);
        setDeleteDialogVisible(false);
        setItemToDelete(null);
    };

    const cancelDelete = () => {
        setDeleteDialogVisible(false);
        setItemToDelete(null);
    };

    const isToday = currentDate === getFormattedDate(new Date());
    const showBackToToday = !isToday || viewMode === 'month';

    // Check if checked in for dialog title (only relevant for today/add)
    // We need to know if we are checked in to show correct title in Add Dialog
    // Ideally DayView should pass this up, or we just check quickly here.
    // Since we don't have the events here anymore, we might need a quick check or just default.
    // However, for the title "Check In" vs "Check Out", it depends on the LAST event of TODAY.
    // Let's fetch today events just for this status if needed, or pass it from DayView?
    // Passing from DayView is cleaner but requires callback.
    // For now, let's just do a quick fetch or assume Check In if we don't know.
    // Actually, we can just fetch today's events when opening the dialog if it's for today.

    const [isCheckedIn, setIsCheckedIn] = useState(false);

    useEffect(() => {
        if (visible && !editingEvent) {
            // Only check when opening add dialog
            const todayEvents = getTodayEvents(getFormattedDate(new Date()));
            setIsCheckedIn(todayEvents.length % 2 !== 0);
        }
    }, [visible, editingEvent]);

    const handleAddEvent = () => {
        const now = new Date();
        const timeString = getFormattedTime(now);
        addEvent(currentDate, timeString, null);
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.dateNav}>
                    <IconButton
                        icon="chevron-left"
                        onPress={() => changeDate(-1)}
                    />
                    <Text variant="titleLarge" style={styles.dateText}>{formattedDate}</Text>
                    <IconButton
                        icon="chevron-right"
                        onPress={() => changeDate(1)}
                    />
                </View>
                <Button mode="contained-tonal" onPress={goToToday} disabled={!showBackToToday}>
                    {t('home.backToToday')}
                </Button>
            </View>

            {viewMode === 'day' ? (
                <DayView
                    date={currentDate}
                    onEditEvent={showEditDialog}
                    onDeleteEvent={showDeleteDialog}
                    onAddEvent={handleAddEvent}
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
                        {editingEvent
                            ? t('addEntry.editTitle')
                            : isCheckedIn
                                ? t('dialog.checkOutTitle')
                                : t('dialog.checkInTitle')}
                    </Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label={t('dialog.timeLabel')}
                            value={dialogTime}
                            onChangeText={setDialogTime}
                            mode="outlined"
                            style={styles.dialogInput}
                        />
                        <TextInput
                            label={t('dialog.noteLabel')}
                            value={dialogNote}
                            onChangeText={setDialogNote}
                            mode="outlined"
                            multiline
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
