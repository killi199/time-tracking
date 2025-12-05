import * as React from 'react';
import {
    createContext,
    useState,
    useEffect,
    useContext,
    ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
    MD3LightTheme,
    MD3DarkTheme,
    Provider as PaperProvider,
} from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';
import { getSetting, setSetting } from '../db/database';

type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    themeMode: 'auto',
    setThemeMode: () => { },
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load saved theme
        try {
            const savedTheme = getSetting('themeMode');
            if (
                savedTheme &&
                (savedTheme === 'auto' ||
                    savedTheme === 'light' ||
                    savedTheme === 'dark')
            ) {
                setThemeMode(savedTheme as ThemeMode);
            }
        } catch (e) {
            console.error('Failed to load theme setting', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const handleSetTheme = (mode: ThemeMode) => {
        setThemeMode(mode);
        setSetting('themeMode', mode);
    };

    const { theme } = useMaterial3Theme();

    const paperTheme = (() => {
        const derivedTheme =
            themeMode === 'dark' ||
                (themeMode === 'auto' && systemColorScheme === 'dark')
                ? { ...MD3DarkTheme, colors: theme.dark }
                : { ...MD3LightTheme, colors: theme.light };

        return derivedTheme;
    })();

    if (!isLoaded) return null; // Or a loading spinner

    return (
        <ThemeContext.Provider
            value={{ themeMode, setThemeMode: handleSetTheme }}
        >
            <PaperProvider theme={paperTheme}>{children}</PaperProvider>
        </ThemeContext.Provider>
    );
};
