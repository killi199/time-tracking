import { StyleSheet, Dimensions } from 'react-native'
import { MapView } from '@maplibre/maplibre-react-native'

const { width, height } = Dimensions.get('window')

export default function GeofenceSetupScreen() {
    return (
        <MapView
            style={styles.map}
            mapStyle="https://tiles.openfreemap.org/styles/bright"
        >
        </MapView>
    )
}

const styles = StyleSheet.create({
    map: {
        width: width,
        height: height,
    },
})
