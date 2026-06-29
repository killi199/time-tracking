import { ExpoConfig as BaseExpoConfig, ConfigContext } from 'expo/config'
import { version, versionCode } from './package.json'

interface CustomExpoConfig extends Omit<BaseExpoConfig, 'plugins' | 'ios'> {
    jsEngine?: 'hermes' | 'jsc'
    ios?: BaseExpoConfig['ios'] & {
        jsEngine?: 'hermes' | 'jsc'
    }
    splash?: {
        image?: string
        resizeMode?: 'contain' | 'cover'
        backgroundColor?: string
    }
    plugins?: (string | [string, object])[]
}

const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD !== 'false'

export default ({ config }: ConfigContext): CustomExpoConfig => {
    const plugins: (string | [string, object])[] = [
        './src/plugins/withNfcIntent',
        './src/plugins/withDisableDependencyMetadata',
        './src/plugins/withRemovePermissions',
        'expo-sqlite',
        'expo-sharing',
        'expo-localization',
        'expo-router',
        '@react-native-vector-icons/material-design-icons',
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
        [
            'expo-status-bar',
            {
                style: 'auto',
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

    const finalConfig: CustomExpoConfig = {
        ...config,
        name: 'time-tracking',
        slug: 'time-tracking',
        scheme: 'de.killi199.timetracking',
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
    }

    return finalConfig
}
