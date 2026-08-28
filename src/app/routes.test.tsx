import { describe, it, expect, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import DayScreen from './(drawer)/(tabs)/index'
import WeekScreen from './(drawer)/(tabs)/week'
import MonthScreen from './(drawer)/(tabs)/month'
import GeofenceSetupRoute from './geofence-setup'
import LanguageSettingsRoute from './language-settings'
import LicensesRoute from './licenses'
import NFCSetupRoute from './nfc-setup'
import NFCRoute from './nfc'
import PrivacyPolicyRoute from './privacy-policy'
import SettingsRoute from './settings'

jest.mock('../screens/HomeScreen', () => {
    return function MockHomeScreen(props: { viewMode: string }) {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return (
            <RN.Text testID={`mock-home-screen-${props.viewMode}`}>
                {props.viewMode}
            </RN.Text>
        )
    }
})

jest.mock('../screens/menu/GeofenceSetupScreen', () => {
    return function MockGeofenceSetupScreen() {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return <RN.Text testID="mock-geofence-screen">Geofence</RN.Text>
    }
})

jest.mock('../screens/settings/LanguageSettingsScreen', () => {
    return function MockLanguageSettingsScreen() {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return <RN.Text testID="mock-language-screen">Language</RN.Text>
    }
})

jest.mock('../screens/menu/LicensesScreen', () => {
    return function MockLicensesScreen() {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return <RN.Text testID="mock-licenses-screen">Licenses</RN.Text>
    }
})

jest.mock('../screens/menu/NFCSetupScreen', () => {
    return function MockNFCSetupScreen() {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return <RN.Text testID="mock-nfc-setup-screen">NFC Setup</RN.Text>
    }
})

jest.mock('../screens/menu/PrivacyPolicyScreen', () => {
    return function MockPrivacyPolicyScreen() {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return (
            <RN.Text testID="mock-privacy-policy-screen">
                Privacy Policy
            </RN.Text>
        )
    }
})

jest.mock('../screens/settings/SettingsScreen', () => {
    return function MockSettingsScreen() {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return <RN.Text testID="mock-settings-screen">Settings</RN.Text>
    }
})

jest.mock('expo-router', () => ({
    Redirect: (props: { href: string }) => {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return (
            <RN.Text testID={`mock-redirect-${props.href}`}>
                Redirect {props.href}
            </RN.Text>
        )
    },
}))

describe('App Route Forwarders', () => {
    it('renders DayScreen with day viewMode', async () => {
        await render(<DayScreen />)
        expect(screen.getByTestId('mock-home-screen-day')).toBeVisible()
    })

    it('renders WeekScreen with week viewMode', async () => {
        await render(<WeekScreen />)
        expect(screen.getByTestId('mock-home-screen-week')).toBeVisible()
    })

    it('renders MonthScreen with month viewMode', async () => {
        await render(<MonthScreen />)
        expect(screen.getByTestId('mock-home-screen-month')).toBeVisible()
    })

    it('renders GeofenceSetupRoute', async () => {
        await render(<GeofenceSetupRoute />)
        expect(screen.getByTestId('mock-geofence-screen')).toBeVisible()
    })

    it('renders LanguageSettingsRoute', async () => {
        await render(<LanguageSettingsRoute />)
        expect(screen.getByTestId('mock-language-screen')).toBeVisible()
    })

    it('renders LicensesRoute', async () => {
        await render(<LicensesRoute />)
        expect(screen.getByTestId('mock-licenses-screen')).toBeVisible()
    })

    it('renders NFCSetupRoute', async () => {
        await render(<NFCSetupRoute />)
        expect(screen.getByTestId('mock-nfc-setup-screen')).toBeVisible()
    })

    it('renders NFCRoute with redirect', async () => {
        await render(<NFCRoute />)
        expect(screen.getByTestId('mock-redirect-/')).toBeVisible()
    })

    it('renders PrivacyPolicyRoute', async () => {
        await render(<PrivacyPolicyRoute />)
        expect(screen.getByTestId('mock-privacy-policy-screen')).toBeVisible()
    })

    it('renders SettingsRoute', async () => {
        await render(<SettingsRoute />)
        expect(screen.getByTestId('mock-settings-screen')).toBeVisible()
    })
})
