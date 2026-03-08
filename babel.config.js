module.exports = function (api) {
    api.cache(true)

    const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD === 'true'
    const plugins = []

    if (isFOSS) {
        plugins.push([
            'module-resolver',
            {
                root: ['./src'],
                alias: {
                    'expo-location': './src/mocks/expo-location-mock.ts',
                    'expo-notifications': './src/mocks/expo-notifications-mock.ts',
                },
            },
        ])
    }

    plugins.push('react-native-reanimated/plugin')

    return {
        presets: ['babel-preset-expo'],
        plugins: plugins,
    }
}
