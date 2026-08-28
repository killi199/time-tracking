import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
    render,
    screen,
    userEvent,
    waitFor,
} from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import MenuDrawerContent from './MenuDrawerContent'
import { DrawerContentComponentProps } from 'expo-router/drawer'
import type { CSVResult } from '../utils/csv'

const mockPush = jest.fn()
const mockCloseDrawer = jest.fn()

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}))

jest.mock('expo-router/drawer', () => {
    const { ScrollView } =
        jest.requireActual<typeof import('react-native')>('react-native')
    return {
        DrawerContentScrollView: ({
            children,
        }: {
            children: React.ReactNode
        }) => <ScrollView testID="drawer-scroll-view">{children}</ScrollView>,
    }
})

jest.mock('react-native-safe-area-context', () => {
    const actual = jest.requireActual<
        typeof import('react-native-safe-area-context')
    >('react-native-safe-area-context')
    return {
        ...actual,
        useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
    }
})

const mockExportToCSV = jest.fn<() => Promise<CSVResult>>()
const mockImportFromCSV = jest.fn<() => Promise<CSVResult>>()

jest.mock('../utils/csv', () => ({
    exportToCSV: () => mockExportToCSV(),
    importFromCSV: () => mockImportFromCSV(),
}))

describe('MenuDrawerContent', () => {
    const mockProps = {
        navigation: {
            closeDrawer: mockCloseDrawer,
        },
    } as unknown as DrawerContentComponentProps

    beforeEach(() => {
        jest.clearAllMocks()
        delete process.env.EXPO_PUBLIC_FOSS_BUILD
    })

    it('renders drawer header and navigation items in FOSS mode by default', async () => {
        await render(
            <PaperProvider>
                <MenuDrawerContent {...mockProps} />
            </PaperProvider>,
        )

        expect(screen.getByText('menu.headline')).toBeVisible()
        expect(screen.getByText('nfc.title')).toBeVisible()
        expect(screen.getByText('settings.title')).toBeVisible()
        expect(screen.getByText('menu.exportCSV')).toBeVisible()
        expect(screen.getByText('menu.importCSV')).toBeVisible()
        expect(screen.getByText('menu.licenses')).toBeVisible()
        expect(screen.getByText('menu.privacyPolicy')).toBeVisible()

        // Working locations is omitted when FOSS is true / default
        expect(
            screen.queryByText('menu.workingLocations'),
        ).not.toBeOnTheScreen()
    })

    it('renders working locations item when EXPO_PUBLIC_FOSS_BUILD is false', async () => {
        process.env.EXPO_PUBLIC_FOSS_BUILD = 'false'

        await render(
            <PaperProvider>
                <MenuDrawerContent {...mockProps} />
            </PaperProvider>,
        )

        expect(screen.getByText('menu.workingLocations')).toBeVisible()

        const user = userEvent.setup()
        await user.press(screen.getByText('menu.workingLocations'))

        expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
        expect(mockPush).toHaveBeenCalledWith('/geofence-setup')
    })

    it('navigates to nfc-setup when NFC item is pressed', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <MenuDrawerContent {...mockProps} />
            </PaperProvider>,
        )

        await user.press(screen.getByText('nfc.title'))
        expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
        expect(mockPush).toHaveBeenCalledWith('/nfc-setup')
    })

    it('navigates to settings when Settings item is pressed', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <MenuDrawerContent {...mockProps} />
            </PaperProvider>,
        )

        await user.press(screen.getByText('settings.title'))
        expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
        expect(mockPush).toHaveBeenCalledWith('/settings')
    })

    it('navigates to licenses and privacy policy from footer buttons', async () => {
        const user = userEvent.setup()
        await render(
            <PaperProvider>
                <MenuDrawerContent {...mockProps} />
            </PaperProvider>,
        )

        await user.press(screen.getByText('menu.licenses'))
        expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
        expect(mockPush).toHaveBeenCalledWith('/licenses')

        await user.press(screen.getByText('menu.privacyPolicy'))
        expect(mockCloseDrawer).toHaveBeenCalledTimes(2)
        expect(mockPush).toHaveBeenCalledWith('/privacy-policy')
    })

    describe('CSV Export', () => {
        it('shows success dialog when export succeeds with message', async () => {
            mockExportToCSV.mockResolvedValue({
                success: true,
                message: 'csv.exportSuccess',
            })

            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <MenuDrawerContent {...mockProps} />
                </PaperProvider>,
            )

            await user.press(screen.getByText('menu.exportCSV'))

            expect(mockCloseDrawer).toHaveBeenCalled()
            await waitFor(() => {
                expect(screen.getByText('common.success')).toBeOnTheScreen()
                expect(screen.getByText('csv.exportSuccess')).toBeOnTheScreen()
            })

            // Dismiss dialog
            await user.press(screen.getByText('common.confirm'))
            await waitFor(() => {
                expect(
                    screen.queryByText('common.success'),
                ).not.toBeOnTheScreen()
            })
        })

        it('shows error dialog when export fails with message', async () => {
            mockExportToCSV.mockResolvedValue({
                success: false,
                message: 'csv.exportFailed',
            })

            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <MenuDrawerContent {...mockProps} />
                </PaperProvider>,
            )

            await user.press(screen.getByText('menu.exportCSV'))

            await waitFor(() => {
                expect(screen.getByText('common.error')).toBeOnTheScreen()
                expect(screen.getByText('csv.exportFailed')).toBeOnTheScreen()
            })
        })
    })

    describe('CSV Import', () => {
        it.each([
            {
                result: { success: true, count: 5, workHoursCount: 3 },
                expectedMessage: 'csv.importedBoth',
                description: 'both events and work hours are imported',
            },
            {
                result: { success: true, count: 0, workHoursCount: 4 },
                expectedMessage: 'csv.importedWorkHours',
                description: 'only work hours are imported',
            },
            {
                result: { success: true, count: 6, workHoursCount: 0 },
                expectedMessage: 'csv.importedEvents',
                description: 'only events are imported',
            },
        ])(
            'shows success dialog when $description',
            async ({ result, expectedMessage }) => {
                mockImportFromCSV.mockResolvedValue(result)

                const user = userEvent.setup()
                await render(
                    <PaperProvider>
                        <MenuDrawerContent {...mockProps} />
                    </PaperProvider>,
                )

                await user.press(screen.getByText('menu.importCSV'))

                await waitFor(() => {
                    expect(screen.getByText('common.success')).toBeOnTheScreen()
                    expect(screen.getByText(expectedMessage)).toBeOnTheScreen()
                })
            },
        )

        it('shows error dialog with message when import fails and was not cancelled', async () => {
            mockImportFromCSV.mockResolvedValue({
                success: false,
                cancelled: false,
                message: 'csv.invalidFormat',
            })

            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <MenuDrawerContent {...mockProps} />
                </PaperProvider>,
            )

            await user.press(screen.getByText('menu.importCSV'))

            await waitFor(() => {
                expect(screen.getByText('common.error')).toBeOnTheScreen()
                expect(screen.getByText('csv.invalidFormat')).toBeOnTheScreen()
            })
        })

        it('shows unknown error dialog when import fails without message and was not cancelled', async () => {
            mockImportFromCSV.mockResolvedValue({
                success: false,
                cancelled: false,
            })

            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <MenuDrawerContent {...mockProps} />
                </PaperProvider>,
            )

            await user.press(screen.getByText('menu.importCSV'))

            await waitFor(() => {
                expect(screen.getByText('common.error')).toBeOnTheScreen()
                expect(
                    screen.getByText('common.unknownError'),
                ).toBeOnTheScreen()
            })
        })

        it('does not show dialog when import was cancelled', async () => {
            mockImportFromCSV.mockResolvedValue({
                success: false,
                cancelled: true,
            })

            const user = userEvent.setup()
            await render(
                <PaperProvider>
                    <MenuDrawerContent {...mockProps} />
                </PaperProvider>,
            )

            await user.press(screen.getByText('menu.importCSV'))

            expect(screen.queryByText('common.error')).not.toBeOnTheScreen()
            expect(screen.queryByText('common.success')).not.toBeOnTheScreen()
        })
    })
})
