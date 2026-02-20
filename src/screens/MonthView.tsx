import { useState, useCallback, useEffect, useMemo } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Card, List, useTheme } from 'react-native-paper'
import { EventListItem } from '../components/EventListItem'
import { TimeSeparator } from '../components/TimeSeparator'
import { ViewSkeleton } from '../components/ViewSkeleton'
import { getMonthEventsAsync, getOverallStatsAsync } from '../db/database'
import { TimeEvent } from '../types'
import { useTranslation } from 'react-i18next'
import { formatTime, getFormattedDate } from '../utils/time'

interface ProcessedEvent extends TimeEvent {
    type: 'start' | 'end'
    showDateHeader: boolean
    separatorData: {
        isSimpleDivider: boolean
        label: string
        isWork: boolean
    }
}

interface MonthViewProps {
    month: string
    onEditEvent: (event: TimeEvent, close?: () => void) => void
    onDeleteEvent: (event: TimeEvent, close?: () => void) => void
    refreshTrigger: number
}

export default function MonthView({
    month,
    onEditEvent,
    onDeleteEvent,
    refreshTrigger,
}: Readonly<MonthViewProps>) {
    const theme = useTheme()
    const { t, i18n } = useTranslation()

    const [rawEvents, setRawEvents] = useState<TimeEvent[]>([])
    const [baseOverallBalance, setBaseOverallBalance] = useState<number>(0)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const loadContent = async () => {
            setIsLoading(true)
            const [yearStr, monthStr] = month.split('-')
            const year = parseInt(yearStr, 10)
            const monthNum = parseInt(monthStr, 10)
            const lastDay = new Date(year, monthNum, 0).getDate()
            const cutoffDate = `${month}-${String(lastDay).padStart(2, '0')}`

            const [loadedEvents, stats] = await Promise.all([
                getMonthEventsAsync(month),
                getOverallStatsAsync(cutoffDate),
            ])

            if (isMounted) {
                setRawEvents(loadedEvents)
                setBaseOverallBalance(stats.overallBalanceMinutes)
                setIsLoading(false)
            }
        }

        void loadContent()

        return () => {
            isMounted = false
        }
    }, [month, refreshTrigger])

    const events = useMemo(() => {
        const processed: ProcessedEvent[] = []
        let currentDay = ''
        let indexInDay = 0

        for (let i = 0; i < rawEvents.length; i++) {
            const event = rawEvents[i]

            if (event.date !== currentDay) {
                currentDay = event.date
                indexInDay = 0
            } else {
                indexInDay++
            }

            const type = indexInDay % 2 === 0 ? 'start' : 'end'
            const showDateHeader = indexInDay === 0

            let separatorData = {
                isSimpleDivider: true,
                label: '',
                isWork: false,
            }

            const next = i < rawEvents.length - 1 ? rawEvents[i + 1] : null
            if (next && next.date === event.date) {
                const start = new Date(`${event.date}T${event.time}`)
                const end = new Date(`${next.date}T${next.time}`)
                const diffMinutes =
                    (end.getTime() - start.getTime()) / 1000 / 60
                const duration = formatTime(diffMinutes)

                separatorData = {
                    isSimpleDivider: false,
                    label: duration,
                    isWork: indexInDay % 2 === 0,
                }
            }

            processed.push({
                ...event,
                type,
                showDateHeader,
                separatorData,
            })
        }
        return processed
    }, [rawEvents])

    const isActiveSession = useMemo(() => {
        const today = getFormattedDate(new Date())
        const todayEvents = events.filter((e) => e.date === today)
        return todayEvents.length % 2 !== 0
    }, [events])

    const [currentTime, setCurrentTime] = useState(() => Date.now())

    useEffect(() => {
        if (!isActiveSession) return
        const interval = setInterval(() => {
            setCurrentTime(Date.now())
        }, 60000)
        return () => {
            clearInterval(interval)
        }
    }, [isActiveSession])

    const { todayWorked, dayBalance, overallBalance } = useMemo(() => {
        let totalMinutesMonth = 0
        const workedDays = new Set<string>()

        const eventsByDate: { [key: string]: TimeEvent[] | undefined } = {}
        rawEvents.forEach((event) => {
            if (!eventsByDate[event.date]) {
                eventsByDate[event.date] = []
            }
            eventsByDate[event.date]?.push(event)
        })

        Object.keys(eventsByDate).forEach((date) => {
            const dayEvents = eventsByDate[date]
            if (!dayEvents) return

            dayEvents.sort((a, b) => a.time.localeCompare(b.time))

            let dayMinutes = 0
            for (let i = 0; i < dayEvents.length; i += 2) {
                if (i + 1 < dayEvents.length) {
                    const start = new Date(`${date}T${dayEvents[i].time}`)
                    const end = new Date(`${date}T${dayEvents[i + 1].time}`)
                    const diff = (end.getTime() - start.getTime()) / 1000 / 60
                    dayMinutes += diff
                } else {
                    const today = getFormattedDate(new Date())
                    if (date === today) {
                        const start = new Date(`${date}T${dayEvents[i].time}`)
                        const diff = (currentTime - start.getTime()) / 1000 / 60
                        dayMinutes += diff
                    }
                }
            }

            if (dayMinutes > 0) {
                totalMinutesMonth += dayMinutes
                workedDays.add(date)
            }
        })

        const todayWorkedStr = formatTime(totalMinutesMonth)

        const expectedMinutes = workedDays.size * 8 * 60
        const monthBalanceMinutes = totalMinutesMonth - expectedMinutes
        const dayBalanceStr = formatTime(monthBalanceMinutes, true)

        let finalOverallBalance = baseOverallBalance

        const today = getFormattedDate(new Date())
        const todayEvents = eventsByDate[today] || []
        if (todayEvents.length % 2 !== 0) {
            const lastEvent = todayEvents[todayEvents.length - 1]
            const start = new Date(`${today}T${lastEvent.time}`)
            const diff = (currentTime - start.getTime()) / 1000 / 60
            finalOverallBalance += diff
        }
        const overallBalanceStr = formatTime(finalOverallBalance, true)

        return {
            todayWorked: todayWorkedStr,
            dayBalance: dayBalanceStr,
            overallBalance: overallBalanceStr,
        }
    }, [rawEvents, currentTime, baseOverallBalance])

    const renderItem = useCallback(
        ({ item }: { item: ProcessedEvent; index: number }) => {
            return (
                <View>
                    {item.showDateHeader && (
                        <List.Subheader>
                            {new Date(item.date).toLocaleDateString(
                                i18n.language,
                                {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'numeric',
                                },
                            )}
                        </List.Subheader>
                    )}
                    <EventListItem
                        item={item}
                        type={item.type}
                        onEdit={onEditEvent}
                        onDelete={onDeleteEvent}
                    />
                </View>
            )
        },
        [i18n.language, onEditEvent, onDeleteEvent],
    )

    if (isLoading) {
        return <ViewSkeleton />
    }

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">{t('home.month')}</Text>
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
                        <TimeSeparator {...props} />
                    )}
                />
            </View>
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
    listContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
