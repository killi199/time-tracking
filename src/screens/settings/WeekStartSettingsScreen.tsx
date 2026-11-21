import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { RadioButton, List } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { setSetting } from '../../db/database'
import { FirstDayOfWeek, getSavedFirstDayOfWeek } from '../../utils/calendar'

export default function WeekStartSettingsScreen() {
    const { t } = useTranslation()
    const [firstDayOfWeek, setFirstDayOfWeek] = useState<FirstDayOfWeek>(
        getSavedFirstDayOfWeek,
    )

    const handleFirstDayChange = (value: string) => {
        const day = value as FirstDayOfWeek
        setFirstDayOfWeek(day)
        setSetting('first_day_of_week', day)
    }

    return (
        <View style={styles.container}>
            <List.Section>
                <RadioButton.Group
                    onValueChange={handleFirstDayChange}
                    value={firstDayOfWeek}
                >
                    <List.Item
                        title={t('settings.autoFirstDay')}
                        left={() => <List.Icon icon="calendar-sync" />}
                        right={() => <RadioButton value="auto" />}
                        onPress={() => {
                            handleFirstDayChange('auto')
                        }}
                        style={styles.listItem}
                    />
                    <List.Item
                        title={t('settings.saturday')}
                        left={() => <List.Icon icon="calendar-start" />}
                        right={() => <RadioButton value="saturday" />}
                        onPress={() => {
                            handleFirstDayChange('saturday')
                        }}
                        style={styles.listItem}
                    />
                    <List.Item
                        title={t('settings.sunday')}
                        left={() => <List.Icon icon="calendar-start" />}
                        right={() => <RadioButton value="sunday" />}
                        onPress={() => {
                            handleFirstDayChange('sunday')
                        }}
                        style={styles.listItem}
                    />
                    <List.Item
                        title={t('settings.monday')}
                        left={() => <List.Icon icon="calendar-start" />}
                        right={() => <RadioButton value="monday" />}
                        onPress={() => {
                            handleFirstDayChange('monday')
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
