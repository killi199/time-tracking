import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { List, Snackbar } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import AdaptiveDateTimePicker from '../../components/AdaptiveDateTimePicker'
import { getDailyTargetMinutes, setDailyTargetMinutes } from '../../db/database'
import { getFormattedDate } from '../../utils/time'

export default function SettingsScreen() {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const [dailyTarget, setDailyTarget] = useState(() =>
        getDailyTargetMinutes(getFormattedDate(new Date())),
    )
    const [workHoursPickerVisible, setWorkHoursPickerVisible] = useState(false)
    const [snackbarText, setSnackbarText] = useState<string | null>(null)

    const targetHours = Math.floor(dailyTarget / 60)
    const targetMinutes = dailyTarget % 60

    const handleWorkHoursConfirm = (date: Date) => {
        const minutes = date.getHours() * 60 + date.getMinutes()
        setWorkHoursPickerVisible(false)
        if (minutes === 0) {
            setSnackbarText(t('settings.workHoursInvalid'))
            return
        }
        setDailyTargetMinutes(minutes, getFormattedDate(new Date()))
        setDailyTarget(minutes)
        setSnackbarText(t('settings.workHoursEffectiveNote'))
    }

    return (
        <View style={styles.container}>
            <List.Section>
                <List.Item
                    title={t('settings.language')}
                    left={() => <List.Icon icon="translate" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() => {
                        router.push('/language-settings')
                    }}
                    style={styles.listItem}
                />
                <List.Item
                    title={t('settings.workHours')}
                    description={`${String(targetHours)} h ${String(targetMinutes)} min`}
                    left={() => <List.Icon icon="clock-outline" />}
                    onPress={() => {
                        setWorkHoursPickerVisible(true)
                    }}
                    style={styles.listItem}
                />
            </List.Section>

            <AdaptiveDateTimePicker
                visible={workHoursPickerVisible}
                onDismiss={() => {
                    setWorkHoursPickerVisible(false)
                }}
                onConfirm={handleWorkHoursConfirm}
                // Fixed DST-free date: only hours/minutes are read from it
                value={new Date(2000, 0, 1, targetHours, targetMinutes)}
                mode="time"
                is24Hour={true}
                locale={i18n.language}
                cancelLabel={t('common.cancel')}
                confirmLabel={t('common.confirm')}
            />

            <Snackbar
                visible={snackbarText !== null}
                onDismiss={() => {
                    setSnackbarText(null)
                }}
            >
                {snackbarText}
            </Snackbar>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listItem: {
        paddingHorizontal: 16,
    },
})
