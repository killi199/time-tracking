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
    const RN = jest.requireActual<typeof import('react-native')>('react-native')
    const MockDrawer = Object.assign(
        ({ drawerContent, children }: MockDrawerProps) => (
            <RN.View testID="mock-drawer">
                <RN.View testID="mock-drawer-content">
                    {drawerContent?.({})}
                </RN.View>
                {children}
            </RN.View>
        ),
        {
            Screen: ({ name }: MockScreenProps) => (
                <RN.Text testID={`mock-drawer-screen-${name}`}>{name}</RN.Text>
            ),
        },
    )
    return { Drawer: MockDrawer }
})

jest.mock('../../components/MenuDrawerContent', () => {
    return function MockMenuDrawerContent() {
        const RN =
            jest.requireActual<typeof import('react-native')>('react-native')
        return <RN.Text testID="mock-menu-drawer-content">Menu Drawer</RN.Text>
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
