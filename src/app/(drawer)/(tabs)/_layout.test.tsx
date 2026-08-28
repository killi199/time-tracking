import type React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
    render,
    screen,
    userEvent,
    within,
} from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { useNavigation } from 'expo-router'
import { DrawerActions } from 'expo-router/react-navigation'
import TabsLayout from './_layout'

interface MockTabBarProps {
    navigation: {
        navigate: (name: string) => void
    }
    state: {
        index: number
        routes: Array<{ key: string; name: string }>
    }
    descriptors: Record<string, { options: Record<string, unknown> }>
    insets: { top: number; bottom: number; left: number; right: number }
}

interface MockTabsProps {
    tabBar?: (props: MockTabBarProps) => React.ReactElement<{
        onTabPress: (event: { route: { name: string } }) => void
        renderIcon: (props: {
            route: { name: string }
            color: string
        }) => React.ReactElement<{ source: string; color: string }>
        getLabelText: (props: {
            route: { key: string; name: string }
        }) => string
    }>
    screenOptions?: {
        headerLeft?: () => React.ReactNode
        headerStyle?: { backgroundColor?: string }
        headerTintColor?: string
    }
    children?: React.ReactNode
}

interface MockTabScreenProps {
    name: string
    options?: {
        title?: string
    }
}

const mockTabNavigate = jest.fn()
let capturedTabBarProps:
    | React.ReactElement<{
          onTabPress: (event: { route: { name: string } }) => void
          renderIcon: (props: {
              route: { name: string }
              color: string
          }) => React.ReactElement<{ source: string; color: string }>
          getLabelText: (props: {
              route: { key: string; name: string }
          }) => string
      }>
    | undefined

jest.mock('expo-router', () => {
    const { View, Text } =
        jest.requireActual<typeof import('react-native')>('react-native')
    const MockTabs = Object.assign(
        ({ tabBar, screenOptions, children }: MockTabsProps) => {
            const mockTabBarProps: MockTabBarProps = {
                navigation: {
                    navigate: mockTabNavigate,
                },
                state: {
                    index: 0,
                    routes: [
                        { key: 'key-index', name: 'index' },
                        { key: 'key-week', name: 'week' },
                        { key: 'key-month', name: 'month' },
                        { key: 'key-custom-label', name: 'custom' },
                        { key: 'key-no-title', name: 'fallback' },
                    ],
                },
                descriptors: {
                    'key-index': { options: { title: 'Day' } },
                    'key-week': { options: { title: 'Week' } },
                    'key-month': { options: { title: 'Month' } },
                    'key-custom-label': {
                        options: { tabBarLabel: 'Custom Label' },
                    },
                    'key-no-title': { options: {} },
                },
                insets: { top: 0, bottom: 0, left: 0, right: 0 },
            }

            const tabBarElement = tabBar?.(mockTabBarProps)
            capturedTabBarProps = tabBarElement

            return (
                <View testID="mock-tabs">
                    <View testID="mock-header-left">
                        {screenOptions?.headerLeft?.()}
                    </View>
                    <View testID="mock-tab-bar">{tabBarElement}</View>
                    {children}
                </View>
            )
        },
        {
            Screen: ({ name }: MockTabScreenProps) => (
                <Text testID={`mock-tab-screen-${name}`}>{name}</Text>
            ),
        },
    )

    return {
        Tabs: MockTabs,
        useNavigation: jest.fn(),
    }
})

jest.mock('expo-router/react-navigation', () => ({
    DrawerActions: {
        openDrawer: jest.fn().mockReturnValue({ type: 'OPEN_DRAWER' }),
    },
}))

describe('TabsLayout', () => {
    const mockDispatch = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(useNavigation).mockReturnValue({
            dispatch: mockDispatch,
        })
    })

    it('renders tabs with screens, tab items, and handles header menu press', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <TabsLayout />
            </PaperProvider>,
        )

        expect(screen.getByTestId('mock-tabs')).toBeVisible()
        expect(screen.getByTestId('mock-tab-screen-index')).toBeVisible()
        expect(screen.getByTestId('mock-tab-screen-week')).toBeVisible()
        expect(screen.getByTestId('mock-tab-screen-month')).toBeVisible()

        // Labels rendered via getLabelText
        expect(screen.getAllByText('Day')[0]).toBeOnTheScreen()
        expect(screen.getAllByText('Week')[0]).toBeOnTheScreen()
        expect(screen.getAllByText('Month')[0]).toBeOnTheScreen()
        expect(screen.getAllByText('Custom Label')[0]).toBeOnTheScreen()
        expect(screen.getAllByText('fallback')[0]).toBeOnTheScreen()

        // Pressing menu icon triggers openDrawer action
        const headerLeft = screen.getByTestId('mock-header-left')
        const menuButton = within(headerLeft).getByRole('button')
        await user.press(menuButton)
        expect(DrawerActions.openDrawer).toHaveBeenCalled()
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })

        // Validate captured tabBar props: onTabPress, renderIcon, getLabelText
        expect(capturedTabBarProps).not.toBeNull()
        capturedTabBarProps?.props.onTabPress({
            route: { name: 'week' },
        })
        expect(mockTabNavigate).toHaveBeenCalledWith('week')

        // Validate renderIcon returns correct icon for each route
        expect(
            capturedTabBarProps?.props.renderIcon({
                route: { name: 'index' },
                color: '#000000',
            }).props.source,
        ).toBe('calendar-today')

        expect(
            capturedTabBarProps?.props.renderIcon({
                route: { name: 'week' },
                color: '#000000',
            }).props.source,
        ).toBe('calendar-week')

        expect(
            capturedTabBarProps?.props.renderIcon({
                route: { name: 'month' },
                color: '#000000',
            }).props.source,
        ).toBe('calendar-month')

        expect(
            capturedTabBarProps?.props.renderIcon({
                route: { name: 'other' },
                color: '#000000',
            }).props.source,
        ).toBe('help')

        // Validate getLabelText branches
        expect(
            capturedTabBarProps?.props.getLabelText({
                route: { key: 'key-custom-label', name: 'custom' },
            }),
        ).toBe('Custom Label')
        expect(
            capturedTabBarProps?.props.getLabelText({
                route: { key: 'key-index', name: 'index' },
            }),
        ).toBe('Day')
        expect(
            capturedTabBarProps?.props.getLabelText({
                route: { key: 'key-no-title', name: 'fallback' },
            }),
        ).toBe('fallback')
    })
})
