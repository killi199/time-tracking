import { View, StyleSheet } from 'react-native'
import { RadioButton, List } from 'react-native-paper'
import { useAppTheme, ThemeMode } from '../../context/ThemeContext'
import { useTranslation } from 'react-i18next'

export default function ThemeSettingsScreen() {
    const { themeMode, setThemeMode } = useAppTheme()
    const { t } = useTranslation()

    return (
        <View style={styles.container}>
            <List.Section>
                <RadioButton.Group
                    onValueChange={(value) => {
                        setThemeMode(value as ThemeMode)
                    }}
                    value={themeMode}
                >
                    <List.Item
                        title={t('settings.auto')}
                        left={() => <List.Icon icon="brightness-auto" />}
                        right={() => <RadioButton value="auto" />}
                        onPress={() => {
                            setThemeMode('auto')
                        }}
                        style={styles.listItem}
                    />
                    <List.Item
                        title={t('settings.light')}
                        left={() => <List.Icon icon="brightness-5" />}
                        right={() => <RadioButton value="light" />}
                        onPress={() => {
                            setThemeMode('light')
                        }}
                        style={styles.listItem}
                    />
                    <List.Item
                        title={t('settings.dark')}
                        left={() => <List.Icon icon="brightness-3" />}
                        right={() => <RadioButton value="dark" />}
                        onPress={() => {
                            setThemeMode('dark')
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
