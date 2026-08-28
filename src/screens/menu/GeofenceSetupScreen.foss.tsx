import { View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

export default function GeofenceSetupScreen() {
    const { t } = useTranslation()

    return (
        <View style={styles.container}>
            <Text
                variant="titleLarge"
                style={{ textAlign: 'center', margin: 20 }}
            >
                {t('menu.workingLocations')}
            </Text>
            <Text
                variant="bodyLarge"
                style={{ textAlign: 'center', marginHorizontal: 20 }}
            >
                {t('geofence.fossUnavailable')}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
