import { render, act, waitFor, screen } from '@testing-library/react-native'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import GeofenceSetupScreen from './GeofenceSetupScreen'
import * as Location from 'expo-location'
import { getSetting, setSetting } from '../../db/database'
import { LOCATION_TASK_NAME } from '../../services/LocationTask'
import { PaperProvider } from 'react-native-paper'

jest.mock('../../db/database', () => ({
    getSetting: jest.fn(),
    setSetting: jest.fn(),
}))

jest.mock('expo-location', () => ({
    getForegroundPermissionsAsync: jest.fn(),
    requestForegroundPermissionsAsync: jest.fn(),
    getBackgroundPermissionsAsync: jest.fn(),
    requestBackgroundPermissionsAsync: jest.fn(),
    getLastKnownPositionAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    startGeofencingAsync: jest.fn(),
    stopGeofencingAsync: jest.fn(),
    PermissionStatus: {
        GRANTED: 'granted',
        DENIED: 'denied',
        UNDETERMINED: 'undetermined',
    },
}))

jest.mock('@maplibre/maplibre-react-native', () => {
    const React = jest.requireActual<typeof import('react')>('react')
    const { View } =
        jest.requireActual<typeof import('react-native')>('react-native')

    interface MockMapProps {
        onDidFinishLoadingStyle?: () => void
        onLongPress?: (e: { nativeEvent: { lngLat: [number, number] } }) => void
        children?: React.ReactNode
    }

    const MockMap = React.forwardRef<unknown, MockMapProps>((props, ref) => {
        const { onDidFinishLoadingStyle } = props
        React.useEffect(() => {
            onDidFinishLoadingStyle?.()
        }, [onDidFinishLoadingStyle])
        return <View testID="map" ref={ref as never} {...props} />
    })
    MockMap.displayName = 'MockMap'

    const MockCamera = React.forwardRef<
        unknown,
        Record<string, unknown> & { children?: React.ReactNode }
    >((props, ref) => <View testID="camera" ref={ref as never} {...props} />)
    MockCamera.displayName = 'MockCamera'

    const MockMarker = (
        props: Record<string, unknown> & { children?: React.ReactNode },
    ) => <View testID="marker" {...props} />
    MockMarker.displayName = 'MockMarker'

    const MockGeoJSONSource = (
        props: Record<string, unknown> & { children?: React.ReactNode },
    ) => <View testID="geojson-source" {...props} />
    MockGeoJSONSource.displayName = 'MockGeoJSONSource'

    const MockLayer = (
        props: Record<string, unknown> & { children?: React.ReactNode },
    ) => <View testID="layer" {...props} />
    MockLayer.displayName = 'MockLayer'

    const MockUserLocation = () => <View testID="user-location" />
    MockUserLocation.displayName = 'MockUserLocation'

    return {
        Map: MockMap,
        Camera: MockCamera,
        Marker: MockMarker,
        GeoJSONSource: MockGeoJSONSource,
        Layer: MockLayer,
        UserLocation: MockUserLocation,
        useCurrentPosition: () => ({ coords: { latitude: 0, longitude: 0 } }),
    }
})

jest.mock('@react-native-community/slider', () => {
    const { View } =
        jest.requireActual<typeof import('react-native')>('react-native')
    const MockSlider = (props: Record<string, unknown>) => (
        <View testID="slider" {...props} />
    )
    MockSlider.displayName = 'MockSlider'
    return MockSlider
})

const renderWithProvider = (ui: React.ReactElement) =>
    render(<PaperProvider>{ui}</PaperProvider>)

describe('GeofenceSetupScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
            status: Location.PermissionStatus.GRANTED,
            granted: true,
            canAskAgain: true,
            expires: 'never',
        })
        jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
            status: Location.PermissionStatus.GRANTED,
            granted: true,
            canAskAgain: true,
            expires: 'never',
        })
        jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue({
            coords: {
                latitude: 40.7128,
                longitude: -74.006,
                altitude: null,
                accuracy: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
            },
            timestamp: 0,
        })
    })

    it('loads settings and shows marker if previously configured', async () => {
        jest.mocked(getSetting).mockReturnValue(
            JSON.stringify({
                isEnabled: true,
                latitude: 48.8566,
                longitude: 2.3522,
                radius: 200,
            }),
        )

        await renderWithProvider(<GeofenceSetupScreen />)

        await waitFor(() => {
            expect(screen.getByTestId('marker')).toBeOnTheScreen()
        })
        expect(getSetting).toHaveBeenCalledWith('geofence_config')
    })

    it('allows long press on map to set a new marker', async () => {
        jest.mocked(getSetting).mockReturnValue(null)

        await renderWithProvider(<GeofenceSetupScreen />)

        await waitFor(() => {
            expect(screen.getByTestId('map')).toBeOnTheScreen()
        })

        const map = screen.getByTestId('map')
        const onLongPress = map.props.onLongPress as (e: {
            nativeEvent: { lngLat: [number, number] }
        }) => void
        await act(() => {
            onLongPress({
                nativeEvent: { lngLat: [2.3522, 48.8566] },
            })
        })

        await waitFor(() => {
            expect(screen.getByTestId('marker')).toBeOnTheScreen()
        })

        expect(setSetting).toHaveBeenCalledWith(
            'geofence_config',
            expect.stringContaining('"isEnabled":false'),
        )
    })

    it('enables geofencing when toggling switch and marker is set', async () => {
        jest.mocked(getSetting).mockReturnValue(
            JSON.stringify({
                isEnabled: false,
                latitude: 48.8566,
                longitude: 2.3522,
                radius: 200,
            }),
        )
        jest.mocked(
            Location.requestBackgroundPermissionsAsync,
        ).mockResolvedValue({
            status: Location.PermissionStatus.GRANTED,
            granted: true,
            canAskAgain: true,
            expires: 'never',
        })

        await renderWithProvider(<GeofenceSetupScreen />)

        await waitFor(() => {
            expect(screen.getByRole('switch')).toBeOnTheScreen()
        })

        const switchEl = screen.getByRole('switch')
        const onChange = switchEl.props.onChange as (e: {
            nativeEvent: { value: boolean }
        }) => void
        await act(() => {
            onChange({ nativeEvent: { value: true } })
        })

        await waitFor(() => {
            expect(Location.startGeofencingAsync).toHaveBeenCalledWith(
                LOCATION_TASK_NAME,
                expect.arrayContaining([
                    expect.objectContaining({
                        latitude: 48.8566,
                        longitude: 2.3522,
                        radius: 200,
                    }),
                ]),
            )
        })

        expect(setSetting).toHaveBeenCalledWith(
            'geofence_config',
            expect.stringContaining('"isEnabled":true'),
        )
    })

    it('disables geofencing when toggling switch off', async () => {
        jest.mocked(getSetting).mockReturnValue(
            JSON.stringify({
                isEnabled: true,
                latitude: 48.8566,
                longitude: 2.3522,
                radius: 200,
            }),
        )

        await renderWithProvider(<GeofenceSetupScreen />)

        await waitFor(() => {
            expect(screen.getByRole('switch')).toBeOnTheScreen()
        })

        const switchEl = screen.getByRole('switch')
        const onChange = switchEl.props.onChange as (e: {
            nativeEvent: { value: boolean }
        }) => void
        await act(() => {
            onChange({ nativeEvent: { value: false } })
        })

        await waitFor(() => {
            expect(Location.stopGeofencingAsync).toHaveBeenCalledWith(
                LOCATION_TASK_NAME,
            )
        })

        expect(setSetting).toHaveBeenCalledWith(
            'geofence_config',
            expect.stringContaining('"isEnabled":false'),
        )
    })

    it('shows error dialog if trying to enable without a marker', async () => {
        jest.mocked(getSetting).mockReturnValue(null)

        await renderWithProvider(<GeofenceSetupScreen />)

        await waitFor(() => {
            expect(screen.getByRole('switch')).toBeOnTheScreen()
        })

        const switchEl = screen.getByRole('switch')
        const onChange = switchEl.props.onChange as (e: {
            nativeEvent: { value: boolean }
        }) => void
        await act(() => {
            onChange({ nativeEvent: { value: true } })
        })

        await waitFor(() => {
            expect(screen.getByText('common.error')).toBeOnTheScreen()
            expect(
                screen.getAllByText('geofence.instruction')[0],
            ).toBeOnTheScreen()
        })
    })
})
