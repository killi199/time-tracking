import { useState, useCallback, useEffect, useMemo } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Card, useTheme, FAB } from 'react-native-paper'
import { EventListItem } from '../components/EventListItem'
import { TimeSeparator } from '../components/TimeSeparator'
import { getTodayEventsAsync, getOverallStatsAsync } from '../db/database'
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
}: Readonly<DayViewProps>) {
    const theme = useTheme()
    const { t } = useTranslation()

    const [rawEvents, setRawEvents] = useState<TimeEvent[]>([])
    const [baseOverallBalance, setBaseOverallBalance] = useState<number>(0)

    useEffect(() => {
        let isMounted = true

        const loadContent = async () => {
            const [loadedEvents, stats] = await Promise.all([
                getTodayEventsAsync(date),
                getOverallStatsAsync(date),
            ])

            if (isMounted) {
                setRawEvents(loadedEvents)
                setBaseOverallBalance(stats.overallBalanceMinutes)
            }
        }

        void loadContent()

        return () => {
            isMounted = false
        }
    }, [date, refreshTrigger])

    const events = useMemo(() => {
        const processed: ProcessedTimeEvent[] = []

        const sorted = [...rawEvents].sort((a, b) =>
            a.time.localeCompare(b.time),
        )

        for (let i = 0; i < sorted.length; i++) {
            const event = sorted[i]
            const type = i % 2 === 0 ? 'start' : 'end'

            let separatorData = {
                isSimpleDivider: true,
                label: '',
                isWork: false,
            }

            const next = i < sorted.length - 1 ? sorted[i + 1] : null
            if (next) {
                const start = new Date(`${event.date}T${event.time}`)
                const end = new Date(`${next.date}T${next.time}`)
                const diffMinutes =
                    (end.getTime() - start.getTime()) / 1000 / 60
                const duration = formatTime(diffMinutes)

                separatorData = {
                    isSimpleDivider: false,
                    label: duration,
                    isWork: i % 2 === 0,
                }
            }

            processed.push({
                ...event,
                type,
                showDateHeader: false,
                separatorData,
            })
        }
        return processed
    }, [rawEvents])

    const isToday = date === getFormattedDate(new Date())
    const isCheckedIn = events.length % 2 !== 0

    const [currentTime, setCurrentTime] = useState(() => Date.now())

    useEffect(() => {
        if (!isToday || !isCheckedIn) return

        const interval = setInterval(() => {
            setCurrentTime(Date.now())
        }, 60000)

        return () => {
            clearInterval(interval)
        }
    }, [isToday, isCheckedIn])

    const { todayWorked, dayBalance, overallBalance } = useMemo(() => {
        let totalMinutesToday = 0

        const sortedEvents = [...rawEvents].sort((a, b) =>
            a.time.localeCompare(b.time),
        )

        for (let i = 0; i < sortedEvents.length; i += 2) {
            if (i + 1 < sortedEvents.length) {
                const start = new Date(`${date}T${sortedEvents[i].time}`)
                const end = new Date(`${date}T${sortedEvents[i + 1].time}`)
                const diff = (end.getTime() - start.getTime()) / 1000 / 60
                totalMinutesToday += diff
            } else {
                const start = new Date(`${date}T${sortedEvents[i].time}`)
                if (isToday) {
                    const diff = (currentTime - start.getTime()) / 1000 / 60
                    totalMinutesToday += diff
                }
            }
        }

        const todayWorkedStr = formatTime(totalMinutesToday)

        const dayBalanceMinutes = totalMinutesToday - 480
        const dayBalanceStr = formatTime(dayBalanceMinutes, true)

        let finalOverallBalance = baseOverallBalance

        if (isToday && sortedEvents.length % 2 !== 0) {
            const lastEvent = sortedEvents[sortedEvents.length - 1]
            const start = new Date(`${date}T${lastEvent.time}`)
            const diff = (currentTime - start.getTime()) / 1000 / 60
            finalOverallBalance += diff
        }

        const overallBalanceStr = formatTime(finalOverallBalance, true)

        return {
            todayWorked: todayWorkedStr,
            dayBalance: dayBalanceStr,
            overallBalance: overallBalanceStr,
        }
    }, [rawEvents, date, isToday, currentTime, baseOverallBalance])

    const renderItem = useCallback(
        ({ item }: { item: ProcessedTimeEvent; index: number }) => {
            return (
                <EventListItem
                    item={item}
                    type={item.type}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                />
            )
        },
        [onEditEvent, onDeleteEvent],
    )

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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
