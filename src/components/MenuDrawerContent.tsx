import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, Text, Dialog, Portal, Button, List } from 'react-native-paper';
import { DrawerContentScrollView, DrawerItemList, DrawerItem, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MenuDrawerContent(props: DrawerContentComponentProps) {
    const theme = useTheme();
    const { t } = useTranslation();

    const [visible, setVisible] = useState(false);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogMessage, setDialogMessage] = useState('');

    const showDialog = (title: string, message: string) => {
        setDialogTitle(title);
        setDialogMessage(message);
        setVisible(true);
    };

    const hideDialog = () => setVisible(false);

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <DrawerContentScrollView {...props}>

                <DrawerItem
                    label={t('menu.workingLocations')}
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="map-marker-radius" color={color} size={size} />
                    )}
                    onPress={() => {
                        props.navigation.closeDrawer();
                        props.navigation.navigate('GeofenceSetup');
                    }}
                    labelStyle={{ color: theme.colors.onSurface }}
                    style={{ backgroundColor: theme.colors.surface }}
                />

                <DrawerItem
                    label={t('nfc.title')}
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="nfc" color={color} size={size} />
                    )}
                    onPress={() => {
                        props.navigation.closeDrawer();
                        props.navigation.navigate('NFCSetup');
                    }}
                    labelStyle={{ color: theme.colors.onSurface }}
                    style={{ backgroundColor: theme.colors.surface }}
                />

                <DrawerItem
                    label={t('settings.title')}
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="cog" color={color} size={size} />
                    )}
                    onPress={() => {
                        props.navigation.closeDrawer();
                        props.navigation.navigate('Settings');
                    }}
                    labelStyle={{ color: theme.colors.onSurface }}
                    style={{ backgroundColor: theme.colors.surface }}
                />

                <View style={styles.divider} />

                <DrawerItem
                    label={t('menu.exportCSV')}
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="export" color={color} size={size} />
                    )}
                    onPress={async () => {
                        props.navigation.closeDrawer();
                        const { exportToCSV } = await import('../utils/csv');
                        const result = await exportToCSV();
                        if (!result.success && result.message) {
                            showDialog(t('common.error'), result.message);
                        } else if (result.success) {
                            if (result.message) {
                                showDialog(t('common.success'), result.message);
                            }
                        }
                    }}
                    labelStyle={{ color: theme.colors.onSurface }}
                    style={{ backgroundColor: theme.colors.surface }}
                />
                <DrawerItem
                    label={t('menu.importCSV')}
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="import" color={color} size={size} />
                    )}
                    onPress={async () => {
                        props.navigation.closeDrawer();
                        const { importFromCSV } = await import('../utils/csv');
                        const result = await importFromCSV();
                        if (result.success) {
                            showDialog(
                                t('common.success'),
                                result.count !== undefined
                                    ? `Successfully imported ${result.count} events.`
                                    : 'Successfully imported events.'
                            );
                        } else if (result.message !== 'Cancelled') {
                            showDialog(t('common.error'), result.message || 'Unknown error');
                        }
                    }}
                    labelStyle={{ color: theme.colors.onSurface }}
                    style={{ backgroundColor: theme.colors.surface }}
                />
            </DrawerContentScrollView>

            <Portal>
                <Dialog visible={visible} onDismiss={hideDialog}>
                    <Dialog.Title>{dialogTitle}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">{dialogMessage}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog}>{t('common.confirm')}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0', // Simple divider, usually should come from theme but being quick
        marginVertical: 10,
        marginHorizontal: 16
    },
});
