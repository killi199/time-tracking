import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { RadioButton, List, useTheme, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { getSetting, setSetting } from '../../db/database'
import i18n from 'i18next'
import * as Localization from 'expo-localization'

export default function LanguageSettingsScreen() {
    const theme = useTheme()
    const { t } = useTranslation()
    const [language, setLanguage] = useState(() => {
        const saved = getSetting('language')
        return saved || 'auto'
    })

    const handleLanguageChange = (value: string) => {
        setLanguage(value)
        setSetting('language', value)

        if (value === 'auto') {
            const deviceLanguage = Localization.getLocales()[0]?.languageCode
            i18n.changeLanguage(deviceLanguage === 'de' ? 'de' : 'en')
        } else {
            i18n.changeLanguage(value)
        }
    }

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <List.Section title={t('settings.language')}>
                <RadioButton.Group
                    onValueChange={handleLanguageChange}
                    value={language}
                >
                    <List.Item
                        title={t('settings.auto')}
                        left={() => <List.Icon icon="translate" />}
                        right={() => <RadioButton value="auto" />}
                        onPress={() => handleLanguageChange('auto')}
                    />
                    <List.Item
                        title={t('settings.english')}
                        left={() => <Text variant="titleLarge">🇬🇧</Text>}
                        right={() => <RadioButton value="en" />}
                        onPress={() => handleLanguageChange('en')}
                    />
                    <List.Item
                        title={t('settings.german')}
                        left={() => <Text variant="titleLarge">🇩🇪</Text>}
                        right={() => <RadioButton value="de" />}
                        onPress={() => handleLanguageChange('de')}
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
