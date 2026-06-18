import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins'

const withRemovePermissions: ConfigPlugin = (config) => {
    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest
        const permissions = manifest['uses-permission'] ?? []

        // Permissions to remove for all builds
        const PERMISSIONS_TO_REMOVE = [
            'android.permission.SYSTEM_ALERT_WINDOW',
            'android.permission.VIBRATE',
        ]

        const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD !== 'false'

        // If FOSS build, also remove INTERNET and ACCESS_NETWORK_STATE permissions
        if (isFOSS) {
            PERMISSIONS_TO_REMOVE.push(
                'android.permission.INTERNET',
                'android.permission.ACCESS_NETWORK_STATE',
            )

            // Add tools namespace to manifest element to allow tools:node="remove"
            manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools'
        }

        manifest['uses-permission'] = permissions.filter(
            (perm) => !PERMISSIONS_TO_REMOVE.includes(perm.$['android:name']),
        )

        // For FOSS builds, explicitly inject remove directives so dependencies/libraries
        // don't merge these permissions back in
        if (isFOSS) {
            manifest['uses-permission'].push(
                {
                    $: {
                        'android:name': 'android.permission.INTERNET',
                        'tools:node': 'remove',
                    },
                },
                {
                    $: {
                        'android:name':
                            'android.permission.ACCESS_NETWORK_STATE',
                        'tools:node': 'remove',
                    },
                },
            )
        }

        return config
    })
}

export default withRemovePermissions
