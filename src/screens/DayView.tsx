import React, { useState, useCallback, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Card, List, Divider, useTheme, FAB } from 'react-native-paper'
import { EventListItem } from '../components/EventListItem'
import { TimeSeparator } from '../components/TimeSeparator'
import { getTodayEvents, getOverallStats } from '../db/database'
import { TimeEvent, ProcessedTimeEvent } from '../types'
import { useTranslation } from 'react-i18next'
import { formatTime, getFormattedDate } from '../utils/time'

interface DayViewProps {
    date: string
    onEditEvent: (event: TimeEvent, close?: () => void) => void
    onDeleteEvent: (event: TimeEvent, close?: () => void) => void
    onAddEvent: () => void
    refreshTrigger: number
}

export default function DayView({
    date,
    onEditEvent,
    onDeleteEvent,
    onAddEvent,
    refreshTrigger,
}: DayViewProps) {
    const [events, setEvents] = useState<ProcessedTimeEvent[]>([])
    const [todayWorked, setTodayWorked] = useState('00:00')
    const [dayBalance, setDayBalance] = useState('+00:00')
    const [overallBalance, setOverallBalance] = useState('+00:00')

    const theme = useTheme()
    const { t } = useTranslation()

    const calculateMetrics = useCallback(
        (currentEvents: TimeEvent[]) => {
            let totalMinutesToday = 0

            // Sort events by time just in case
            const sortedEvents = [...currentEvents].sort((a, b) =>
                a.time.localeCompare(b.time),
            )

            for (let i = 0; i < sortedEvents.length; i += 2) {
                if (i + 1 < sortedEvents.length) {
                    // Pair: Start -> End
                    const start = new Date(`${date}T${sortedEvents[i].time}`)
                    const end = new Date(`${date}T${sortedEvents[i + 1].time}`)
                    const diff = (end.getTime() - start.getTime()) / 1000 / 60
                    totalMinutesToday += diff
                } else {
                    // Unpaired: Start -> Now (Active Session)
                    const start = new Date(`${date}T${sortedEvents[i].time}`)
                    const now = new Date()
                    // Only count if today is actually today
                    const today = getFormattedDate(new Date())
                    if (date === today) {
                        const diff =
                            (now.getTime() - start.getTime()) / 1000 / 60
                        totalMinutesToday += diff
                    }
                }
            }

            setTodayWorked(formatTime(totalMinutesToday))

            // 2. Day Balance (Target: 8 hours = 480 minutes)
            const dayBalanceMinutes = totalMinutesToday - 480
            setDayBalance(formatTime(dayBalanceMinutes, true))

            // 3. Overall Balance
            const { overallBalanceMinutes } = getOverallStats(date)

            // Add today's active session to overall balance if any
            let finalOverallBalance = overallBalanceMinutes

            if (
                date === getFormattedDate(new Date()) &&
                sortedEvents.length % 2 !== 0
            ) {
                const lastEvent = sortedEvents[sortedEvents.length - 1]
                const start = new Date(`${date}T${lastEvent.time}`)
                const now = new Date()
                const diff = (now.getTime() - start.getTime()) / 1000 / 60
                finalOverallBalance += diff
            }

            setOverallBalance(formatTime(finalOverallBalance, true))
        },
        [date],
    )

    const processEvents = useCallback(
        (rawEvents: TimeEvent[]): ProcessedTimeEvent[] => {
            const processed: ProcessedTimeEvent[] = []

            // Sort just in case, though getTodayEvents should already sort
            const sorted = [...rawEvents].sort((a, b) =>
                a.time.localeCompare(b.time),
            )

            for (let i = 0; i < sorted.length; i++) {
                const event = sorted[i]
                const type = i % 2 === 0 ? 'start' : 'end' // Even=Start, Odd=End in DayView

                let separatorData = {
                    isSimpleDivider: true,
                    label: '',
                    isWork: false,
                }

                const next = i < sorted.length - 1 ? sorted[i + 1] : null
                if (next) {
                    // Same day is guaranteed in DayView
                    const start = new Date(`${event.date}T${event.time}`)
                    const end = new Date(`${next.date}T${next.time}`)
                    const diffMinutes =
                        (end.getTime() - start.getTime()) / 1000 / 60
                    const duration = formatTime(diffMinutes)

                    separatorData = {
                        isSimpleDivider: false,
                        label: duration,
                        isWork: i % 2 === 0, // Even index (Check-in) -> Next is Check-out -> Duration is Work
                    }
                }

                processed.push({
                    ...event,
                    type,
                    showDateHeader: false, // DayView handles its own context, no date headers inside list usually
                    separatorData,
                })
            }
            return processed
        },
        [],
    )

    const loadData = useCallback(() => {
        const loadedEvents = getTodayEvents(date)
        const processed = processEvents(loadedEvents)
        setEvents(processed)
        calculateMetrics(loadedEvents)
    }, [date, calculateMetrics, processEvents])

    useEffect(() => {
        loadData()
    }, [loadData, refreshTrigger])

    useEffect(() => {
        // Update metrics every minute if there is an active session
        if (events.length % 2 === 0) return

        const interval = setInterval(() => {
            const today = getFormattedDate(new Date())
            if (date === today) {
                calculateMetrics(events)
            }
        }, 60000)

        return () => clearInterval(interval)
    }, [events, date, calculateMetrics])

    const renderItem = useCallback(
        ({ item }: { item: ProcessedTimeEvent; index: number }) => {
            return (
                <EventListItem
                    item={item}
                    // @ts-ignore - ProcessedTimeEvent type vs literal string
                    type={item.type}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                />
            )
        },
        [onEditEvent, onDeleteEvent],
    )

    const isToday = date === getFormattedDate(new Date())
    const isCheckedIn = events.length % 2 !== 0

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">{t('home.today')}</Text>
                            <Text variant="titleLarge">{todayWorked}</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">
                                {t('home.dayBalance')}
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

                    {isToday && (
                        <View style={styles.statusContainer}>
                            <Text
                                variant="titleMedium"
                                style={{
                                    color: isCheckedIn
                                        ? theme.colors.primary
                                        : theme.colors.secondary,
                                }}
                            >
                                {isCheckedIn
                                    ? t('home.currentlyWorking')
                                    : t('home.notWorking')}
                            </Text>
                        </View>
                    )}
                </Card.Content>
            </Card>

            <View style={styles.listContainer}>
                <FlatList
                    data={events}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ItemSeparatorComponent={(props) => (
                        <TimeSeparator {...props} />
                    )}
                />
            </View>

            {isToday && (
                <FAB
                    icon={isCheckedIn ? 'stop' : 'play'}
                    label={isCheckedIn ? t('home.checkOut') : t('home.checkIn')}
                    style={[
                        styles.fab,
                        {
                            backgroundColor: isCheckedIn
                                ? theme.colors.errorContainer
                                : theme.colors.primaryContainer,
                        },
                    ]}
                    onPress={onAddEvent}
                />
            )}
        </View>
    )
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
    statusContainer: {
        alignItems: 'center',
        marginTop: 5,
    },
    listContainer: {
        flex: 1,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
})
