import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { PaperProvider } from 'react-native-paper'

// Mock the licenses.json
jest.mock('../../licenses.json', () => ({
    'test-lib@1.0.0': {
        licenses: 'MIT',
        repository: 'https://github.com/test/lib',
        publisher: 'Test Publisher',
    },
    'another-lib@2.0.0': {
        licenses: { type: 'Apache-2.0' },
        repository: 'https://github.com/another/lib',
    },
    'no-repo-lib@3.0.0': {
        licenses: 'ISC',
    },
}))

import LicensesScreen from './LicensesScreen'

describe('LicensesScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders correctly with mocked data', async () => {
        await render(
            <PaperProvider>
                <LicensesScreen />
            </PaperProvider>,
        )

        // test-lib
        expect(screen.getByText('test-lib@1.0.0')).toBeVisible()
        expect(screen.getByText('MIT')).toBeVisible()
        expect(screen.getByText('Test Publisher')).toBeVisible()
        expect(screen.getByText('https://github.com/test/lib')).toBeVisible()

        // another-lib (licenses as object)
        expect(screen.getByText('another-lib@2.0.0')).toBeVisible()
        expect(screen.getByText('{"type":"Apache-2.0"}')).toBeVisible()
        expect(screen.getByText('https://github.com/another/lib')).toBeVisible()

        // no-repo-lib
        expect(screen.getByText('no-repo-lib@3.0.0')).toBeVisible()
        expect(screen.getByText('ISC')).toBeVisible()
    })

    it('opens repository link when pressed', async () => {
        const openURLSpy = jest
            .spyOn(Linking, 'openURL')
            .mockResolvedValue(true)

        await render(
            <PaperProvider>
                <LicensesScreen />
            </PaperProvider>,
        )

        const user = userEvent.setup()
        const link = screen.getByText('https://github.com/test/lib')
        await user.press(link)

        expect(openURLSpy).toHaveBeenCalledWith('https://github.com/test/lib')

        openURLSpy.mockRestore()
    })
})
