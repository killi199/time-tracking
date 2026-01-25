import React from 'react'
import { View, StyleSheet } from 'react-native'
import { List, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SettingsScreen({ navigation }: { navigation: any }) {
    const theme = useTheme()
    const { t } = useTranslation()

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <List.Section>
                <List.Item
                    title={t('settings.theme')}
                    left={() => <List.Icon icon="brightness-6" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() => navigation.navigate('ThemeSettings')}
                />
                <List.Item
                    title={t('settings.language')}
                    left={() => <List.Icon icon="translate" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() => navigation.navigate('LanguageSettings')}
                />
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
