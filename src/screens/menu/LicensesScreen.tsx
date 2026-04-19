import { useMemo } from 'react'
import {
    View,
    FlatList,
    StyleSheet,
    Linking,
    TouchableOpacity,
} from 'react-native'
import { Text, useTheme, Card } from 'react-native-paper'

import licensesData from '../../licenses.json'

interface License {
    name: string
    licenses: string
    repository?: string
    publisher?: string
}

export default function LicensesScreen() {
    const theme = useTheme()

    const licensesList: License[] = useMemo(() => {
        return Object.keys(licensesData).map((key) => {
            const data = (
                licensesData as Record<string, Record<string, unknown>>
            )[key]

            let licensesStr = ''
            if (typeof data.licenses === 'string') {
                licensesStr = data.licenses
            } else if (typeof data.licenses === 'object') {
                licensesStr = JSON.stringify(data.licenses)
            }

            return {
                name: key,
                licenses: licensesStr,
                repository:
                    typeof data.repository === 'string'
                        ? data.repository
                        : undefined,
                publisher:
                    typeof data.publisher === 'string'
                        ? data.publisher
                        : undefined,
            }
        })
    }, [])

    const renderItem = ({ item }: { item: License }) => (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleMedium">{item.name}</Text>
                <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.primary, marginTop: 4 }}
                >
                    {item.licenses}
                </Text>
                {item.publisher ? (
                    <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.outline, marginTop: 4 }}
                    >
                        {item.publisher}
                    </Text>
                ) : null}
                {item.repository ? (
                    <TouchableOpacity
                        onPress={() => {
                            if (item.repository) {
                                void Linking.openURL(item.repository)
                            }
                        }}
                    >
                        <Text
                            variant="bodySmall"
                            style={{
                                color: theme.colors.primary,
                                textDecorationLine: 'underline',
                            }}
                        >
                            {item.repository}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </Card.Content>
        </Card>
    )

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <FlatList
                data={licensesList}
                keyExtractor={(item) => item.name}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
    },
    card: {
        marginBottom: 12,
    },
})
