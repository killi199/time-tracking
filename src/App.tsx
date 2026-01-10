import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import {
    NavigationContainer,
    DarkTheme as NavDarkTheme,
    DefaultTheme as NavDefaultTheme,
    DrawerActions, // Import DrawerActions
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer'; // Import Drawer
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme, adaptNavigationTheme, BottomNavigation, IconButton } from 'react-native-paper';
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
import SettingsScreen from './screens/settings/SettingsScreen';
import ThemeSettingsScreen from './screens/settings/ThemeSettingsScreen';
import LanguageSettingsScreen from './screens/settings/LanguageSettingsScreen';
import GeofenceSetupScreen from './screens/menu/GeofenceSetupScreen';
import NFCSetupScreen from './screens/menu/NFCSetupScreen';
import MenuDrawerContent from './components/MenuDrawerContent'; // Import custom drawer content
import './services/LocationTask';
import { initNfcService } from './services/NFCService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator(); // Create Drawer

function MainTabs({ navigation }: { navigation: any }) {
    const theme = useTheme();
    const { t } = useTranslation();

    const renderIcon = useCallback(({ route, color }: { route: any, color: string }) => {
        let iconName = 'help';
        if (route.name === 'Day') {
            iconName = 'calendar-today';
        } else if (route.name === 'Week') {
            iconName = 'calendar-week';
        } else if (route.name === 'Month') {
            iconName = 'calendar-month';
        }

        return (
            <MaterialCommunityIcons
                name={iconName as any}
                size={24}
                color={color}
            />
        );
    }, []);

    return (
        <Tab.Navigator
            initialRouteName="Day"
            tabBar={({ navigation, state, descriptors, insets }) => (
                <BottomNavigation.Bar
                    navigationState={state}
                    safeAreaInsets={insets}
                    onTabPress={({ route }) => {
                        navigation.navigate(route.name, route.params);
                    }}
                    renderIcon={renderIcon}
                    getLabelText={({ route }) => {
                        const { options } = descriptors[route.key];
                        const label =
                            typeof options.tabBarLabel === 'string'
                                ? options.tabBarLabel
                                : typeof options.title === 'string'
                                    ? options.title
                                    : route.name;

                        return label;
                    }}
                />
            )}
            screenOptions={() => ({
                headerLeft: () => (
                    <IconButton
                        icon="menu"
                        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                    />
                ),
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.onBackground,
            })}
        >
            <Tab.Screen
                name="Day"
                component={HomeScreen}
                initialParams={{ viewMode: 'day' }}
                options={{ title: t('home.day') }}
            />
            <Tab.Screen
                name="Week"
                component={HomeScreen}
                initialParams={{ viewMode: 'week' }}
                options={{ title: t('home.week') }}
            />
            <Tab.Screen
                name="Month"
                component={HomeScreen}
                initialParams={{ viewMode: 'month' }}
                options={{ title: t('home.month') }}
            />
        </Tab.Navigator>
    );
}

function DrawerNav() {
    const theme = useTheme();

    return (
        <Drawer.Navigator
            drawerContent={(props) => <MenuDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveTintColor: theme.colors.primary,
                drawerInactiveTintColor: theme.colors.onSurfaceVariant,
            }}
        >
            <Drawer.Screen
                name="TimeTracking"
                component={MainTabs}
                options={{
                    headerShown: false,
                }}
            />
        </Drawer.Navigator>
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
                        component={DrawerNav}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{ title: t('settings.title') }}
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
                        options={{ title: t('menu.workingLocations') }}
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
