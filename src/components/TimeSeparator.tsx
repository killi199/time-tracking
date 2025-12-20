import React from 'react';
import { View } from 'react-native';
import { Text, Divider, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { TimeEvent } from '../types';
import { formatTime } from '../utils/time';

interface TimeSeparatorProps {
    leadingItem: TimeEvent;
    events: TimeEvent[];
}

export const TimeSeparator = ({ leadingItem, events }: TimeSeparatorProps) => {
    const theme = useTheme();
    const { t } = useTranslation();

    const index = events.findIndex((e) => e.id === leadingItem.id);
    if (index === -1 || index >= events.length - 1) {
        return <Divider />;
    }

    const nextItem = events[index + 1];

    // If items are on different days, just show a divider
    if (leadingItem.date !== nextItem.date) {
        return <Divider />;
    }

    // Calculate duration
    const start = new Date(`${leadingItem.date}T${leadingItem.time}`);
    const end = new Date(`${nextItem.date}T${nextItem.time}`);
    const diffMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
    const duration = formatTime(diffMinutes);

    // Determine type (Work or Pause) based on index within the day
    const dayEvents = events.filter((e) => e.date === leadingItem.date);
    // Ensure day events are sorted exactly as they are in the full list or by time
    // The main list should already be sorted, but filtering preserves order.
    const indexInDay = dayEvents.findIndex((e) => e.id === leadingItem.id);

    // Even index in day = Check-in (Start) -> Next is Check-out -> Duration is Work
    // Odd index in day = Check-out (End) -> Next is Check-in -> Duration is Pause
    const isWork = indexInDay % 2 === 0;

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 4,
                paddingHorizontal: 16,
            }}
        >
            <Divider style={{ flex: 1 }} />
            <Text
                variant="bodySmall"
                style={{
                    marginHorizontal: 8,
                    color: theme.colors.outline,
                }}
            >
                {isWork ? t('home.work') : t('home.pause')}: {duration}
            </Text>
            <Divider style={{ flex: 1 }} />
        </View>
    );
};
