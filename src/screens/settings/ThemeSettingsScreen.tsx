import { View, StyleSheet } from 'react-native'
import { RadioButton, List, useTheme } from 'react-native-paper'
import { useAppTheme, ThemeMode } from '../../context/ThemeContext'
import { useTranslation } from 'react-i18next'

export default function ThemeSettingsScreen() {
    const { themeMode, setThemeMode } = useAppTheme()
    const theme = useTheme()
    const { t } = useTranslation()

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <List.Section title={t('settings.theme')}>
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
                    />
                    <List.Item
                        title={t('settings.light')}
                        left={() => <List.Icon icon="brightness-5" />}
                        right={() => <RadioButton value="light" />}
                        onPress={() => {
                            setThemeMode('light')
                        }}
                    />
                    <List.Item
                        title={t('settings.dark')}
                        left={() => <List.Icon icon="brightness-3" />}
                        right={() => <RadioButton value="dark" />}
                        onPress={() => {
                            setThemeMode('dark')
                        }}
                    />
                </RadioButton.Group>
            </List.Section>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 16,
    },
})
