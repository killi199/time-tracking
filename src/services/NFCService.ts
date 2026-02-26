import { Linking, Platform, ToastAndroid, BackHandler } from 'react-native'
import { getTodayEvents, addEvent } from '../db/database'
import { getFormattedTime, getFormattedDate } from '../utils/time'
import i18next from 'i18next'

const handleUrl = (url: string | null) => {
    if (url && url.includes('timetracking')) {
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
                    ? i18next.t('nfc.checkoutEvent')
                    : i18next.t('nfc.checkinEvent'),
            )

            if (Platform.OS === 'android') {
                ToastAndroid.show(
                    isWorking
                        ? `${i18next.t('nfc.checkedOutAt')} ${timeString}`
                        : `${i18next.t('nfc.checkedInAt')} ${timeString}`,
                    ToastAndroid.SHORT,
                )
            }

            // Close app after short delay
            setTimeout(() => {
                BackHandler.exitApp()
            }, 1500)
        } catch (e) {
            console.error('Error handling NFC tag:', e)
        }
    }
}

export const initNfcService = () => {
    // Check initial URL
    void Linking.getInitialURL().then((url) => {
        handleUrl(url)
    })

    // Listen for updates
    const subscription = Linking.addEventListener(
        'url',
        (event: { url: string }) => {
            handleUrl(event.url)
        },
    )

    return () => {
        subscription.remove()
    }
}
