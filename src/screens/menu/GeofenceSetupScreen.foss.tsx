import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

export default function GeofenceSetupScreen() {
    const theme = useTheme()
    const { t } = useTranslation()

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text variant="titleLarge" style={{ textAlign: 'center', margin: 20 }}>
                {t('menu.workingLocations')}
            </Text>
            <Text variant="bodyLarge" style={{ textAlign: 'center', marginHorizontal: 20 }}>
                This feature is not available in the FOSS version of the app due to reliance on proprietary mapping and location services.
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
