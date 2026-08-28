import type React from 'react'
import { describe, it, expect, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import DrawerLayout from './_layout'

interface MockDrawerProps {
    drawerContent?: (props: unknown) => React.ReactNode
    screenOptions?: {
        headerShown?: boolean
        drawerActiveTintColor?: string
        drawerInactiveTintColor?: string
    }
    children?: React.ReactNode
}

interface MockScreenProps {
    name: string
    options?: {
        headerShown?: boolean
    }
}

jest.mock('expo-router/drawer', () => {
    const { View, Text } =
        jest.requireActual<typeof import('react-native')>('react-native')
    const MockDrawer = Object.assign(
        ({ drawerContent, children }: MockDrawerProps) => (
            <View testID="mock-drawer">
                <View testID="mock-drawer-content">{drawerContent?.({})}</View>
                {children}
            </View>
        ),
        {
            Screen: ({ name }: MockScreenProps) => (
                <Text testID={`mock-drawer-screen-${name}`}>{name}</Text>
            ),
        },
    )
    return { Drawer: MockDrawer }
})

jest.mock('../../components/MenuDrawerContent', () => {
    return function MockMenuDrawerContent() {
        const { Text } =
            jest.requireActual<typeof import('react-native')>('react-native')
        return <Text testID="mock-menu-drawer-content">Menu Drawer</Text>
    }
})

describe('DrawerLayout', () => {
    it('renders Drawer with MenuDrawerContent and tabs screen', async () => {
        await render(
            <PaperProvider>
                <DrawerLayout />
            </PaperProvider>,
        )

        expect(screen.getByTestId('mock-drawer')).toBeVisible()
        expect(screen.getByTestId('mock-menu-drawer-content')).toBeVisible()
        expect(screen.getByTestId('mock-drawer-screen-(tabs)')).toBeVisible()
    })
})
