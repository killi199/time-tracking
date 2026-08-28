import {
    ConfigPlugin,
    withAndroidManifest,
    withMainActivity,
} from '@expo/config-plugins'

const withNfcIntent: ConfigPlugin = (config) => {
    config = withAndroidManifest(config, (config) => {
        const mainApplication = config.modResults.manifest.application?.[0]
        if (!mainApplication) return config

        const mainActivity = mainApplication.activity?.find(
            (a) => a.$['android:name'] === '.MainActivity',
        )

        if (mainActivity) {
            if (!mainActivity['intent-filter']) {
                mainActivity['intent-filter'] = []
            }

            // Add the correct NDEF_DISCOVERED intent filter
            mainActivity['intent-filter'].push({
                action: [
                    {
                        $: {
                            'android:name':
                                'android.nfc.action.NDEF_DISCOVERED',
                        },
                    },
                ],
                category: [
                    {
                        $: {
                            'android:name': 'android.intent.category.DEFAULT',
                        },
                    },
                ],
                data: [
                    {
                        $: {
                            'android:scheme': 'timetracking',
                            'android:host': 'nfc',
                        },
                    },
                ],
            })
        }

        return config
    })

    config = withMainActivity(config, (config) => {
        let contents = config.modResults.contents

        if (contents.includes('FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY')) {
            return config
        }

        const injection = `
    // If the activity is being restored from a killed state or launched from history,
    // and the original intent was an NFC intent, we clear it to prevent
    // the NFC action from being triggered again on warm boot.
    val isRestored = savedInstanceState != null
    val isFromHistory = (intent.flags and android.content.Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0
    if ((isRestored || isFromHistory) && intent?.action == android.nfc.NfcAdapter.ACTION_NDEF_DISCOVERED) {
        intent.action = android.content.Intent.ACTION_MAIN
        intent.data = null
    }`

        contents = contents.replace(
            /super\.onCreate\([^)]*\)/,
            (match) => injection + '\n    ' + match,
        )

        config.modResults.contents = contents
        return config
    })

    return config
}

export default withNfcIntent
