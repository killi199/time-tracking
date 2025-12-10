import React from 'react';
import { StyleSheet, View } from 'react-native';
import { List, useTheme } from 'react-native-paper';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { TimeEvent } from '../types';

interface EventListItemProps {
    item: TimeEvent;
    type: 'start' | 'end';
    onEdit: (event: TimeEvent) => void;
    onDelete: (event: TimeEvent) => void;
}

export const EventListItem = ({
    item,
    type,
    onEdit,
    onDelete,
}: EventListItemProps) => {
    const theme = useTheme();
    const { t } = useTranslation();

    const renderRightActions = () => (
        <RectButton
            style={styles.deleteAction}
            onPress={() => onDelete(item)}
        >
            <List.Icon icon="delete" color="white" />
        </RectButton>
    );

    const renderLeftActions = () => (
        <RectButton
            style={styles.editAction}
            onPress={() => onEdit(item)}
        >
            <List.Icon icon="pencil" color="white" />
        </RectButton>
    );

    return (
        <ReanimatedSwipeable
            renderRightActions={renderRightActions}
            renderLeftActions={renderLeftActions}
        >
            <List.Item
                title={`${type === 'start' ? t('home.checkIn') : t('home.checkOut')} ${t('home.at')} ${item.time}`}
                description={item.note}
                left={(props) => (
                    <List.Icon
                        {...props}
                        icon={type === 'start' ? 'login' : 'logout'}
                        color={
                            type === 'start'
                                ? theme.colors.primary
                                : theme.colors.error
                        }
                    />
                )}
                style={{
                    backgroundColor: theme.colors.elevation.level1,
                }}
            />
        </ReanimatedSwipeable>
    );
};

const styles = StyleSheet.create({
    deleteAction: {
        backgroundColor: '#dd2c00',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    editAction: {
        backgroundColor: '#2196f3',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
});
