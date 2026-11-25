import { FlatList, StyleSheet, View } from 'react-native'
import { List, RadioButton, Text, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { setSetting } from '../../db/database'
import { useSavedMonthStartDay } from '../../utils/calendar'

const MONTH_START_DAYS = Array.from({ length: 28 }, (_, index) => index + 1)

export default function MonthStartSettingsScreen() {
    const { t } = useTranslation()
    const theme = useTheme()
    const monthStartDay = useSavedMonthStartDay()

    const handleMonthStartChange = (value: string) => {
        setSetting('month_start_day', value)
    }

    const renderItem = ({ item }: { item: number }) => {
        const value = String(item)
        const title = item === 1 ? t('settings.monthStartDayDefault') : value

        return (
            <List.Item
                title={title}
                left={() => <List.Icon icon="calendar-start" />}
                right={() => <RadioButton value={value} />}
                onPress={() => {
                    handleMonthStartChange(value)
                }}
                style={styles.listItem}
            />
        )
    }

    return (
        <View style={styles.container}>
            <Text
                variant="bodySmall"
                style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
            >
                {t('settings.monthStartDayNote')}
            </Text>
            <RadioButton.Group
                onValueChange={handleMonthStartChange}
                value={String(monthStartDay)}
            >
                <FlatList
                    data={MONTH_START_DAYS}
                    keyExtractor={(item) => String(item)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            </RadioButton.Group>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 24,
    },
    listItem: {
        paddingHorizontal: 16,
    },
    note: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
})
