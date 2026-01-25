import { Linking, Platform, ToastAndroid, BackHandler } from 'react-native'
import { getTodayEvents, addEvent } from '../db/database'
import { getFormattedTime, getFormattedDate } from '../utils/time'

const handleUrl = async (url: string | null) => {
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
                isWorking ? 'Auto check-out NFC' : 'Auto check-in NFC',
            )

            if (Platform.OS === 'android') {
                ToastAndroid.show(
                    isWorking
                        ? `Checked-out at ${timeString}`
                        : `Checked-in at ${timeString}`,
                    ToastAndroid.LONG,
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
    Linking.getInitialURL().then((url) => handleUrl(url))

    // Listen for updates
    const subscription = Linking.addEventListener(
        'url',
        (event: { url: string }) => {
            handleUrl(event.url)
        },
    )

    return () => subscription.remove()
}
