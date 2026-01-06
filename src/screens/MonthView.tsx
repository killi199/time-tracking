import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
    Text,
    Card,
    List,
    Divider,
    useTheme,
} from 'react-native-paper';
import { EventListItem } from '../components/EventListItem';
import { TimeSeparator } from '../components/TimeSeparator';
import {
    getMonthEvents,
    getOverallStats,
} from '../db/database';
import { TimeEvent } from '../types';
import { useTranslation } from 'react-i18next';
import { formatTime, getFormattedDate } from '../utils/time';

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
                        const today = getFormattedDate(new Date());
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

            // Overall Balance (Target: total accumulated until end of this month)
            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr, 10);
            const monthNum = parseInt(monthStr, 10);
            const lastDay = new Date(year, monthNum, 0).getDate();
            const cutoffDate = `${month}-${String(lastDay).padStart(2, '0')}`;

            const { overallBalanceMinutes } = getOverallStats(cutoffDate);
            let finalOverallBalance = overallBalanceMinutes;

            // Add active session if exists (getOverallStats doesn't include active)
            const today = getFormattedDate(new Date());
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
        [month],
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
        const today = getFormattedDate(new Date());
        const todayEvents = events.filter(e => e.date === today);

        if (todayEvents.length % 2 === 0) return;

        const interval = setInterval(() => {
            calculateMetrics(events);
        }, 60000);

        return () => clearInterval(interval);
    }, [events, calculateMetrics]);

    const renderItem = ({
        item,
        index,
    }: {
        item: TimeEvent;
        index: number;
    }) => {
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
                <EventListItem
                    item={item}
                    type={type}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                />
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
                    ItemSeparatorComponent={(props) => (
                        <TimeSeparator {...props} events={events} />
                    )}
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
});
