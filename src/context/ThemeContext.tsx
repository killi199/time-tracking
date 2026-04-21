import { createContext, useState, useContext, ReactNode } from 'react'
import { useColorScheme, Platform } from 'react-native'
import {
    MD3LightTheme,
    MD3DarkTheme,
    Provider as PaperProvider,
} from 'react-native-paper'
import { Color } from 'expo-router'
import { getSetting, setSetting } from '../db/database'

export type ThemeMode = 'auto' | 'light' | 'dark'

interface ThemeContextType {
    themeMode: ThemeMode
    setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType>({
    themeMode: 'auto',
    setThemeMode: () => {},
})

export const useAppTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme()
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        try {
            const savedTheme = getSetting('themeMode')
            if (
                savedTheme &&
                (savedTheme === 'auto' ||
                    savedTheme === 'light' ||
                    savedTheme === 'dark')
            ) {
                return savedTheme
            }
        } catch (e) {
            console.error('Failed to load theme setting', e)
        }
        return 'auto'
    })

    const handleSetTheme = (mode: ThemeMode) => {
        setThemeMode(mode)
        setSetting('themeMode', mode)
    }

    const paperTheme = (() => {
        const isDark =
            themeMode === 'dark' ||
            (themeMode === 'auto' && systemColorScheme === 'dark')

        const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme

        let customColors = {}
        if (Platform.OS === 'android') {
            customColors = {
                primary: Color.android.dynamic.primary,
                onPrimary: Color.android.dynamic.onPrimary,
                primaryContainer: Color.android.dynamic.primaryContainer,
                onPrimaryContainer: Color.android.dynamic.onPrimaryContainer,
                secondary: Color.android.dynamic.secondary,
                onSecondary: Color.android.dynamic.onSecondary,
                secondaryContainer: Color.android.dynamic.secondaryContainer,
                onSecondaryContainer:
                    Color.android.dynamic.onSecondaryContainer,
                tertiary: Color.android.dynamic.tertiary,
                onTertiary: Color.android.dynamic.onTertiary,
                tertiaryContainer: Color.android.dynamic.tertiaryContainer,
                onTertiaryContainer: Color.android.dynamic.onTertiaryContainer,
                error: Color.android.dynamic.error,
                onError: Color.android.dynamic.onError,
                errorContainer: Color.android.dynamic.errorContainer,
                onErrorContainer: Color.android.dynamic.onErrorContainer,
                outline: Color.android.dynamic.outline,
                outlineVariant: Color.android.dynamic.outlineVariant,
                shadow: Color.android.dynamic.shadow,
                scrim: Color.android.dynamic.scrim,
                inversePrimary: Color.android.dynamic.inversePrimary,
            }
        }

        return {
            ...baseTheme,
            colors: {
                ...baseTheme.colors,
                ...customColors,
            },
        }
    })()

    return (
        <ThemeContext value={{ themeMode, setThemeMode: handleSetTheme }}>
            <PaperProvider theme={paperTheme}>{children}</PaperProvider>
        </ThemeContext>
    )
}
