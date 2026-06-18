import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins'

const withNfcIntent: ConfigPlugin = (config) => {
    return withAndroidManifest(config, (config) => {
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
}

export default withNfcIntent
