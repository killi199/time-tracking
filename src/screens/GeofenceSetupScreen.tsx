import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { useTheme, Text, Button, Switch, ActivityIndicator, HelperText } from 'react-native-paper';
import MapView, { Circle, Marker, LongPressEvent, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import Slider from '@react-native-community/slider';
import { getSetting, setSetting } from '../db/database';
import { LOCATION_TASK_NAME } from '../services/LocationTask';

const { width, height } = Dimensions.get('window');

// Default location (e.g. New York) if none provided
const DEFAULT_REGION = {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function GeofenceSetupScreen() {
    const theme = useTheme();
    const { t } = useTranslation();
    const [isEnabled, setIsEnabled] = useState(false);
    const [region, setRegion] = useState(DEFAULT_REGION);
    const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
    const [radius, setRadius] = useState(100);
    const [loading, setLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

    useEffect(() => {
        loadSettings();
        checkPermissions();
    }, []);

    const loadSettings = () => {
        try {
            const configStr = getSetting('geofence_config');
            if (configStr) {
                const config = JSON.parse(configStr);
                setIsEnabled(config.isEnabled);
                if (config.latitude && config.longitude) {
                    setMarker({ latitude: config.latitude, longitude: config.longitude });
                    setRegion({
                        latitude: config.latitude,
                        longitude: config.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    });
                }
                if (config.radius) setRadius(config.radius);
            }
        } catch (e) {
            console.error('Failed to load geofence settings', e);
        } finally {
            setLoading(false);
        }
    };

    const checkPermissions = async () => {
        const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setPermissionStatus('denied');
                return;
            }
        }

        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            // We request background only when enabling, or we can check now
            // For now just mark as granted if foreground is granted, actual BG request happens when enabling
            setPermissionStatus('granted'); // Foreground granted at least
        } else {
            setPermissionStatus('granted');
        }

        // Always try to get current location to center map if no marker is set
        if (!marker) {
            try {
                const location = await Location.getCurrentPositionAsync({});
                setRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                });
            } catch (error) {
                console.log("Could not get current location", error);
            }
        }
    };

    const handleEnableToggle = async () => {
        if (!marker) {
            Alert.alert(t('common.error'), t('geofence.instruction'));
            return;
        }

        if (!isEnabled) {
            // Turning ON
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus !== 'granted') {
                Alert.alert(t('common.error'), t('geofence.permissionBackgroundDenied'));
                return;
            }

            try {
                await Location.startGeofencingAsync(LOCATION_TASK_NAME, [
                    {
                        identifier: 'work_location',
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                        radius: radius,
                        notifyOnEnter: true,
                        notifyOnExit: true,
                    },
                ]);
                setIsEnabled(true);
                saveConfig(true);
                Alert.alert(t('common.success'), 'Geofencing enabled!');
            } catch (e) {
                console.error(e);
                Alert.alert(t('common.error'), 'Failed to start geofencing.');
            }
        } else {
            // Turning OFF
            try {
                await Location.stopGeofencingAsync(LOCATION_TASK_NAME);
                setIsEnabled(false);
                saveConfig(false);
            } catch (e) {
                console.error(e);
                Alert.alert(t('common.error'), 'Failed to stop geofencing.');
            }
        }
    };

    const saveConfig = (enabled: boolean) => {
        const config = {
            isEnabled: enabled,
            latitude: marker?.latitude,
            longitude: marker?.longitude,
            radius: radius,
        };
        setSetting('geofence_config', JSON.stringify(config));
    };

    const onMapPress = (e: LongPressEvent) => {
        // If enabled, warn that they need to disable first to edit? Or just update it?
        // Let's allow update but restart geofence if enabled.
        setMarker(e.nativeEvent.coordinate);
        // If enabled, we should probably update the geofence dynamically or ask to save.
        // For simplicity, just update state. User needs to toggle off/on or we add a "Update" button.
        // Let's auto-update if enabled (Debounced? Or just on unmount/save button?)
        // Better: Disable auto-update. User sets location, then toggles switch.
        // If switch is ON and user moves marker, we could show "Update Geofence" button.
        // For MVP: Toggle off then on to update.
        if (isEnabled) {
            Alert.alert('Info', 'Disable and re-enable to apply new location.');
        } else {
            // Save immediately for persistence even if disabled
            const config = {
                isEnabled: false,
                latitude: e.nativeEvent.coordinate.latitude,
                longitude: e.nativeEvent.coordinate.longitude,
                radius: radius,
            };
            setSetting('geofence_config', JSON.stringify(config));
        }
    };

    const onRadiusChange = (val: number) => {
        setRadius(val);
        if (!isEnabled && marker) {
            const config = {
                isEnabled: false,
                latitude: marker.latitude,
                longitude: marker.longitude,
                radius: val,
            };
            setSetting('geofence_config', JSON.stringify(config));
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                onLongPress={onMapPress} // Using LongPress as simpler instruction
                showsUserLocation
                showsMyLocationButton
                provider={PROVIDER_GOOGLE}
            >
                {marker && (
                    <>
                        <Marker coordinate={marker} />
                        <Circle
                            center={marker}
                            radius={radius}
                            fillColor="rgba(0, 150, 255, 0.2)"
                            strokeColor="rgba(0, 150, 255, 0.5)"
                        />
                    </>
                )}
            </MapView>

            <View style={[styles.controls, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                    {t('geofence.title')}
                </Text>

                <View style={styles.row}>
                    <Text>{t('geofence.enableAutoCheckIn')}</Text>
                    <Switch value={isEnabled} onValueChange={handleEnableToggle} />
                </View>

                <Text style={{ marginTop: 10 }}>{t('geofence.radius')}: {Math.round(radius)}m</Text>
                <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={100}
                    maximumValue={1000}
                    step={50}
                    value={radius}
                    onValueChange={onRadiusChange}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.onSurfaceDisabled}
                />

                {!marker && (
                    <HelperText type="info" visible={true}>
                        {t('geofence.instruction')}
                    </HelperText>
                )}
                {marker && isEnabled && (
                    <HelperText type="info" visible={true} style={{ color: theme.colors.primary }}>
                        Geofence Active
                    </HelperText>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: width,
        height: height * 0.65,
    },
    controls: {
        flex: 1,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
});
