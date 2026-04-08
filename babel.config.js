module.exports = function (api) {
    api.cache(true)

    const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD !== 'false'
    const plugins = []

    plugins.push('react-native-reanimated/plugin')

    return {
        presets: ['babel-preset-expo'],
        plugins: plugins,
    }
}
