import { Drawer } from 'expo-router/drawer'
import { useTheme } from 'react-native-paper'

import MenuDrawerContent from '../../src/components/MenuDrawerContent'

export default function DrawerLayout() {
    const paperTheme = useTheme()

    return (
        <Drawer
            drawerContent={(props) => <MenuDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveTintColor: paperTheme.colors.primary,
                drawerInactiveTintColor: paperTheme.colors.onSurfaceVariant,
            }}
        >
            <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
        </Drawer>
    )
}
