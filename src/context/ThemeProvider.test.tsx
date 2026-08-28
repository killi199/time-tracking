import type React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react-native'
import { Platform, useColorScheme } from 'react-native'
import { Text, useTheme, MD3LightTheme, MD3DarkTheme } from 'react-native-paper'
import * as SystemUI from 'expo-system-ui'
import { getMaterialColors } from '@expo/ui/jetpack-compose'
import { ThemeProvider } from './ThemeProvider'

jest.mock('expo-system-ui', () => ({
    setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}))

jest.mock('@expo/ui/jetpack-compose', () => ({
    getMaterialColors: jest.fn(),
}))

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
    __esModule: true,
    default: jest.fn(),
}))

const mockAndroidMaterialColors = {
    primary: '#111111FF' as `#${string}`,
    onPrimary: '#222222FF' as `#${string}`,
    primaryContainer: '#333333FF' as `#${string}`,
    onPrimaryContainer: '#444444FF' as `#${string}`,
    secondary: '#555555FF' as `#${string}`,
    onSecondary: '#666666FF' as `#${string}`,
    secondaryContainer: '#777777FF' as `#${string}`,
    onSecondaryContainer: '#888888FF' as `#${string}`,
    tertiary: '#999999FF' as `#${string}`,
    onTertiary: '#AAAAAAFF' as `#${string}`,
    tertiaryContainer: '#BBBBBBFF' as `#${string}`,
    onTertiaryContainer: '#CCCCCCFF' as `#${string}`,
    error: '#DDDDDDFF' as `#${string}`,
    onError: '#EEEEEEFF' as `#${string}`,
    errorContainer: '#FFFFFF' as `#${string}`,
    onErrorContainer: '#000000FF' as `#${string}`,
    outline: '#121212FF' as `#${string}`,
    outlineVariant: '#232323FF' as `#${string}`,
    scrim: '#343434FF' as `#${string}`,
    inversePrimary: '#454545FF' as `#${string}`,
    background: '#565656FF' as `#${string}`,
    onBackground: '#676767FF' as `#${string}`,
    surface: '#787878FF' as `#${string}`,
    onSurface: '#898989FF' as `#${string}`,
    surfaceVariant: '#9A9A9AFF' as `#${string}`,
    onSurfaceVariant: '#ABABABFF' as `#${string}`,
    inverseSurface: '#BCBCBCFF' as `#${string}`,
    inverseOnSurface: '#CDCDCDFF' as `#${string}`,
    surfaceContainerLow: '#DEDEEEFF' as `#${string}`,
    surfaceContainer: '#EFEFEFFF' as `#${string}`,
    surfaceContainerHigh: '#FAFAFAFF' as `#${string}`,
    surfaceContainerHighest: '#FBFBFBFF' as `#${string}`,
    surfaceContainerLowest: '#0A0A0AFF' as `#${string}`,
    surfaceDim: '#1A1A1AFF' as `#${string}`,
    surfaceBright: '#2A2A2AFF' as `#${string}`,
    surfaceTint: '#3A3A3AFF' as `#${string}`,
    primaryFixed: '#4A4A4AFF' as `#${string}`,
    primaryFixedDim: '#5A5A5AFF' as `#${string}`,
    onPrimaryFixed: '#6A6A6AFF' as `#${string}`,
    onPrimaryFixedVariant: '#7A7A7AFF' as `#${string}`,
    secondaryFixed: '#8A8A8AFF' as `#${string}`,
    secondaryFixedDim: '#9A9A9AFF' as `#${string}`,
    onSecondaryFixed: '#AAAAAAFF' as `#${string}`,
    onSecondaryFixedVariant: '#BAAAAAFF' as `#${string}`,
    tertiaryFixed: '#CAAAAAFF' as `#${string}`,
    tertiaryFixedDim: '#DAAAAAFF' as `#${string}`,
    onTertiaryFixed: '#EAAAAAFF' as `#${string}`,
    onTertiaryFixedVariant: '#FAAAAAFF' as `#${string}`,
}

const ThemeInspector: React.FC = () => {
    const theme = useTheme()
    return (
        <>
            <Text testID="theme-dark">{String(theme.dark)}</Text>
            <Text testID="theme-primary">{theme.colors.primary}</Text>
            <Text testID="theme-background">{theme.colors.background}</Text>
            <Text testID="theme-elevation-level1">
                {theme.colors.elevation.level1}
            </Text>
        </>
    )
}

describe('ThemeProvider', () => {
    const originalPlatformOS = Platform.OS

    beforeEach(() => {
        jest.clearAllMocks()
        Platform.OS = originalPlatformOS
        jest.mocked(SystemUI.setBackgroundColorAsync).mockResolvedValue(
            undefined,
        )
        jest.mocked(getMaterialColors).mockReturnValue(
            mockAndroidMaterialColors,
        )
    })

    describe('iOS / Non-Android Platform', () => {
        it('renders MD3LightTheme when system color scheme is light', async () => {
            Platform.OS = 'ios'
            jest.mocked(useColorScheme).mockReturnValue('light')

            await render(
                <ThemeProvider>
                    <ThemeInspector />
                </ThemeProvider>,
            )

            expect(getMaterialColors).not.toHaveBeenCalled()
            expect(screen.getByTestId('theme-dark')).toHaveTextContent('false')
            expect(screen.getByTestId('theme-primary')).toHaveTextContent(
                MD3LightTheme.colors.primary,
            )
            expect(screen.getByTestId('theme-background')).toHaveTextContent(
                MD3LightTheme.colors.background,
            )
            expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(
                MD3LightTheme.colors.background,
            )
        })

        it('renders MD3DarkTheme when system color scheme is dark', async () => {
            Platform.OS = 'ios'
            jest.mocked(useColorScheme).mockReturnValue('dark')

            await render(
                <ThemeProvider>
                    <ThemeInspector />
                </ThemeProvider>,
            )

            expect(getMaterialColors).not.toHaveBeenCalled()
            expect(screen.getByTestId('theme-dark')).toHaveTextContent('true')
            expect(screen.getByTestId('theme-primary')).toHaveTextContent(
                MD3DarkTheme.colors.primary,
            )
            expect(screen.getByTestId('theme-background')).toHaveTextContent(
                MD3DarkTheme.colors.background,
            )
            expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(
                MD3DarkTheme.colors.background,
            )
        })
    })

    describe('Android Platform with Material 3 dynamic colors', () => {
        it('applies dynamic light Material colors when color scheme is light', async () => {
            Platform.OS = 'android'
            jest.mocked(useColorScheme).mockReturnValue('light')

            await render(
                <ThemeProvider>
                    <ThemeInspector />
                </ThemeProvider>,
            )

            expect(getMaterialColors).toHaveBeenCalledWith({ scheme: 'light' })
            expect(screen.getByTestId('theme-dark')).toHaveTextContent('false')
            expect(screen.getByTestId('theme-primary')).toHaveTextContent(
                mockAndroidMaterialColors.primary,
            )
            expect(screen.getByTestId('theme-background')).toHaveTextContent(
                mockAndroidMaterialColors.background,
            )
            expect(
                screen.getByTestId('theme-elevation-level1'),
            ).toHaveTextContent(mockAndroidMaterialColors.surfaceContainerLow)
            expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(
                mockAndroidMaterialColors.background,
            )
        })

        it('applies dynamic dark Material colors when color scheme is dark', async () => {
            Platform.OS = 'android'
            jest.mocked(useColorScheme).mockReturnValue('dark')

            await render(
                <ThemeProvider>
                    <ThemeInspector />
                </ThemeProvider>,
            )

            expect(getMaterialColors).toHaveBeenCalledWith({ scheme: 'dark' })
            expect(screen.getByTestId('theme-dark')).toHaveTextContent('true')
            expect(screen.getByTestId('theme-primary')).toHaveTextContent(
                mockAndroidMaterialColors.primary,
            )
            expect(screen.getByTestId('theme-background')).toHaveTextContent(
                mockAndroidMaterialColors.background,
            )
            expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(
                mockAndroidMaterialColors.background,
            )
        })
    })

    describe('SystemUI background error handling', () => {
        it('catches and logs errors if setBackgroundColorAsync fails', async () => {
            Platform.OS = 'ios'
            jest.mocked(useColorScheme).mockReturnValue('light')
            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {})
            const backgroundError = new Error('Failed to set background color')
            jest.mocked(SystemUI.setBackgroundColorAsync).mockRejectedValue(
                backgroundError,
            )

            await render(
                <ThemeProvider>
                    <ThemeInspector />
                </ThemeProvider>,
            )

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to set SystemUI background color:',
                    backgroundError,
                )
            })

            consoleErrorSpy.mockRestore()
        })
    })
})
