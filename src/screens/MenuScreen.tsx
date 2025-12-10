import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, List, Portal, Dialog, Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MenuScreen({ navigation }: { navigation: any }) {
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
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <List.Section>
                <List.Item
                    title={t('menu.dailyOverview')}
                    left={() => (
                        <List.Icon icon="calendar-today" />
                    )}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() =>
                        navigation.navigate('DayView', { viewMode: 'day' })
                    }
                />
                <List.Item
                    title={t('menu.monthlyOverview')}
                    left={() => (
                        <List.Icon icon="calendar-month" />
                    )}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() =>
                        navigation.navigate('DayView', { viewMode: 'month' })
                    }
                />
                <List.Item
                    title={t('menu.workingLocations')}
                    left={() => <List.Icon icon="map-marker-radius" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={() => navigation.navigate('GeofenceSetup')}
                />
                <List.Item
                    title={t('menu.exportCSV')}
                    left={() => <List.Icon icon="export" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={async () => {
                        const { exportToCSV } = await import('../utils/csv');
                        const result = await exportToCSV();
                        if (!result.success && result.message) {
                            showDialog(t('common.error'), result.message);
                        } else if (result.success) {
                            // Export usually relies on share sheet, so maybe no dialog needed on success if share sheet opens? 
                            // But if it returns success, maybe just a small confirmation or nothing if share sheet handles it.
                            // The previous code showed nothing on success (share sheet opens).
                            // If result has a message, show it.
                            if (result.message) {
                                showDialog(t('common.success'), result.message);
                            }
                        }
                    }}
                />
                <List.Item
                    title={t('menu.importCSV')}
                    left={() => <List.Icon icon="import" />}
                    right={() => <List.Icon icon="chevron-right" />}
                    onPress={async () => {
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
                />
            </List.Section>

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
    container: {
        flex: 1,
        paddingLeft: 16,
    },
});
