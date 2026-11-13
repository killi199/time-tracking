import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { RadioButton, List } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { getSetting, setSetting } from '../../db/database'

export default function CalendarSettingsScreen() {
    const { t } = useTranslation()
    const [calendarSystem, setCalendarSystem] = useState(() => {
        const saved = getSetting('calendar_system')
        return saved || 'gregorian'
    })

    const handleCalendarChange = (value: string) => {
        setCalendarSystem(value)
        setSetting('calendar_system', value)
    }

    return (
        <View style={styles.container}>
            <List.Section>
                <RadioButton.Group
                    onValueChange={handleCalendarChange}
                    value={calendarSystem}
                >
                    <List.Item
                        title={t('settings.calendarGregorian')}
                        left={() => <List.Icon icon="calendar" />}
                        right={() => <RadioButton value="gregorian" />}
                        onPress={() => {
                            handleCalendarChange('gregorian')
                        }}
                        style={styles.listItem}
                    />
                    <List.Item
                        title={t('settings.calendarJalali')}
                        left={() => <List.Icon icon="calendar-month-outline" />}
                        right={() => <RadioButton value="jalali" />}
                        onPress={() => {
                            handleCalendarChange('jalali')
                        }}
                        style={styles.listItem}
                    />
                </RadioButton.Group>
            </List.Section>
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
