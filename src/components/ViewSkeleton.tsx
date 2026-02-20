import { StyleSheet, View } from 'react-native'
import { Card, useTheme } from 'react-native-paper'
import { Shimmer, ShimmerProvider } from 'react-native-fast-shimmer'
import { memo } from 'react'

export const ViewSkeleton = memo(function ViewSkeleton() {
    const theme = useTheme()

    return (
        <ShimmerProvider duration={1500}>
            <View style={styles.container}>
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.metricsRow}>
                            <View style={styles.metricItem}>
                                <Shimmer
                                    style={[
                                        styles.shimmerLabel,
                                        {
                                            backgroundColor:
                                                theme.colors.surfaceVariant,
                                        },
                                    ]}
                                />
                                <Shimmer
                                    style={[
                                        styles.shimmerTitle,
                                        {
                                            backgroundColor:
                                                theme.colors.surfaceVariant,
                                        },
                                    ]}
                                />
                            </View>
                            <View style={styles.metricItem}>
                                <Shimmer
                                    style={[
                                        styles.shimmerLabel,
                                        {
                                            backgroundColor:
                                                theme.colors.surfaceVariant,
                                        },
                                    ]}
                                />
                                <Shimmer
                                    style={[
                                        styles.shimmerTitle,
                                        {
                                            backgroundColor:
                                                theme.colors.surfaceVariant,
                                        },
                                    ]}
                                />
                            </View>
                            <View style={styles.metricItem}>
                                <Shimmer
                                    style={[
                                        styles.shimmerLabel,
                                        {
                                            backgroundColor:
                                                theme.colors.surfaceVariant,
                                        },
                                    ]}
                                />
                                <Shimmer
                                    style={[
                                        styles.shimmerTitle,
                                        {
                                            backgroundColor:
                                                theme.colors.surfaceVariant,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                <View style={styles.listContainer}>
                    <View
                        style={[
                            styles.listItem,
                            {
                                backgroundColor: theme.colors.elevation.level1,
                            },
                        ]}
                    >
                        <Shimmer
                            style={[
                                styles.shimmerIcon,
                                {
                                    backgroundColor:
                                        theme.colors.surfaceVariant,
                                },
                            ]}
                        />
                        <View style={styles.listItemContent}>
                            <Shimmer
                                style={[
                                    styles.shimmerItemTitle,
                                    {
                                        backgroundColor:
                                            theme.colors.surfaceVariant,
                                    },
                                ]}
                            />
                            <Shimmer
                                style={[
                                    styles.shimmerItemDescription,
                                    {
                                        backgroundColor:
                                            theme.colors.surfaceVariant,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </ShimmerProvider>
    )
})

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        margin: 16,
        marginTop: 0,
        elevation: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    metricItem: {
        alignItems: 'center',
    },
    shimmerLabel: {
        width: 60,
        height: 14,
        borderRadius: 4,
        marginBottom: 8,
    },
    shimmerTitle: {
        width: 80,
        height: 24,
        borderRadius: 4,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
    },
    shimmerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 16,
    },
    listItemContent: {
        flex: 1,
    },
    shimmerItemTitle: {
        width: '60%',
        height: 16,
        borderRadius: 4,
        marginBottom: 8,
    },
    shimmerItemDescription: {
        width: '40%',
        height: 14,
        borderRadius: 4,
    },
})
