import { memo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { List, useTheme } from 'react-native-paper'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'

import { useTranslation } from 'react-i18next'
import { TimeEvent } from '../types'

interface EventListItemProps {
    item: TimeEvent
    type: 'start' | 'end'
    onEdit: (event: TimeEvent, close?: () => void) => void
    onDelete: (event: TimeEvent, close?: () => void) => void
}

export const EventListItem = memo(
    ({ item, type, onEdit, onDelete }: EventListItemProps) => {
        const theme = useTheme()
        const { t } = useTranslation()
        const swipeableRef = useRef<any>(null)

        const renderRightActions = () => (
            <View style={styles.deleteAction}>
                <List.Icon icon="delete" color="white" />
            </View>
        )

        const renderLeftActions = () => (
            <View style={styles.editAction}>
                <List.Icon icon="pencil" color="white" />
            </View>
        )

        return (
            <ReanimatedSwipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                renderLeftActions={renderLeftActions}
                onSwipeableOpen={(direction) => {
                    const close = () => swipeableRef.current?.close()
                    if (direction === 'right') {
                        onEdit(item, close)
                    } else {
                        onDelete(item, close)
                    }
                }}
            >
                <List.Item
                    title={`${type === 'start' ? t('home.checkIn') : t('home.checkOut')} ${t('home.at')} ${item.time}${item.isManualEntry ? ' ' + t('home.lateEntry') : ''}`}
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
        )
    },
)

const styles = StyleSheet.create({
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
})
