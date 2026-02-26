import * as QuickActions from 'expo-quick-actions'
import { Platform, ToastAndroid } from 'react-native'
import { getTodayEvents, addEvent } from '../db/database'
import { getFormattedTime, getFormattedDate } from '../utils/time'

import i18next from 'i18next'

export const initQuickActions = () => {
    void QuickActions.setItems([
        {
            title: i18next.t('quickAction.title'),
            subtitle: i18next.t('quickAction.subtitle'),
            icon: Platform.OS === 'ios' ? 'timer' : 'shortcut_timer',
            id: 'toggle_status',
            userInfo: { url: 'time-tracking://toggle_status' },
        },
    ])

    const handleAction = (action: QuickActions.Action | null) => {
        if (!action) return

        if (action.id === 'toggle_status') {
            try {
                const today = getFormattedDate(new Date())
                const events = getTodayEvents(today)
                const isWorking = events.length % 2 !== 0

                const now = new Date()
                const timeString = getFormattedTime(now)

                addEvent(
                    today,
                    timeString,
                    isWorking
                        ? i18next.t('quickAction.checkoutEvent')
                        : i18next.t('quickAction.checkinEvent'),
                )

                if (Platform.OS === 'android') {
                    ToastAndroid.show(
                        isWorking
                            ? `${i18next.t('quickAction.checkedOutAt')} ${timeString}`
                            : `${i18next.t('quickAction.checkedInAt')} ${timeString}`,
                        ToastAndroid.SHORT,
                    )
                }
            } catch (e) {
                console.error('Error handling Quick Action:', e)
            }
        }
    }

    // Check if app was started from a quick action
    if (QuickActions.initial) {
        handleAction(QuickActions.initial)
    }

    // Listen to quick actions while app is running
    const subscription = QuickActions.addListener((action) => {
        handleAction(action)
    })

    return () => {
        subscription.remove()
    }
}
