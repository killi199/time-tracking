import { View, StyleSheet } from 'react-native'
import { List } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'

export default function SettingsScreen() {
    const { t } = useTranslation()
    const router = useRouter()

    return (
        <View style={styles.container}>
            <List.Section>
                <List.Item
                    title={t('settings.theme')}
                    left={() => <List.Icon icon="brightness-6" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() => {
                        router.push('/theme-settings')
                    }}
                />
                <List.Item
                    title={t('settings.language')}
                    left={() => <List.Icon icon="translate" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() => {
                        router.push('/language-settings')
                    }}
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
