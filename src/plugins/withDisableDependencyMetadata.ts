import { ConfigPlugin, withAppBuildGradle } from '@expo/config-plugins'

const withDisableDependencyMetadata: ConfigPlugin = (config) => {
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

export default withDisableDependencyMetadata
