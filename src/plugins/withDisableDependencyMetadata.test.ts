import { describe, it, expect, jest } from '@jest/globals'
import withDisableDependencyMetadata from './withDisableDependencyMetadata'

// Execute the gradle modifier directly instead of running expo's
// build-time plugin machinery.
jest.mock('@expo/config-plugins', () => ({
    withAppBuildGradle: (
        config: unknown,
        action: (config: unknown) => unknown,
    ) => action(config),
}))

const runPlugin = (contents: string) => {
    const modResults = { contents }
    const config = {
        name: 'time-tracking',
        slug: 'time-tracking',
        modResults,
    }
    withDisableDependencyMetadata(config)
    return modResults.contents
}

describe('withDisableDependencyMetadata', () => {
    it('injects the dependenciesInfo block into the android section', () => {
        const result = runPlugin('android {\n    namespace "com.example"\n}')

        expect(result).toContain('dependenciesInfo {')
        expect(result).toContain('includeInApk = false')
        expect(result).toContain('includeInBundle = false')
        // still inside the android block
        expect(result.indexOf('dependenciesInfo {')).toBeGreaterThan(
            result.indexOf('android {'),
        )
    })

    it('leaves the gradle file unchanged when the block already exists', () => {
        const contents =
            'android {\n    dependenciesInfo {\n        includeInApk = false\n    }\n}'

        expect(runPlugin(contents)).toBe(contents)
    })
})
