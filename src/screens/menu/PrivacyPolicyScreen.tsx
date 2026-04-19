import { ScrollView, StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD !== 'false'
export default function PrivacyPolicyScreen() {
    const theme = useTheme()
    const { t } = useTranslation()

    return (
        <ScrollView
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <View style={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>
                    {t('privacy.title')}
                </Text>

                <Text variant="bodyLarge" style={styles.paragraph}>
                    {t('privacy.intro')}
                </Text>

                {!isFOSS ? (
                    <>
                        <Text
                            variant="titleMedium"
                            style={[
                                styles.sectionTitle,
                                { color: theme.colors.primary },
                            ]}
                        >
                            {t('privacy.locationTitle')}
                        </Text>
                        <Text variant="bodyMedium" style={styles.paragraph}>
                            {t('privacy.locationText')}
                        </Text>

                        <Text
                            variant="titleMedium"
                            style={[
                                styles.sectionTitle,
                                { color: theme.colors.primary },
                            ]}
                        >
                            {t('privacy.mapsTitle')}
                        </Text>
                        <Text variant="bodyMedium" style={styles.paragraph}>
                            {t('privacy.mapsText')}
                        </Text>
                    </>
                ) : null}

                <Text
                    variant="titleMedium"
                    style={[
                        styles.sectionTitle,
                        { color: theme.colors.primary },
                    ]}
                >
                    {t('privacy.rightsTitle')}
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    {t('privacy.rightsText')}
                </Text>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    title: {
        marginBottom: 24,
        fontWeight: 'bold',
    },
    sectionTitle: {
        marginTop: 16,
        marginBottom: 8,
        fontWeight: '600',
    },
    paragraph: {
        marginBottom: 16,
        lineHeight: 24,
    },
})
