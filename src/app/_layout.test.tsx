import type React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react-native'
import { AppState } from 'react-native'
import * as SystemUI from 'expo-system-ui'
import * as Localization from 'expo-localization'
import RNRestart from 'react-native-restart'
import RootLayout from './_layout'
import { initDatabase } from '../db/database'
import initI18n from '../i18n/i18n'
import { initNfcService } from '../services/NFCService'
import { initQuickActions } from '../services/QuickActionService'

interface MockStackProps {
    screenOptions?: {
        contentStyle?: { backgroundColor?: string }
    }
    children?: React.ReactNode
}

interface MockStackScreenProps {
    name: string
    options?: {
        title?: string
        headerShown?: boolean
    }
}

const mockCleanupNfc = jest.fn(() => {})
const mockCleanupQuickActions = jest.fn(() => {})

jest.mock('react-native-gesture-handler', () => ({
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
        children,
}))

jest.mock('../db/database', () => ({
    initDatabase: jest.fn(),
}))

jest.mock('../i18n/i18n', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => Promise.resolve()),
}))

jest.mock('../services/NFCService', () => ({
    initNfcService: jest.fn(() => mockCleanupNfc),
}))

jest.mock('../services/QuickActionService', () => ({
    initQuickActions: jest.fn(() => mockCleanupQuickActions),
}))

jest.mock('../services/LocationTask', () => ({}))

jest.mock('expo-router', () => {
    const { View, Text } =
        jest.requireActual<typeof import('react-native')>('react-native')
    const MockStack = Object.assign(
        ({ children }: MockStackProps) => (
            <View testID="mock-stack">{children}</View>
        ),
        {
            Screen: ({ name }: MockStackScreenProps) => (
                <Text testID={`mock-stack-screen-${name}`}>{name}</Text>
            ),
        },
    )

    return {
        Stack: MockStack,
        ThemeProvider: ({ children }: { children: React.ReactNode }) =>
            children,
    }
})

jest.mock('expo-system-ui', () => ({
    setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}))

jest.mock('expo-localization', () => ({
    getCalendars: jest.fn(() => [{ timeZone: 'Europe/Berlin' }]),
}))

jest.mock('react-native-restart', () => ({
    __esModule: true,
    default: {
        restart: jest.fn(),
    },
}))

describe('RootLayout', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({
            remove: jest.fn(),
        }))
        jest.mocked(initDatabase).mockReturnValue(undefined)
        jest.mocked(initI18n).mockResolvedValue(undefined)
        jest.mocked(initNfcService).mockImplementation(() => mockCleanupNfc)
        jest.mocked(initQuickActions).mockImplementation(
            () => mockCleanupQuickActions,
        )
    })

    it('initializes database, i18n, services and renders stack screens', async () => {
        const { unmount } = await render(<RootLayout />)

        await waitFor(() => {
            expect(initDatabase).toHaveBeenCalled()
            expect(initI18n).toHaveBeenCalled()
            expect(initNfcService).toHaveBeenCalled()
            expect(initQuickActions).toHaveBeenCalled()
        })

        expect(screen.getByTestId('mock-stack')).toBeVisible()
        expect(screen.getByTestId('mock-stack-screen-(drawer)')).toBeVisible()
        expect(screen.getByTestId('mock-stack-screen-settings')).toBeVisible()
        expect(
            screen.getByTestId('mock-stack-screen-language-settings'),
        ).toBeVisible()
        expect(
            screen.getByTestId('mock-stack-screen-geofence-setup'),
        ).toBeVisible()
        expect(screen.getByTestId('mock-stack-screen-nfc-setup')).toBeVisible()
        expect(screen.getByTestId('mock-stack-screen-nfc')).toBeVisible()
        expect(screen.getByTestId('mock-stack-screen-licenses')).toBeVisible()
        expect(
            screen.getByTestId('mock-stack-screen-privacy-policy'),
        ).toBeVisible()

        await unmount()
        expect(mockCleanupNfc).toHaveBeenCalled()
        expect(mockCleanupQuickActions).toHaveBeenCalled()
    })

    it('handles initialization error gracefully', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {})
        const initError = new Error('Database corrupted')
        jest.mocked(initI18n).mockRejectedValue(initError)

        await render(<RootLayout />)

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Initialization failed',
                initError,
            )
            expect(initNfcService).toHaveBeenCalled()
            expect(initQuickActions).toHaveBeenCalled()
        })

        expect(screen.getByTestId('mock-stack')).toBeVisible()
        consoleErrorSpy.mockRestore()
    })

    it('sets SystemUI background color to theme background', async () => {
        await render(<RootLayout />)
        expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(
            'rgba(255, 251, 254, 1)',
        )
    })

    it('restarts the app when timezone changes on app active', async () => {
        // Mock initial timezone
        jest.mocked(Localization.getCalendars).mockReturnValue([
            { timeZone: 'Europe/Berlin' } as Localization.Calendar,
        ])

        let appStateCallback: (state: string) => void = () => {}
        jest.spyOn(AppState, 'addEventListener').mockImplementation(
            (event, callback) => {
                if (event === 'change') {
                    appStateCallback = callback as (state: string) => void
                }
                return {
                    remove: jest.fn(),
                }
            },
        )

        await render(<RootLayout />)

        // Simulate app coming to foreground with DIFFERENT timezone
        jest.mocked(Localization.getCalendars).mockReturnValue([
            { timeZone: 'America/New_York' } as Localization.Calendar,
        ])
        appStateCallback('active')

        expect(RNRestart.restart).toHaveBeenCalled()
    })

    it('does not restart the app when timezone is same on app active', async () => {
        // Mock initial timezone
        jest.mocked(Localization.getCalendars).mockReturnValue([
            { timeZone: 'Europe/Berlin' } as Localization.Calendar,
        ])
        jest.mocked(RNRestart.restart).mockClear()

        let appStateCallback: (state: string) => void = () => {}
        jest.spyOn(AppState, 'addEventListener').mockImplementation(
            (event, callback) => {
                if (event === 'change') {
                    appStateCallback = callback as (state: string) => void
                }
                return {
                    remove: jest.fn(),
                }
            },
        )

        await render(<RootLayout />)

        // Simulate app coming to foreground with SAME timezone
        jest.mocked(Localization.getCalendars).mockReturnValue([
            { timeZone: 'Europe/Berlin' } as Localization.Calendar,
        ])
        appStateCallback('active')

        expect(RNRestart.restart).not.toHaveBeenCalled()
    })
})
