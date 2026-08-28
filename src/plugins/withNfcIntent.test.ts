import { describe, it, expect, jest } from '@jest/globals'
import withNfcIntent from './withNfcIntent'

// Execute the modifier functions directly instead of running expo's
// build-time plugin machinery.
jest.mock('@expo/config-plugins', () => ({
    withAndroidManifest: (
        config: unknown,
        action: (config: unknown) => unknown,
    ) => action(config),
    withMainActivity: (config: unknown, action: (config: unknown) => unknown) =>
        action(config),
}))

interface ManifestActivity {
    $: Record<string, string>
    'intent-filter'?: unknown[]
}

interface TestManifest {
    application?: { activity?: ManifestActivity[] }[]
}

const runPlugin = (manifest: TestManifest, contents?: string) => {
    const config = {
        name: 'time-tracking',
        slug: 'time-tracking',
        modResults: { manifest, contents: contents ?? '' },
    }
    withNfcIntent(config)
    return config.modResults
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

    it('injects intent clearing logic into MainActivity.kt', () => {
        const initialContents = `
class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(null)
  }
}`
        const modResults = runPlugin({}, initialContents)
        expect(modResults.contents).toContain(
            'FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY',
        )
        expect(modResults.contents).toContain('ACTION_NDEF_DISCOVERED')
        expect(modResults.contents).toContain('super.onCreate(null)')
    })

    it('does not re-inject if already present in MainActivity.kt', () => {
        const initialContents = `
class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    val isFromHistory = (intent.flags and android.content.Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0
    super.onCreate(null)
  }
}`
        const modResults = runPlugin({}, initialContents)
        expect(modResults.contents).toBe(initialContents)
    })
})
