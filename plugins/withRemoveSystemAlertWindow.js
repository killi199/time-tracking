const { withAndroidManifest } = require('@expo/config-plugins')

const PERMISSIONS_TO_REMOVE = [
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.VIBRATE',
]

const withRemoveSystemAlertWindow = (config) => {
    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest
        const permissions = manifest['uses-permission'] ?? []

        manifest['uses-permission'] = permissions.filter(
            (perm) => !PERMISSIONS_TO_REMOVE.includes(perm.$['android:name']),
        )

        return config
    })
}

module.exports = withRemoveSystemAlertWindow
