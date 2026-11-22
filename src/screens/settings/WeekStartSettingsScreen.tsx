import { View, StyleSheet } from 'react-native'
import { RadioButton, List, Text, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { setSetting } from '../../db/database'
import { FirstDayOfWeek, useSavedFirstDayOfWeek } from '../../utils/calendar'

export default function WeekStartSettingsScreen() {
    const { t } = useTranslation()
    const theme = useTheme()
    const firstDayOfWeek = useSavedFirstDayOfWeek()

    const handleFirstDayChange = (value: string) => {
        const day = value as FirstDayOfWeek
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
            <Text
                variant="bodySmall"
                style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
            >
                {t('settings.firstDayOfWeekNote')}
            </Text>
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
    note: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
})
