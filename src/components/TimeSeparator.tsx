import React from 'react'
import { View } from 'react-native'
import { Text, Divider, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { TimeEvent, ProcessedTimeEvent } from '../types'
import { formatTime } from '../utils/time'

interface TimeSeparatorProps {
    leadingItem: TimeEvent
}

export const TimeSeparator = ({ leadingItem }: TimeSeparatorProps) => {
    const theme = useTheme()
    const { t } = useTranslation()

    let isSimpleDivider = true
    let label = ''
    let isWork = false

    // Fast path: Check if we have pre-calculated separator data
    const processedItem = leadingItem as ProcessedTimeEvent

    if (processedItem.separatorData) {
        ;({ isSimpleDivider, label, isWork } = processedItem.separatorData)
    } else {
        // Fallback or empty state if no separator data is present
        // This effectively means we just return null or default
        return null
    }

    if (isSimpleDivider) {
        return <Divider />
    }

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
                {isWork ? t('home.work') : t('home.pause')}: {label}
            </Text>
            <Divider style={{ flex: 1 }} />
        </View>
    )
}
