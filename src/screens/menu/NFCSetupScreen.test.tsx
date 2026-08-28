import {
    render,
    screen,
    userEvent,
    waitFor,
    act,
} from '@testing-library/react-native'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import NFCSetupScreen from './NFCSetupScreen'
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager'
import { PaperProvider } from 'react-native-paper'

// 1. Mock dependencies
jest.mock('react-native-nfc-manager', () => ({
    __esModule: true,
    NfcTech: { Ndef: 'Ndef' },
    Ndef: {
        uriRecord: jest.fn().mockReturnValue('mock-uri-record'),
        encodeMessage: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    },
    default: {
        isSupported: jest.fn(),
        requestTechnology: jest.fn(),
        cancelTechnologyRequest: jest.fn(),
        ndefHandler: {
            writeNdefMessage: jest.fn(),
        },
    },
}))

jest.mock('../../services/NFCService', () => ({
    initNfcService: jest.fn(),
}))

jest.mock('../../db/database', () => ({
    getTodayEvents: jest.fn().mockReturnValue([]),
    addEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
}))

describe('NFCSetupScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(NfcManager.isSupported).mockResolvedValue(true)
        jest.mocked(NfcManager.requestTechnology).mockResolvedValue(
            NfcTech.Ndef,
        )
        jest.mocked(NfcManager.ndefHandler.writeNdefMessage).mockResolvedValue(
            undefined,
        )
        jest.mocked(NfcManager.cancelTechnologyRequest).mockResolvedValue(
            undefined,
        )
    })

    it('renders and transitions to ready when supported', async () => {
        let resolveSupport: ((val: boolean) => void) | undefined
        const supportPromise = new Promise<boolean>((res) => {
            resolveSupport = res
        })
        jest.mocked(NfcManager.isSupported).mockReturnValueOnce(supportPromise)

        await render(
            <PaperProvider>
                <NFCSetupScreen />
            </PaperProvider>,
        )

        // Resolve support
        await act(() => {
            resolveSupport?.(true)
        })

        // Should transition to supported state
        await waitFor(() => {
            expect(screen.getByText('nfc.write')).toBeVisible()
            expect(screen.getByText('nfc.instruction')).toBeVisible()
        })
    })

    it('renders unsupported error when NFC is not available', async () => {
        jest.mocked(NfcManager.isSupported).mockResolvedValueOnce(false)

        await render(
            <PaperProvider>
                <NFCSetupScreen />
            </PaperProvider>,
        )

        await waitFor(() => {
            expect(screen.getByText('nfc.notSupported')).toBeVisible()
        })
    })

    it('starts writing NFC tag and shows success dialog', async () => {
        await render(
            <PaperProvider>
                <NFCSetupScreen />
            </PaperProvider>,
        )

        // Wait for support check to finish
        await waitFor(() => {
            expect(screen.getByText('nfc.write')).toBeVisible()
        })

        // Press write button
        const user = userEvent.setup()
        await user.press(screen.getByText('nfc.write'))

        // Check if writing states and NFC Manager are called
        expect(NfcManager.requestTechnology).toHaveBeenCalledWith(NfcTech.Ndef)

        await waitFor(() => {
            expect(Ndef.uriRecord).toHaveBeenCalledWith('timetracking://nfc')
            expect(
                NfcManager.ndefHandler.writeNdefMessage,
            ).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), {
                reconnectAfterWrite: true,
            })
        })

        // Check if success dialog is shown
        await waitFor(() => {
            expect(screen.getByText('nfc.writeSuccess')).toBeOnTheScreen()
            expect(screen.getByText('common.success')).toBeOnTheScreen()
        })
    })

    it('cancels NFC scanning successfully', async () => {
        // We need to keep the promise unresolved until cancel is called
        let rejectRequest: ((err: Error) => void) | undefined
        const requestPromise = new Promise<null>((_, rej) => {
            rejectRequest = rej
        })
        jest.mocked(NfcManager.requestTechnology).mockReturnValueOnce(
            requestPromise,
        )
        jest.mocked(NfcManager.cancelTechnologyRequest).mockImplementationOnce(
            () => {
                rejectRequest?.(new Error('cancelled'))
                return Promise.resolve()
            },
        )

        await render(
            <PaperProvider>
                <NFCSetupScreen />
            </PaperProvider>,
        )

        await waitFor(() => {
            expect(screen.getByText('nfc.write')).toBeVisible()
        })

        // Press write button
        const user = userEvent.setup()
        await user.press(screen.getByText('nfc.write'))

        expect(screen.getByText('nfc.reading')).toBeVisible()

        // Press cancel button
        await user.press(screen.getByText('common.cancel'))

        expect(NfcManager.cancelTechnologyRequest).toHaveBeenCalled()

        // State should revert
        await waitFor(() => {
            expect(screen.getByText('nfc.write')).toBeVisible()
        })
    })

    it('shows error dialog on write failure', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        jest.mocked(NfcManager.requestTechnology).mockRejectedValueOnce(
            new Error('NFC Error'),
        )

        await render(
            <PaperProvider>
                <NFCSetupScreen />
            </PaperProvider>,
        )

        await waitFor(() => {
            expect(screen.getByText('nfc.write')).toBeVisible()
        })

        const user = userEvent.setup()
        await user.press(screen.getByText('nfc.write'))

        await waitFor(() => {
            expect(screen.getByText('nfc.writeError')).toBeOnTheScreen()
            expect(screen.getByText('common.error')).toBeOnTheScreen()
        })
    })
})
