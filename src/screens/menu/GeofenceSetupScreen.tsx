import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
    View,
    StyleSheet,
    Dimensions,
    Linking,
    TouchableOpacity,
    NativeSyntheticEvent,
} from 'react-native'
import {
    useTheme,
    Text,
    Switch,
    ActivityIndicator,
    HelperText,
    Portal,
    Dialog,
    Button,
    FAB,
    Icon,
} from 'react-native-paper'
import {
    Camera,
    Map,
    Marker,
    GeoJSONSource,
    Layer,
    UserLocation,
    CameraRef,
    PressEvent,
    useCurrentPosition,
} from '@maplibre/maplibre-react-native'
import * as Location from 'expo-location'
import { useTranslation } from 'react-i18next'
import Slider from '@react-native-community/slider'
import { getSetting, setSetting } from '../../db/database'
import { LOCATION_TASK_NAME } from '../../services/LocationTask'

interface GeofenceConfig {
    isEnabled: boolean
    latitude?: number
    longitude?: number
    radius?: number
}

const { width, height } = Dimensions.get('window')

const DEFAULT_CENTER_COORDINATE = [-74.006, 40.7128] // [lon, lat]
const DEFAULT_ZOOM_LEVEL = 13

const createGeoJSONCircle = (
    center: [number, number],
    radiusInMeters: number,
    points: number = 64,
) => {
    const [longitude, latitude] = center
    const km = radiusInMeters / 1000
    const ret = []
    const distanceX = km / (111.32 * Math.cos((latitude * Math.PI) / 180))
    const distanceY = km / 110.574

    let theta, x, y
    for (let i = 0; i < points; i++) {
        theta = (i / points) * (2 * Math.PI)
        x = distanceX * Math.cos(theta)
        y = distanceY * Math.sin(theta)
        ret.push([longitude + x, latitude + y])
    }
    ret.push(ret[0])
    return {
        type: 'FeatureCollection' as const,
        features: [
            {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                    type: 'Polygon' as const,
                    coordinates: [ret],
                },
            },
        ],
    }
}

export default function GeofenceSetupScreen() {
    const theme = useTheme()
    const { t } = useTranslation()
    const [isEnabled, setIsEnabled] = useState(false)

    // Map state
    const [centerCoordinate, setCenterCoordinate] = useState<number[]>(
        DEFAULT_CENTER_COORDINATE,
    )
    const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL)
    const cameraRef = useRef<CameraRef>(null)
    const mapRef = useRef<React.ComponentRef<typeof Map>>(null)

    const [marker, setMarker] = useState<{
        latitude: number
        longitude: number
    } | null>(null)
    const [radius, setRadius] = useState(100)
    const [loading, setLoading] = useState(true)
    const [, setPermissionStatus] = useState<
        'granted' | 'denied' | 'undetermined'
    >('undetermined')

    const [dialogVisible, setDialogVisible] = useState(false)
    const [dialogTitle, setDialogTitle] = useState('')
    const [dialogMessage, setDialogMessage] = useState('')
    const [isLocating, setIsLocating] = useState(false)
    const currentPosition = useCurrentPosition()

    function showDialog(title: string, message: string) {
        setDialogTitle(title)
        setDialogMessage(message)
        setDialogVisible(true)
    }

    function hideDialog() {
        setDialogVisible(false)
    }

    function loadSettings(): boolean {
        try {
            const configStr = getSetting('geofence_config')
            if (configStr) {
                const config = JSON.parse(configStr) as GeofenceConfig
                setIsEnabled(config.isEnabled)
                if (config.latitude && config.longitude) {
                    setMarker({
                        latitude: config.latitude,
                        longitude: config.longitude,
                    })
                    setCenterCoordinate([config.longitude, config.latitude])
                    // Roughly zoom 14 for detail
                    setZoomLevel(15)
                    if (config.radius) setRadius(config.radius)
                    return true
                }
                if (config.radius) setRadius(config.radius)
            }
        } catch (e) {
            console.error('Failed to load geofence settings', e)
        }
        return false
    }

    async function checkPermissions(hasSavedLocation: boolean) {
        const { status: fgStatus } =
            await Location.getForegroundPermissionsAsync()
        if (fgStatus !== Location.PermissionStatus.GRANTED) {
            const { status } =
                await Location.requestForegroundPermissionsAsync()
            if (status !== Location.PermissionStatus.GRANTED) {
                setPermissionStatus('denied')
                return
            }
        }

        const { status: bgStatus } =
            await Location.getBackgroundPermissionsAsync()
        if (bgStatus !== Location.PermissionStatus.GRANTED) {
            setPermissionStatus('denied')
        } else {
            setPermissionStatus('granted')
        }

        // Only try to get current location to center map if NO marker is set
        if (!hasSavedLocation) {
            try {
                const location = await Location.getLastKnownPositionAsync({})
                if (location) {
                    setCenterCoordinate([
                        location.coords.longitude,
                        location.coords.latitude,
                    ])
                    setZoomLevel(15)
                } else {
                    const currentPos = await Location.getCurrentPositionAsync(
                        {},
                    )
                    setCenterCoordinate([
                        currentPos.coords.longitude,
                        currentPos.coords.latitude,
                    ])
                    setZoomLevel(15)
                }
            } catch (error) {
                console.log('Could not get current location', error)
            }
        }
    }

    useEffect(() => {
        async function init() {
            const hasSavedLocation = loadSettings()
            await checkPermissions(hasSavedLocation)
            setLoading(false)
        }
        void init()
    }, [])

    async function handleEnableToggle() {
        if (!marker) {
            showDialog(t('common.error'), t('geofence.instruction'))
            return
        }

        if (!isEnabled) {
            // Turning ON
            const { status: bgStatus } =
                await Location.requestBackgroundPermissionsAsync()
            if (bgStatus !== Location.PermissionStatus.GRANTED) {
                showDialog(
                    t('common.error'),
                    t('geofence.permissionBackgroundDenied'),
                )
                return
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
                ])
                setIsEnabled(true)
                saveConfig(true)
                showDialog(t('common.success'), t('geofence.enabled'))
            } catch (e) {
                console.error(e)
                showDialog(t('common.error'), t('geofence.startCurrentFailed'))
            }
        } else {
            // Turning OFF
            try {
                await Location.stopGeofencingAsync(LOCATION_TASK_NAME)
                setIsEnabled(false)
                saveConfig(false)
            } catch (e) {
                console.error(e)
                showDialog(t('common.error'), t('geofence.stopFailed'))
            }
        }
    }

    function saveConfig(enabled: boolean) {
        const config = {
            isEnabled: enabled,
            latitude: marker?.latitude,
            longitude: marker?.longitude,
            radius: radius,
        }
        setSetting('geofence_config', JSON.stringify(config))
    }

    function onMapLongPress(event: NativeSyntheticEvent<PressEvent>) {
        const newLongitude = event.nativeEvent.lngLat[0]
        const newLatitude = event.nativeEvent.lngLat[1]

        setMarker({ latitude: newLatitude, longitude: newLongitude })

        if (isEnabled) {
            showDialog(t('common.info'), t('geofence.updateInstruction'))
        } else {
            const config = {
                isEnabled: false,
                latitude: newLatitude,
                longitude: newLongitude,
                radius: radius,
            }
            setSetting('geofence_config', JSON.stringify(config))
        }
    }

    function onRadiusChange(val: number) {
        setRadius(val)
        if (!isEnabled && marker) {
            const config = {
                isEnabled: false,
                latitude: marker.latitude,
                longitude: marker.longitude,
                radius: val,
            }
            setSetting('geofence_config', JSON.stringify(config))
        }
    }

    async function centerMapOnUser() {
        setIsLocating(true)
        try {
            let location = await Location.getLastKnownPositionAsync({})
            if (!location) {
                location = await Location.getCurrentPositionAsync({})
            }
            cameraRef.current?.easeTo({
                center: [location.coords.longitude, location.coords.latitude],
                zoom: 15,
                duration: 1000,
            })
        } catch (e) {
            console.log('Failed to get location', e)
        } finally {
            setIsLocating(false)
        }
    }

    function centerMapOnMarker() {
        if (marker) {
            cameraRef.current?.easeTo({
                center: [marker.longitude, marker.latitude],
                zoom: 15,
                duration: 1000,
            })
        }
    }

    const circleGeoJSON = useMemo(() => {
        if (!marker) return null
        return createGeoJSONCircle([marker.longitude, marker.latitude], radius)
    }, [marker, radius])

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Map
                ref={mapRef}
                style={styles.map}
                mapStyle={
                    theme.dark
                        ? 'https://tiles.openfreemap.org/styles/dark'
                        : 'https://tiles.openfreemap.org/styles/bright'
                }
                onLongPress={onMapLongPress}
                logo={false}
                attribution={false}
            >
                <Camera
                    ref={cameraRef}
                    initialViewState={{
                        center: [
                            centerCoordinate[0] ?? 0,
                            centerCoordinate[1] ?? 0,
                        ],
                        zoom: zoomLevel,
                    }}
                    minZoom={5} // Prevent zooming out too much
                />

                <UserLocation />

                {marker && (
                    <Marker
                        id="selected-location"
                        lngLat={[marker.longitude, marker.latitude]}
                        anchor="bottom" // Anchor at bottom center of icon
                    >
                        <View
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 40,
                                height: 40,
                            }}
                        >
                            <Icon
                                source="map-marker"
                                size={40}
                                color={theme.colors.primary}
                            />
                        </View>
                    </Marker>
                )}

                {marker && circleGeoJSON && (
                    <GeoJSONSource
                        id="geofence-circle-source"
                        data={circleGeoJSON}
                    >
                        <Layer
                            id="geofence-circle-fill"
                            type="fill"
                            paint={{
                                'fill-color': 'rgba(0, 150, 255, 0.2)',
                            }}
                        />
                        <Layer
                            id="geofence-circle-stroke"
                            type="line"
                            paint={{
                                'line-color': 'rgba(0, 150, 255, 0.5)',
                                'line-width': 2,
                            }}
                        />
                    </GeoJSONSource>
                )}
            </Map>

            <View style={styles.attributionContainer}>
                <TouchableOpacity
                    onPress={() =>
                        void Linking.openURL('https://openfreemap.org/')
                    }
                >
                    <Text style={styles.attributionText}>OpenFreeMap</Text>
                </TouchableOpacity>
                <Text style={styles.attributionText}> © </Text>
                <TouchableOpacity
                    onPress={() =>
                        void Linking.openURL('https://www.openmaptiles.org/')
                    }
                >
                    <Text style={styles.attributionText}>OpenMapTiles</Text>
                </TouchableOpacity>
                <Text style={styles.attributionText}> Data from </Text>
                <TouchableOpacity
                    onPress={() => {
                        void Linking.openURL(
                            'https://www.openstreetmap.org/copyright',
                        )
                    }}
                >
                    <Text style={styles.attributionText}>OpenStreetMap</Text>
                </TouchableOpacity>
            </View>

            <FAB
                icon="crosshairs-gps"
                style={[
                    styles.fab,
                    {
                        top: height * 0.65 - 80,
                        backgroundColor: theme.colors.surface,
                    },
                ]}
                onPress={() => void centerMapOnUser()}
                loading={isLocating || !currentPosition}
            />

            {marker && (
                <FAB
                    icon="map-marker"
                    style={[
                        styles.fab,
                        {
                            top: height * 0.65 - 150,
                            backgroundColor: theme.colors.surface,
                        },
                    ]}
                    onPress={centerMapOnMarker}
                />
            )}

            <View
                style={[
                    styles.controls,
                    { backgroundColor: theme.colors.surface },
                ]}
            >
                <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                    {t('geofence.title')}
                </Text>

                <View style={styles.row}>
                    <Text>{t('geofence.enableAutoCheckIn')}</Text>
                    <Switch
                        value={isEnabled}
                        onValueChange={() => void handleEnableToggle()}
                    />
                </View>

                <Text style={{ marginTop: 10 }}>
                    {t('geofence.radius')}: {Math.round(radius)}m
                </Text>
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
            </View>
            <Portal>
                <Dialog visible={dialogVisible} onDismiss={hideDialog}>
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
    fab: {
        position: 'absolute',
        right: 16,
    },
    attributionContainer: {
        position: 'absolute',
        top: height * 0.65 - 20,
        right: 5,
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    attributionText: {
        fontSize: 10,
        color: 'black',
    },
})
