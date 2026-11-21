module.exports = function (api) {
    const isTest = api.env('test')
    const plugins = []

    if (isTest) {
        plugins.push([
            'babel-plugin-react-compiler',
            {
                target: '19',
                sources: (filename) =>
                    !filename.includes('node_modules') &&
                    !/\.test\.[jt]sx?$/.test(filename),
            },
        ])
    }

    plugins.push('react-native-reanimated/plugin')

    return {
        presets: ['babel-preset-expo'],
        plugins: plugins,
    }
}
