import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import PrivacyPolicyScreen from './PrivacyPolicyScreen'

describe('PrivacyPolicyScreen', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        originalEnv = process.env
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('renders basic privacy policy content for FOSS build', async () => {
        process.env = { ...originalEnv, EXPO_PUBLIC_FOSS_BUILD: 'true' }

        await render(
            <PaperProvider>
                <PrivacyPolicyScreen />
            </PaperProvider>,
        )

        expect(screen.getByText('privacy.title')).toBeVisible()
        expect(screen.getByText('privacy.intro')).toBeVisible()
        expect(screen.getByText('privacy.rightsTitle')).toBeVisible()

        // FOSS build should NOT show location and maps privacy
        expect(
            screen.queryByText('privacy.locationTitle'),
        ).not.toBeOnTheScreen()
        expect(screen.queryByText('privacy.mapsTitle')).not.toBeOnTheScreen()
    })
})
