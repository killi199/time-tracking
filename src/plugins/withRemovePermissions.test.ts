import { describe, it, expect, afterEach, vi } from 'vitest'
import withRemovePermissions from './withRemovePermissions'

// Execute the manifest modifier directly instead of running expo's
// build-time plugin machinery.
vi.mock('@expo/config-plugins', () => ({
    withAndroidManifest: (
        config: unknown,
        action: (config: unknown) => unknown,
    ) => action(config),
}))

interface TestManifest {
    $: Record<string, string>
    'uses-permission'?: { $: Record<string, string> }[]
}

const permission = (name: string) => ({ $: { 'android:name': name } })

const permissionNames = (manifest: TestManifest) =>
    (manifest['uses-permission'] ?? []).map((perm) => perm.$['android:name'])

const runPlugin = (manifest: TestManifest) => {
    const config = {
        name: 'time-tracking',
        slug: 'time-tracking',
        modResults: { manifest },
    }
    withRemovePermissions(config)
    return manifest
}

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('withRemovePermissions', () => {
    it('removes the unwanted permissions in default builds', () => {
        vi.stubEnv('EXPO_PUBLIC_FOSS_BUILD', 'false')

        const manifest = runPlugin({
            $: {},
            'uses-permission': [
                permission('android.permission.SYSTEM_ALERT_WINDOW'),
                permission('android.permission.VIBRATE'),
                permission('android.permission.INTERNET'),
                permission('android.permission.NFC'),
            ],
        })

        expect(permissionNames(manifest)).toEqual([
            'android.permission.INTERNET',
            'android.permission.NFC',
        ])
        expect(manifest.$['xmlns:tools']).toBeUndefined()
    })

    it('also removes network permissions in FOSS builds', () => {
        vi.stubEnv('EXPO_PUBLIC_FOSS_BUILD', 'true')

        const manifest = runPlugin({
            $: {},
            'uses-permission': [
                permission('android.permission.VIBRATE'),
                permission('android.permission.INTERNET'),
                permission('android.permission.ACCESS_NETWORK_STATE'),
                permission('android.permission.NFC'),
            ],
        })

        // The remaining INTERNET / ACCESS_NETWORK_STATE entries are the
        // injected tools:node="remove" directives, not real permissions.
        expect(manifest['uses-permission']).toEqual([
            permission('android.permission.NFC'),
            {
                $: {
                    'android:name': 'android.permission.INTERNET',
                    'tools:node': 'remove',
                },
            },
            {
                $: {
                    'android:name': 'android.permission.ACCESS_NETWORK_STATE',
                    'tools:node': 'remove',
                },
            },
        ])
    })

    it('adds the tools namespace in FOSS builds', () => {
        vi.stubEnv('EXPO_PUBLIC_FOSS_BUILD', 'true')

        const manifest = runPlugin({ $: {} })

        expect(manifest.$['xmlns:tools']).toBe(
            'http://schemas.android.com/tools',
        )
    })

    it('handles a manifest without permissions', () => {
        vi.stubEnv('EXPO_PUBLIC_FOSS_BUILD', 'false')

        const manifest = runPlugin({ $: {} })

        expect(manifest['uses-permission']).toEqual([])
    })
})
