import { useCallback } from 'react'
import { Tabs, useNavigation } from 'expo-router'
import { DrawerActions } from 'expo-router/react-navigation'
import {
    BottomNavigation,
    IconButton,
    Icon,
    useTheme,
} from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import type { ParamListBase, RouteProp } from 'expo-router/react-navigation'

export default function TabsLayout() {
    const theme = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation()

    const renderIcon = useCallback(
        ({
            route,
            color,
        }: {
            route: RouteProp<ParamListBase>
            color: string
        }) => {
            let iconName = 'help'
            if (route.name === 'day') {
                iconName = 'calendar-today'
            } else if (route.name === 'week') {
                iconName = 'calendar-week'
            } else if (route.name === 'month') {
                iconName = 'calendar-month'
            }
            return <Icon source={iconName} size={24} color={color} />
        },
        [],
    )

    return (
        <Tabs
            tabBar={({ navigation: tabNav, state, descriptors, insets }) => (
                <BottomNavigation.Bar
                    navigationState={state}
                    safeAreaInsets={insets}
                    onTabPress={({ route }) => {
                        tabNav.navigate(route.name)
                    }}
                    renderIcon={renderIcon}
                    getLabelText={({ route }) => {
                        const { options } = descriptors[route.key]
                        if (typeof options.tabBarLabel === 'string') {
                            return options.tabBarLabel
                        }
                        return typeof options.title === 'string'
                            ? options.title
                            : route.name
                    }}
                />
            )}
            screenOptions={{
                headerLeft: () => (
                    <IconButton
                        icon="menu"
                        onPress={() => {
                            navigation.dispatch(DrawerActions.openDrawer())
                        }}
                    />
                ),
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.onBackground,
            }}
        >
            <Tabs.Screen name="day" options={{ title: t('home.day') }} />
            <Tabs.Screen name="week" options={{ title: t('home.week') }} />
            <Tabs.Screen name="month" options={{ title: t('home.month') }} />
        </Tabs>
    )
}
