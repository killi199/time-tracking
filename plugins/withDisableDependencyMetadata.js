/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
const { withAppBuildGradle } = require('@expo/config-plugins')

const withDisableDependencyMetadata = (config) => {
    return withAppBuildGradle(config, (config) => {
        if (!config.modResults.contents.includes('dependenciesInfo {')) {
            config.modResults.contents = config.modResults.contents.replace(
                /android\s*\{/,
                `android {
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }`,
            )
        }
        return config
    })
}

module.exports = withDisableDependencyMetadata
