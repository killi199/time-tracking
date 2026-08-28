/**
 * jest-expo's preset setup installs expo's winter-runtime globals (`fetch`,
 * …) as lazy properties whose first read requires expo modules. In suites
 * that mock 'react-native', that first read only happens after the last test,
 * when jest has already torn the module registry down — producing
 * "Cannot log after tests are done" warnings. Reading the global here
 * resolves it while the runtime is still alive.
 */
import '@testing-library/react-native/matchers'
import { jest } from '@jest/globals'

if (typeof globalThis.fetch !== 'function') {
    throw new Error('expected the jest-expo setup to install a fetch global')
}

// Global i18n mock for standard localization across all screens and services
jest.mock('i18next', () => {
    const i18nMock = {
        t: (key: string) => key,
        changeLanguage: jest.fn().mockImplementation(() => Promise.resolve()),
        use: jest.fn().mockReturnThis(),
        init: jest.fn().mockImplementation(() => Promise.resolve()),
        language: 'en',
    }
    return {
        __esModule: true,
        default: i18nMock,
        ...i18nMock,
    }
})

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            changeLanguage: jest
                .fn()
                .mockImplementation(() => Promise.resolve()),
            language: 'en',
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: jest.fn(),
    },
    Trans: ({ children }: { children: unknown }) => children,
}))
