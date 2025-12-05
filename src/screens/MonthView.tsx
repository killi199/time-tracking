import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
    Text,
    Card,
    List,
    Divider,
    useTheme,
} from 'react-native-paper';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import {
    getMonthEvents,
    getOverallStats,
} from '../db/database';
import { TimeEvent } from '../types';
import { useTranslation } from 'react-i18next';

interface MonthViewProps {
    month: string;
    onEditEvent: (event: TimeEvent) => void;
    onDeleteEvent: (event: TimeEvent) => void;
    refreshTrigger: number;
}

export default function MonthView({
    month,
    onEditEvent,
    onDeleteEvent,
    refreshTrigger,
}: MonthViewProps) {
    const [events, setEvents] = useState<TimeEvent[]>([]);
    const [todayWorked, setTodayWorked] = useState('00:00');
    const [dayBalance, setDayBalance] = useState('+00:00');
    const [overallBalance, setOverallBalance] = useState('+00:00');

    const theme = useTheme();
    const { t, i18n } = useTranslation();

    // Helper to format minutes to HH:MM or +HH:MM
    const formatTime = (totalMinutes: number, showSign = false) => {
        const isNegative = totalMinutes < 0;
        const absMinutes = Math.abs(totalMinutes);
        const hours = Math.floor(absMinutes / 60);
        const minutes = Math.floor(absMinutes % 60);
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        if (showSign) {
            return isNegative ? `-${timeString}` : `+${timeString}`;
        }
        return timeString;
    };

    const calculateMetrics = useCallback(
        (currentEvents: TimeEvent[]) => {
            // Monthly Statistics
            let totalMinutesMonth = 0;
            const workedDays = new Set<string>();

            // Group events by date
            const eventsByDate: { [key: string]: TimeEvent[] } = {};
            currentEvents.forEach((event) => {
                if (!eventsByDate[event.date]) {
                    eventsByDate[event.date] = [];
                }
                eventsByDate[event.date].push(event);
            });

            Object.keys(eventsByDate).forEach((date) => {
                const dayEvents = eventsByDate[date];
                dayEvents.sort((a, b) => a.time.localeCompare(b.time));

                let dayMinutes = 0;
                for (let i = 0; i < dayEvents.length; i += 2) {
                    if (i + 1 < dayEvents.length) {
                        const start = new Date(
                            `${date}T${dayEvents[i].time}`,
                        );
                        const end = new Date(
                            `${date}T${dayEvents[i + 1].time}`,
                        );
                        const diff =
                            (end.getTime() - start.getTime()) / 1000 / 60;
                        dayMinutes += diff;
                    } else {
                        // Active session handling for today
                        const today = new Date()
                            .toISOString()
                            .split('T')[0];
                        if (date === today) {
                            const start = new Date(
                                `${date}T${dayEvents[i].time}`,
                            );
                            const now = new Date();
                            const diff =
                                (now.getTime() - start.getTime()) /
                                1000 /
                                60;
                            dayMinutes += diff;
                        }
                    }
                }

                if (dayMinutes > 0) {
                    totalMinutesMonth += dayMinutes;
                    workedDays.add(date);
                }
            });

            setTodayWorked(formatTime(totalMinutesMonth));

            // Month Balance (Target: 8 hours per worked day)
            const expectedMinutes = workedDays.size * 8 * 60;
            const monthBalanceMinutes = totalMinutesMonth - expectedMinutes;
            setDayBalance(formatTime(monthBalanceMinutes, true));

            // Overall Balance (Always calculated globally)
            const { overallBalanceMinutes } = getOverallStats();
            let finalOverallBalance = overallBalanceMinutes;

            // Add active session if exists (getOverallStats doesn't include active)
            const today = new Date().toISOString().split('T')[0];
            const todayEvents = eventsByDate[today] || [];
            if (todayEvents.length % 2 !== 0) {
                const lastEvent = todayEvents[todayEvents.length - 1];
                const start = new Date(`${today}T${lastEvent.time}`);
                const now = new Date();
                const diff = (now.getTime() - start.getTime()) / 1000 / 60;
                finalOverallBalance += diff;
            }
            setOverallBalance(formatTime(finalOverallBalance, true));
        },
        [],
    );

    const loadData = useCallback(() => {
        const loadedEvents = getMonthEvents(month);
        setEvents(loadedEvents);
        calculateMetrics(loadedEvents);
    }, [month, calculateMetrics]);

    useEffect(() => {
        loadData();
    }, [loadData, refreshTrigger]);

    useEffect(() => {
        // Update metrics every minute if there is an active session
        // Check if there's any active session in the loaded events (only for today)
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = events.filter(e => e.date === today);

        if (todayEvents.length % 2 === 0) return;

        const interval = setInterval(() => {
            calculateMetrics(events);
        }, 60000);

        return () => clearInterval(interval);
    }, [events, calculateMetrics]);

    const renderRightActions = (item: TimeEvent) => (
        <RectButton
            style={styles.deleteAction}
            onPress={() => onDeleteEvent(item)}
        >
            <List.Icon icon="delete" color="white" />
        </RectButton>
    );

    const renderLeftActions = (item: TimeEvent) => (
        <RectButton
            style={styles.editAction}
            onPress={() => onEditEvent(item)}
        >
            <List.Icon icon="pencil" color="white" />
        </RectButton>
    );

    const renderItem = ({
        item,
        index,
    }: {
        item: TimeEvent;
        index: number;
    }) => {
        // Even index = Check-in (Start), Odd index = Check-out (End)
        // Note: In month view, we need to be careful with index if we just flat list all events.
        // However, getMonthEvents returns all events.
        // We need to determine if it's start or end based on the daily sequence.
        // But here we are iterating over a flat list of ALL month events.
        // We need to know the index WITHIN the day.

        // Let's find the index of this event within its day
        const dayEvents = events.filter(e => e.date === item.date);
        const eventIndexInDay = dayEvents.findIndex(e => e.id === item.id);

        const type = eventIndexInDay % 2 === 0 ? 'start' : 'end';

        const showDateHeader =
            index === 0 || events[index - 1].date !== item.date;

        return (
            <View>
                {showDateHeader && (
                    <List.Subheader>
                        {new Date(item.date).toLocaleDateString(i18n.language, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'numeric',
                        })}
                    </List.Subheader>
                )}
                <ReanimatedSwipeable
                    renderRightActions={() => renderRightActions(item)}
                    renderLeftActions={() => renderLeftActions(item)}
                >
                    <List.Item
                        title={`${type === 'start' ? t('home.checkIn') : t('home.checkOut')} at ${item.time}`}
                        description={item.note}
                        left={(props) => (
                            <List.Icon
                                {...props}
                                icon={type === 'start' ? 'login' : 'logout'}
                                color={
                                    type === 'start'
                                        ? theme.colors.primary
                                        : theme.colors.error
                                }
                            />
                        )}
                        style={{
                            backgroundColor: theme.colors.elevation.level1,
                        }}
                    />
                </ReanimatedSwipeable>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">
                                {t('home.month')}
                            </Text>
                            <Text variant="titleLarge">{todayWorked}</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">
                                {t('home.monthBalance')}
                            </Text>
                            <Text
                                variant="titleLarge"
                                style={{
                                    color: dayBalance.startsWith('-')
                                        ? theme.colors.error
                                        : theme.colors.primary,
                                }}
                            >
                                {dayBalance}
                            </Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">
                                {t('home.overall')}
                            </Text>
                            <Text
                                variant="titleLarge"
                                style={{
                                    color: overallBalance.startsWith('-')
                                        ? theme.colors.error
                                        : theme.colors.primary,
                                }}
                            >
                                {overallBalance}
                            </Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.listContainer}>
                <FlatList
                    data={events}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ItemSeparatorComponent={Divider}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        margin: 16,
        marginTop: 0,
        elevation: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    metricItem: {
        alignItems: 'center',
    },
    listContainer: {
        flex: 1,
    },
    deleteAction: {
        backgroundColor: '#dd2c00',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    editAction: {
        backgroundColor: '#2196f3',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
});
