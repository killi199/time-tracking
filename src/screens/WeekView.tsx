import { useState, useCallback, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Card, List, useTheme } from 'react-native-paper'
import { EventListItem } from '../components/EventListItem'
import { TimeSeparator } from '../components/TimeSeparator'
import { getEventsRange, getOverallStats } from '../db/database'
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

interface WeekViewProps {
    date: string
    onEditEvent: (event: TimeEvent, close?: () => void) => void
    onDeleteEvent: (event: TimeEvent, close?: () => void) => void
    refreshTrigger: number
}

export default function WeekView({
    date,
    onEditEvent,
    onDeleteEvent,
    refreshTrigger,
}: WeekViewProps) {
    const [events, setEvents] = useState<ProcessedEvent[]>([])
    const [weekWorked, setWeekWorked] = useState('00:00')
    const [weekBalance, setWeekBalance] = useState('+00:00')
    const [overallBalance, setOverallBalance] = useState('+00:00')

    const theme = useTheme()
    const { t, i18n } = useTranslation()

    const getWeekRange = useCallback((dateStr: string) => {
        const curr = new Date(dateStr)
        // If the date string parsing results in a different local day due to timezone,
        // we should be careful. strict YYYY-MM-DD parsing is usually safe if specific noon.
        // But simply new Date('2023-01-01') is UTC in some contexts or local in others.
        // Given existing code uses new Date(dateStr), let's stick to it but ensure consistency.

        const day = curr.getDay() // 0 (Sun) to 6 (Sat)
        // Mondays as start
        // if Sunday (0), we equate it to 7 to subtract 6 days to get Monday.
        // if Monday (1), we subtract 0.
        // formula: diff = getDate - (day === 0 ? 6 : day - 1)

        const diffToMonday = day === 0 ? 6 : day - 1
        const first = new Date(curr)
        first.setDate(curr.getDate() - diffToMonday)

        const last = new Date(first)
        last.setDate(first.getDate() + 6)

        return {
            start: getFormattedDate(first),
            end: getFormattedDate(last),
        }
    }, [])

    const calculateMetrics = useCallback(
        (currentEvents: TimeEvent[], startDate: string, endDate: string) => {
            // Weekly Statistics
            let totalMinutesWeek = 0
            const workedDays = new Set<string>()

            // Group events by date
            const eventsByDate: { [key: string]: TimeEvent[] } = {}
            currentEvents.forEach((event) => {
                if (!eventsByDate[event.date]) {
                    eventsByDate[event.date] = []
                }
                eventsByDate[event.date].push(event)
            })

            Object.keys(eventsByDate).forEach((d) => {
                const dayEvents = eventsByDate[d]
                dayEvents.sort((a, b) => a.time.localeCompare(b.time))

                let dayMinutes = 0
                for (let i = 0; i < dayEvents.length; i += 2) {
                    if (i + 1 < dayEvents.length) {
                        const start = new Date(`${d}T${dayEvents[i].time}`)
                        const end = new Date(`${d}T${dayEvents[i + 1].time}`)
                        const diff =
                            (end.getTime() - start.getTime()) / 1000 / 60
                        dayMinutes += diff
                    } else {
                        // Active session handling for today
                        const today = getFormattedDate(new Date())
                        if (d === today) {
                            const start = new Date(`${d}T${dayEvents[i].time}`)
                            const now = new Date()
                            const diff =
                                (now.getTime() - start.getTime()) / 1000 / 60
                            dayMinutes += diff
                        }
                    }
                }

                if (dayMinutes > 0) {
                    totalMinutesWeek += dayMinutes
                    workedDays.add(d)
                }
            })

            setWeekWorked(formatTime(totalMinutesWeek))

            // Week Balance (Target: 8 hours per worked day)
            const expectedMinutes = workedDays.size * 8 * 60
            const weekBalanceMinutes = totalMinutesWeek - expectedMinutes
            setWeekBalance(formatTime(weekBalanceMinutes, true))

            // Overall Balance
            // Usually calculated until "now" or end of the viewing period.
            // Let's match MonthView: getOverallStats until the end of this period.
            const { overallBalanceMinutes } = getOverallStats(endDate)
            let finalOverallBalance = overallBalanceMinutes

            // Add active session if exists
            const today = getFormattedDate(new Date())
            const todayEvents = eventsByDate[today] || []
            if (todayEvents.length % 2 !== 0) {
                const lastEvent = todayEvents[todayEvents.length - 1]
                const start = new Date(`${today}T${lastEvent.time}`)
                const now = new Date()
                const diff = (now.getTime() - start.getTime()) / 1000 / 60
                finalOverallBalance += diff
            }
            setOverallBalance(formatTime(finalOverallBalance, true))
        },
        [],
    )

    const processEvents = useCallback(
        (rawEvents: TimeEvent[]): ProcessedEvent[] => {
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
        },
        [],
    )

    const loadData = useCallback(() => {
        const { start, end } = getWeekRange(date)
        const loadedEvents = getEventsRange(start, end)
        const processed = processEvents(loadedEvents)
        setEvents(processed)
        calculateMetrics(loadedEvents, start, end)
    }, [date, calculateMetrics, processEvents, getWeekRange])

    useEffect(() => {
        loadData()
    }, [loadData, refreshTrigger])

    useEffect(() => {
        // Update metrics every minute if there is an active session
        const today = getFormattedDate(new Date())
        const todayEvents = events.filter((e) => e.date === today)

        if (todayEvents.length % 2 === 0) return

        const interval = setInterval(() => {
            // Re-calc metrics reuse the loaded events but we need the raw ones?
            // processEvents returns ProcessedEvent which extends TimeEvent, so it's fine.
            // But calculateMetrics expects TimeEvent[], which ProcessedEvent[] satisfies.
            // However, we need the original range.
            const { start, end } = getWeekRange(date)
            calculateMetrics(events, start, end)
        }, 60000)

        return () => clearInterval(interval)
    }, [events, calculateMetrics, date, getWeekRange])

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

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">{t('home.week')}</Text>
                            <Text variant="titleLarge">{weekWorked}</Text>
                        </View>
                        <View style={styles.metricItem}>
                            <Text variant="labelMedium">
                                {t('home.weekBalance')}
                            </Text>
                            <Text
                                variant="titleLarge"
                                style={{
                                    color: weekBalance.startsWith('-')
                                        ? theme.colors.error
                                        : theme.colors.primary,
                                }}
                            >
                                {weekBalance}
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
})
