import * as React from 'react';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import {
    NavigationContainer,
    DarkTheme as NavDarkTheme,
    DefaultTheme as NavDefaultTheme,
    CommonActions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme, adaptNavigationTheme, BottomNavigation, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import { initDatabase } from './db/database';
import { ThemeProvider, useAppTheme } from './context/ThemeContext';
import initI18n from './i18n/i18n';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';

enableScreens(true);

import HomeScreen from './screens/HomeScreen';
import MenuScreen from './screens/menu/MenuScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import ThemeSettingsScreen from './screens/settings/ThemeSettingsScreen';
import LanguageSettingsScreen from './screens/settings/LanguageSettingsScreen';
import GeofenceSetupScreen from './screens/menu/GeofenceSetupScreen';
import NFCSetupScreen from './screens/menu/NFCSetupScreen';
import './services/LocationTask';
import { initNfcService } from './services/NFCService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    const theme = useTheme();
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            initialRouteName="DayView"
            tabBar={({ navigation, state, descriptors, insets }) => (
                <BottomNavigation.Bar
                    navigationState={state}
                    safeAreaInsets={insets}
                    onTabPress={({ route, preventDefault }) => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (event.defaultPrevented) {
                            preventDefault();
                        } else {
                            navigation.dispatch({
                                ...CommonActions.navigate(route.name, route.params),
                                target: state.key,
                            });
                        }
                    }}
                    renderIcon={({ route, focused, color }) => {
                        const { options } = descriptors[route.key];
                        if (options.tabBarIcon) {
                            return options.tabBarIcon({ focused, color, size: 24 });
                        }

                        return null;
                    }}
                    getLabelText={({ route }) => {
                        const { options } = descriptors[route.key];
                        const label =
                            options.tabBarLabel !== undefined
                                ? options.tabBarLabel
                                : options.title !== undefined
                                    ? options.title
                                    : route.name;

                        return label as string;
                    }}
                    getAccessibilityLabel={({ route }) => {
                        const { options } = descriptors[route.key];
                        return options.tabBarAccessibilityLabel;
                    }}
                />
            )}
            screenOptions={({ route }) => ({
                headerShown: true,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = 'help';

                    if (route.name === 'Menu') {
                        iconName = focused ? 'menu' : 'menu';
                    } else if (route.name === 'DayView') {
                        iconName = focused
                            ? 'calendar-today'
                            : 'calendar-today';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'cog' : 'cog-outline';
                    }

                    return (
                        <MaterialCommunityIcons
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            name={iconName as any}
                            size={size}
                            color={color}
                        />
                    );
                },
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.onBackground,
            })}
        >
            <Tab.Screen
                name="Menu"
                component={MenuScreen}
                options={{ title: t('menu.title') }}
            />
            <Tab.Screen
                name="DayView"
                component={HomeScreen}
                options={{ title: t('home.title') }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: t('settings.title') }}
            />
        </Tab.Navigator>
    );
}

function NavigationWrapper() {
    const { themeMode } = useAppTheme();
    const systemColorScheme = useColorScheme();
    const { t } = useTranslation();
    const paperTheme = useTheme();

    const navTheme = React.useMemo(() => {
        const { LightTheme, DarkTheme } = adaptNavigationTheme({
            reactNavigationLight: NavDefaultTheme,
            reactNavigationDark: NavDarkTheme,
            materialLight: paperTheme,
            materialDark: paperTheme,
        });
        return (paperTheme.dark ? DarkTheme : LightTheme) as any;
    }, [paperTheme]);

    const isDark =
        themeMode === 'dark' ||
        (themeMode === 'auto' && systemColorScheme === 'dark');

    return (
        <GestureHandlerRootView
            style={{ flex: 1, backgroundColor: navTheme.colors.background }}
        >
            <NavigationContainer theme={navTheme}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Stack.Navigator initialRouteName="Main" screenOptions={{ animation: 'default' }}>
                    <Stack.Screen
                        name="Main"
                        component={MainTabs}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="ThemeSettings"
                        component={ThemeSettingsScreen}
                        options={{ title: t('settings.themeTitle') }}
                    />
                    <Stack.Screen
                        name="LanguageSettings"
                        component={LanguageSettingsScreen}
                        options={{ title: t('settings.languageTitle') }}
                    />
                    <Stack.Screen
                        name="GeofenceSetup"
                        component={GeofenceSetupScreen}
                        options={{ title: t('geofence.title') }}
                    />
                    <Stack.Screen
                        name="NFCSetup"
                        component={NFCSetupScreen}
                        options={{ title: t('nfc.title') }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}

export default function App() {
    const [isDbReady, setIsDbReady] = React.useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                initDatabase();
                await initI18n();
            } catch (e) {
                console.error('Initialization failed', e);
            } finally {
                setIsDbReady(true);
            }
        };
        init();
    }, []);

    // NFC Handling
    useEffect(() => {
        if (!isDbReady) return;

        const cleanup = initNfcService();
        return cleanup;
    }, [isDbReady]);

    if (!isDbReady) {
        return null;
    }

    return (
        <ThemeProvider>
            <SafeAreaProvider>
                <NavigationWrapper />
            </SafeAreaProvider>
        </ThemeProvider>
    );
}
