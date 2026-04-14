const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD !== 'false'
import { version, versionCode } from './package.json'

const plugins = [
    './plugins/withNfcIntent',
    './plugins/withDisableDependencyMetadata',
    'expo-sqlite',
    'expo-sharing',
    'expo-localization',
    'expo-router',
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
]

if (!isFOSS) {
    plugins.push([
        'expo-location',
        {
            isAndroidBackgroundLocationEnabled: true,
        },
    ])
    plugins.push('@maplibre/maplibre-react-native')
}

module.exports = {
    expo: {
        name: 'time-tracking',
        slug: 'time-tracking',
        version,
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
            versionCode,
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                monochromeImage: './assets/adaptive-icon.png',
            },
            predictiveBackGestureEnabled: false,
            package: 'de.killi199.timetracking',
            permissions: ['android.permission.NFC'],
        },
        plugins: plugins,
    },
}
