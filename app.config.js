module.exports = {
    expo: {
        name: 'time-tracking',
        slug: 'time-tracking',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        splash: {
            image: './assets/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#000000',
        },
        ios: {
            supportsTablet: true,
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                monochromeImage: './assets/adaptive-icon.png',
            },
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false,
            package: 'de.killi199.timetracking',
            permissions: ['android.permission.NFC'],
        },
        plugins: [
            './plugins/withNfcIntent',
            'expo-sqlite',
            [
                'expo-location',
                {
                    isAndroidBackgroundLocationEnabled: true,
                },
            ],
            "@maplibre/maplibre-react-native",
        ],
    },
}
