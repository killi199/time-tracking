import { ReactNode, useEffect } from 'react'
import * as SystemUI from 'expo-system-ui'
import { useColorScheme, Platform } from 'react-native'
import {
    MD3LightTheme,
    MD3DarkTheme,
    Provider as PaperProvider,
} from 'react-native-paper'
import { getMaterialColors } from '@expo/ui/jetpack-compose'
import { StatusBar } from 'expo-status-bar'
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme()
    const isDark = systemColorScheme === 'dark'

    const paperTheme = (() => {
        const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme

        if (Platform.OS !== 'android') {
            return baseTheme
        }

        // On Android, always apply Material You / M3 dynamic colors, passing
        // the resolved system scheme so the correct tonal palette is returned.
        const m3 = getMaterialColors({ scheme: isDark ? 'dark' : 'light' })

        return {
            ...baseTheme,
            colors: {
                ...baseTheme.colors,
                primary: m3.primary,
                onPrimary: m3.onPrimary,
                primaryContainer: m3.primaryContainer,
                onPrimaryContainer: m3.onPrimaryContainer,
                secondary: m3.secondary,
                onSecondary: m3.onSecondary,
                secondaryContainer: m3.secondaryContainer,
                onSecondaryContainer: m3.onSecondaryContainer,
                tertiary: m3.tertiary,
                onTertiary: m3.onTertiary,
                tertiaryContainer: m3.tertiaryContainer,
                onTertiaryContainer: m3.onTertiaryContainer,
                error: m3.error,
                onError: m3.onError,
                errorContainer: m3.errorContainer,
                onErrorContainer: m3.onErrorContainer,
                outline: m3.outline,
                outlineVariant: m3.outlineVariant,
                shadow: m3.scrim,
                scrim: m3.scrim,
                inversePrimary: m3.inversePrimary,
                background: m3.background,
                onBackground: m3.onBackground,
                surface: m3.surface,
                onSurface: m3.onSurface,
                surfaceVariant: m3.surfaceVariant,
                onSurfaceVariant: m3.onSurfaceVariant,
                inverseSurface: m3.inverseSurface,
                inverseOnSurface: m3.inverseOnSurface,
                elevation: {
                    level0: 'transparent',
                    level1: m3.surfaceContainerLow,
                    level2: m3.surfaceContainer,
                    level3: m3.surfaceContainerHigh,
                    level4: m3.surfaceContainerHighest,
                    level5: m3.surfaceContainerHighest,
                },
            },
        }
    })()

    useEffect(() => {
        SystemUI.setBackgroundColorAsync(paperTheme.colors.background).catch(
            (err: unknown) => {
                console.error('Failed to set SystemUI background color:', err)
            },
        )
    }, [paperTheme.colors.background])

    return (
        <PaperProvider theme={paperTheme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {children}
        </PaperProvider>
    )
}
