import { useEffect, useState, useMemo } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Stack, ThemeProvider as NavThemeProvider } from 'expo-router'
import { useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

import { ThemeProvider } from '../src/context/ThemeContext'
import { initDatabase } from '../src/db/database'
import initI18n from '../src/i18n/i18n'
import { initNfcService } from '../src/services/NFCService'
import { initQuickActions } from '../src/services/QuickActionService'
import '../src/services/LocationTask'

/**
 * Renders the root Stack with the navigation theme derived from the current
 * react-native-paper theme. Must be rendered inside ThemeProvider (PaperProvider)
 * so that useTheme() returns the correct dark/light paper theme.
 */
function ThemedStack() {
    const paperTheme = useTheme()
    const { t } = useTranslation()

    const navTheme = useMemo(() => {
        const colors = paperTheme.colors
        // Build a NavigationTheme from the current paper theme colors
        // so expo-router's NavigationContainer uses the correct background
        return {
            dark: paperTheme.dark,
            colors: {
                primary: String(colors.primary),
                background: String(colors.background),
                card: String(colors.surface),
                text: String(colors.onSurface),
                border: String(colors.outline),
                notification: String(colors.error),
            },
            fonts: {
                regular: { fontFamily: 'System', fontWeight: '400' as const },
                medium: { fontFamily: 'System', fontWeight: '500' as const },
                bold: { fontFamily: 'System', fontWeight: '700' as const },
                heavy: { fontFamily: 'System', fontWeight: '900' as const },
            },
        }
    }, [paperTheme])

    return (
        <NavThemeProvider value={navTheme}>
            <Stack>
                <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="settings"
                    options={{ title: t('settings.title') }}
                />
                <Stack.Screen
                    name="theme-settings"
                    options={{ title: t('settings.themeTitle') }}
                />
                <Stack.Screen
                    name="language-settings"
                    options={{ title: t('settings.languageTitle') }}
                />
                <Stack.Screen
                    name="geofence-setup"
                    options={{ title: t('menu.workingLocations') }}
                />
                <Stack.Screen
                    name="nfc-setup"
                    options={{ title: t('nfc.title') }}
                />
                <Stack.Screen
                    name="licenses"
                    options={{ title: t('menu.licenses') }}
                />
                <Stack.Screen
                    name="privacy-policy"
                    options={{ title: t('menu.privacyPolicy') }}
                />
            </Stack>
        </NavThemeProvider>
    )
}

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        const init = async () => {
            try {
                initDatabase()
                await initI18n()
            } catch (e) {
                console.error('Initialization failed', e)
            } finally {
                setIsReady(true)
            }
        }
        void init()
    }, [])

    useEffect(() => {
        if (!isReady) return
        const cleanupNfc = initNfcService()
        const cleanupQuickActions = initQuickActions()
        return () => {
            cleanupNfc()
            cleanupQuickActions()
        }
    }, [isReady])

    if (!isReady) return null

    return (
        <ThemeProvider>
            <SafeAreaProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <ThemedStack />
                </GestureHandlerRootView>
            </SafeAreaProvider>
        </ThemeProvider>
    )
}
