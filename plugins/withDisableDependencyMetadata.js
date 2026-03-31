/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
const { withGradleProperties } = require('@expo/config-plugins')

const withDisableDependencyMetadata = (config) => {
    return withGradleProperties(config, (config) => {
        config.modResults.push({
            type: 'property',
            key: 'android.dependenciesInfo.includeInApk',
            value: 'false',
        })
        config.modResults.push({
            type: 'property',
            key: 'android.dependenciesInfo.includeInBundle',
            value: 'false',
        })
        return config
    })
}

module.exports = withDisableDependencyMetadata
