import { StyleSheet, View } from 'react-native'
import { Icon, Text, useTheme } from 'react-native-paper'

export interface EmptyStateProps {
    readonly icon: string
    readonly title: string
    readonly description?: string
    readonly testID?: string
}

export function EmptyState({
    icon,
    title,
    description,
    testID,
}: Readonly<EmptyStateProps>) {
    const theme = useTheme()

    return (
        <View style={styles.container} testID={testID}>
            <View
                style={[
                    styles.iconCircle,
                    { backgroundColor: theme.colors.surfaceVariant },
                ]}
            >
                <Icon source={icon} size={48} color={theme.colors.primary} />
            </View>
            <Text
                variant="titleMedium"
                style={[styles.title, { color: theme.colors.onSurface }]}
            >
                {title}
            </Text>
            {description ? (
                <Text
                    variant="bodyMedium"
                    style={[
                        styles.description,
                        { color: theme.colors.onSurfaceVariant },
                    ]}
                >
                    {description}
                </Text>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        textAlign: 'center',
        fontWeight: '600',
    },
    description: {
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
})
