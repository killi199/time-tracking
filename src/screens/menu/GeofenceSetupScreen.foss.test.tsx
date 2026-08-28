import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import GeofenceSetupScreen from './GeofenceSetupScreen.foss'

describe('GeofenceSetupScreen.foss', () => {
    it('renders title and FOSS unavailability message', async () => {
        await render(
            <PaperProvider>
                <GeofenceSetupScreen />
            </PaperProvider>,
        )

        expect(screen.getByText('menu.workingLocations')).toBeVisible()
        expect(screen.getByText('geofence.fossUnavailable')).toBeVisible()
    })
})
