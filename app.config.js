module.exports = {
    expo: {
        name: 'time-tracking',
        slug: 'time-tracking',
        // eslint-disable-next-line no-undef, @typescript-eslint/no-unsafe-assignment
        version: process.env.APP_VERSION || '1.0.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'automatic',
        jsEngine: 'hermes',
        experiments: {
            reactCompiler: true,
        },
        splash: {
            image: './assets/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#000000',
        },
        ios: {
            supportsTablet: true,
            jsEngine: 'jsc',
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                monochromeImage: './assets/adaptive-icon.png',
            },
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
            '@maplibre/maplibre-react-native',
            [
                'expo-quick-actions',
                {
                    androidIcons: {
                        shortcut_timer: {
                            foregroundImage: './assets/adaptive-icon.png',
                            backgroundColor: '#ffffff',
                        },
                    },
                },
            ],
        ],
    },
}
