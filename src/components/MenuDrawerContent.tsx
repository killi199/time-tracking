import { useState } from 'react'
import { View } from 'react-native'
import {
    useTheme,
    Text,
    Dialog,
    Portal,
    Button,
    Drawer,
} from 'react-native-paper'
import {
    DrawerContentScrollView,
    DrawerContentComponentProps,
} from 'expo-router/drawer'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function MenuDrawerContent(
    props: Readonly<DrawerContentComponentProps>,
) {
    const theme = useTheme()
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()
    const router = useRouter()

    const [visible, setVisible] = useState(false)
    const [dialogTitle, setDialogTitle] = useState('')
    const [dialogMessage, setDialogMessage] = useState('')

    const showDialog = (title: string, message: string) => {
        setDialogTitle(title)
        setDialogMessage(message)
        setVisible(true)
    }

    const hideDialog = () => {
        setVisible(false)
    }

    const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD !== 'false'

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <DrawerContentScrollView {...props}>
                <Drawer.Section>
                    <View style={{ padding: 16 }}>
                        <Text
                            variant="headlineMedium"
                            style={{ fontWeight: 'bold' }}
                        >
                            {t('menu.headline')}
                        </Text>
                    </View>
                </Drawer.Section>

                <Drawer.Section>
                    {!isFOSS ? (
                        <Drawer.Item
                            label={t('menu.workingLocations')}
                            icon={({ color, size }) => (
                                <MaterialCommunityIcons
                                    name="map-marker-radius"
                                    color={color}
                                    size={size}
                                />
                            )}
                            onPress={() => {
                                props.navigation.closeDrawer()
                                router.push('/geofence-setup')
                            }}
                            style={{ backgroundColor: theme.colors.surface }}
                            theme={{
                                colors: {
                                    onSurfaceVariant: theme.colors.onSurface,
                                },
                            }}
                        />
                    ) : null}

                    <Drawer.Item
                        label={t('nfc.title')}
                        icon={({ color, size }) => (
                            <MaterialCommunityIcons
                                name="nfc"
                                color={color}
                                size={size}
                            />
                        )}
                        onPress={() => {
                            props.navigation.closeDrawer()
                            router.push('/nfc-setup')
                        }}
                        style={{ backgroundColor: theme.colors.surface }}
                        theme={{
                            colors: {
                                onSurfaceVariant: theme.colors.onSurface,
                            },
                        }}
                    />

                    <Drawer.Item
                        label={t('settings.title')}
                        icon={({ color, size }) => (
                            <MaterialCommunityIcons
                                name="cog"
                                color={color}
                                size={size}
                            />
                        )}
                        onPress={() => {
                            props.navigation.closeDrawer()
                            router.push('/settings')
                        }}
                        style={{ backgroundColor: theme.colors.surface }}
                        theme={{
                            colors: {
                                onSurfaceVariant: theme.colors.onSurface,
                            },
                        }}
                    />
                </Drawer.Section>

                <Drawer.Section>
                    <Drawer.Item
                        label={t('menu.exportCSV')}
                        icon={({ color, size }) => (
                            <MaterialCommunityIcons
                                name="export"
                                color={color}
                                size={size}
                            />
                        )}
                        onPress={() => {
                            void (async () => {
                                props.navigation.closeDrawer()
                                const { exportToCSV } =
                                    await import('../utils/csv')
                                const result = await exportToCSV()
                                if (!result.success && result.message) {
                                    showDialog(
                                        t('common.error'),
                                        t(result.message),
                                    )
                                } else if (result.success) {
                                    if (result.message) {
                                        showDialog(
                                            t('common.success'),
                                            t(result.message),
                                        )
                                    }
                                }
                            })()
                        }}
                        style={{ backgroundColor: theme.colors.surface }}
                        theme={{
                            colors: {
                                onSurfaceVariant: theme.colors.onSurface,
                            },
                        }}
                    />
                    <Drawer.Item
                        label={t('menu.importCSV')}
                        icon={({ color, size }) => (
                            <MaterialCommunityIcons
                                name="import"
                                color={color}
                                size={size}
                            />
                        )}
                        onPress={() => {
                            void (async () => {
                                props.navigation.closeDrawer()
                                const { importFromCSV } =
                                    await import('../utils/csv')
                                const result = await importFromCSV()
                                if (result.success) {
                                    const events = result.count ?? 0
                                    const workHours = result.workHoursCount ?? 0
                                    let message: string
                                    if (events > 0 && workHours > 0) {
                                        message = t('csv.importedBoth', {
                                            events,
                                            workHours,
                                        })
                                    } else if (workHours > 0) {
                                        message = t('csv.importedWorkHours', {
                                            count: workHours,
                                        })
                                    } else {
                                        message = t('csv.importedEvents', {
                                            count: events,
                                        })
                                    }
                                    showDialog(t('common.success'), message)
                                } else if (!result.cancelled) {
                                    showDialog(
                                        t('common.error'),
                                        result.message
                                            ? t(result.message)
                                            : t('common.unknownError'),
                                    )
                                }
                            })()
                        }}
                        style={{ backgroundColor: theme.colors.surface }}
                        theme={{
                            colors: {
                                onSurfaceVariant: theme.colors.onSurface,
                            },
                        }}
                    />
                </Drawer.Section>
            </DrawerContentScrollView>

            <View
                style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                }}
            >
                <Button
                    mode="text"
                    textColor={theme.colors.onSurfaceVariant}
                    labelStyle={{ fontSize: 12, marginHorizontal: 0 }}
                    onPress={() => {
                        props.navigation.closeDrawer()
                        router.push('/licenses')
                    }}
                >
                    {t('menu.licenses')}
                </Button>
                <Text
                    style={{
                        color: theme.colors.onSurfaceVariant,
                        fontSize: 12,
                        marginHorizontal: 8,
                    }}
                >
                    •
                </Text>
                <Button
                    mode="text"
                    textColor={theme.colors.onSurfaceVariant}
                    labelStyle={{ fontSize: 12, marginHorizontal: 0 }}
                    onPress={() => {
                        props.navigation.closeDrawer()
                        router.push('/privacy-policy')
                    }}
                >
                    {t('menu.privacyPolicy')}
                </Button>
            </View>

            <Portal>
                <Dialog visible={visible} onDismiss={hideDialog}>
                    <Dialog.Title>{dialogTitle}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">{dialogMessage}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog}>
                            {t('common.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    )
}
