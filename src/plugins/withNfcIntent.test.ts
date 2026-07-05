import { describe, it, expect, vi } from 'vitest'
import withNfcIntent from './withNfcIntent'

// Execute the manifest modifier directly instead of running expo's
// build-time plugin machinery.
vi.mock('@expo/config-plugins', () => ({
    withAndroidManifest: (
        config: unknown,
        action: (config: unknown) => unknown,
    ) => action(config),
}))

interface ManifestActivity {
    $: Record<string, string>
    'intent-filter'?: unknown[]
}

interface TestManifest {
    application?: { activity?: ManifestActivity[] }[]
}

const runPlugin = (manifest: TestManifest) => {
    const config = {
        name: 'time-tracking',
        slug: 'time-tracking',
        modResults: { manifest },
    }
    withNfcIntent(config)
    return manifest
}

const mainActivity = (): ManifestActivity => ({
    $: { 'android:name': '.MainActivity' },
})

describe('withNfcIntent', () => {
    it('adds the NDEF intent filter to the main activity', () => {
        const activity = mainActivity()
        runPlugin({ application: [{ activity: [activity] }] })

        expect(activity['intent-filter']).toEqual([
            {
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
            },
        ])
    })

    it('keeps existing intent filters', () => {
        const existing = { action: [] }
        const activity = { ...mainActivity(), 'intent-filter': [existing] }
        runPlugin({ application: [{ activity: [activity] }] })

        expect(activity['intent-filter']).toHaveLength(2)
        expect(activity['intent-filter'][0]).toBe(existing)
    })

    it('leaves other activities untouched', () => {
        const other: ManifestActivity = {
            $: { 'android:name': '.OtherActivity' },
        }
        runPlugin({ application: [{ activity: [other] }] })

        expect(other['intent-filter']).toBeUndefined()
    })

    it('does nothing without an application entry', () => {
        expect(() => runPlugin({})).not.toThrow()
    })
})
