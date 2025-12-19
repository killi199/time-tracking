import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { addEvent } from '../db/database';

export const LOCATION_TASK_NAME = 'background-geofence-task';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error);
        return;
    }
    if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { eventType } = data as any;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        
        if (eventType === Location.GeofencingEventType.Enter) {
            console.log('Entered geofence');

            try {
                addEvent(dateStr, timeStr, 'Auto check-in geofence');
                
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Auto check-in',
                        body: `Checked in at ${timeStr}`,
                    },
                    trigger: null, // Send immediately
                });
            } catch (err) {
                console.error('Failed to auto check-in:', err);
            }
        } else if (eventType === Location.GeofencingEventType.Exit) {
            console.log('Exited geofence');

            try {
                addEvent(dateStr, timeStr, 'Auto check-out geofence');

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Auto check-out',
                        body: `Checked out at ${timeStr}`,
                    },
                    trigger: null,
                });
            } catch (err) {
                console.error('Failed to auto check-out:', err);
            }
        }
    }
});
