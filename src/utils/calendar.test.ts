import React from 'react'
import {
    describe,
    it,
    expect,
    jest,
    afterEach,
    beforeEach,
} from '@jest/globals'
import { render, screen, act } from '@testing-library/react-native'
import { View, Text } from 'react-native'
import {
    getActiveCalendarSystem,
    getSavedCalendarSystem,
    getSavedFirstDayOfWeek,
    getSavedMonthStartDay,
    useActiveCalendarSystem,
    useSavedCalendarSystem,
    useSavedFirstDayOfWeek,
    useSavedMonthStartDay,
    resolveCalendarSystem,
    resolveFirstDayOfWeek,
    getWeekRange,
    getMonthRange,
    stepMonth,
    formatHeaderDate,
} from './calendar'
import { getSetting } from '../db/database'
import * as Localization from 'expo-localization'

const mockSettingsListeners = new Set<() => void>()
const notifySettingsListeners = () => {
    mockSettingsListeners.forEach((l) => {
        l()
    })
}

jest.mock('../db/database', () => ({
    getSetting: jest.fn(),
    subscribeSettings: jest.fn((listener: () => void) => {
        mockSettingsListeners.add(listener)
        return () => {
            mockSettingsListeners.delete(listener)
        }
    }),
}))

let mockCalendarType: string = 'gregorian'
let mockLanguageCode: string = 'en'
let mockRegionCode: string = 'US'

jest.mock('expo-localization', () => ({
    getCalendars: jest.fn(() => [{ calendar: mockCalendarType }]),
    getLocales: jest.fn(() => [
        { languageCode: mockLanguageCode, regionCode: mockRegionCode },
    ]),
}))

describe('calendar utility', () => {
    beforeEach(() => {
        mockSettingsListeners.clear()
        mockCalendarType = 'gregorian'
        mockLanguageCode = 'en'
        mockRegionCode = 'US'
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getActiveCalendarSystem and resolveCalendarSystem', () => {
        it('returns gregorian by default if setting is not set and system is gregorian', () => {
            jest.mocked(getSetting).mockReturnValue(null)
            expect(getActiveCalendarSystem()).toBe('gregorian')
        })

        it('returns jalali when setting is jalali', () => {
            jest.mocked(getSetting).mockReturnValue('jalali')
            expect(getActiveCalendarSystem()).toBe('jalali')
        })

        it('returns gregorian when setting is gregorian', () => {
            jest.mocked(getSetting).mockReturnValue('gregorian')
            expect(getActiveCalendarSystem()).toBe('gregorian')
        })

        it('resolves to jalali when setting is auto and system calendar is persian', () => {
            jest.mocked(getSetting).mockReturnValue('auto')
            mockCalendarType = 'persian'
            expect(getActiveCalendarSystem()).toBe('jalali')
        })

        it('resolves to jalali when setting is auto and system language is fa', () => {
            jest.mocked(getSetting).mockReturnValue('auto')
            mockLanguageCode = 'fa'
            expect(getActiveCalendarSystem()).toBe('jalali')
        })

        it('resolves to jalali when setting is auto and system region is IR', () => {
            jest.mocked(getSetting).mockReturnValue(null)
            mockRegionCode = 'IR'
            expect(getActiveCalendarSystem()).toBe('jalali')
        })

        it('falls back to gregorian if Localization throws an error', () => {
            jest.mocked(Localization.getCalendars).mockImplementationOnce(
                () => {
                    throw new Error('Localization unavailable')
                },
            )
            expect(resolveCalendarSystem('auto')).toBe('gregorian')
        })

        it('safely handles empty arrays from getCalendars and checks locales', () => {
            const emptyCalendars = [] as unknown as ReturnType<
                typeof Localization.getCalendars
            >
            const emptyLocales = [] as unknown as ReturnType<
                typeof Localization.getLocales
            >

            jest.mocked(Localization.getCalendars).mockReturnValueOnce(
                emptyCalendars,
            )
            mockLanguageCode = 'fa'
            expect(resolveCalendarSystem('auto')).toBe('jalali')

            jest.mocked(Localization.getCalendars).mockReturnValueOnce(
                emptyCalendars,
            )
            mockLanguageCode = 'en'
            mockRegionCode = 'IR'
            expect(resolveCalendarSystem('auto')).toBe('jalali')

            jest.mocked(Localization.getCalendars).mockReturnValueOnce(
                emptyCalendars,
            )
            mockLanguageCode = 'en'
            mockRegionCode = 'US'
            expect(resolveCalendarSystem('auto')).toBe('gregorian')

            jest.mocked(Localization.getCalendars).mockReturnValueOnce(
                emptyCalendars,
            )
            jest.mocked(Localization.getLocales).mockReturnValueOnce(
                emptyLocales,
            )
            expect(resolveCalendarSystem('auto')).toBe('gregorian')
        })
    })

    describe('getSavedCalendarSystem', () => {
        it('returns auto by default if not set', () => {
            jest.mocked(getSetting).mockReturnValue(null)
            expect(getSavedCalendarSystem()).toBe('auto')
        })

        it('returns valid values when stored', () => {
            jest.mocked(getSetting).mockReturnValue('jalali')
            expect(getSavedCalendarSystem()).toBe('jalali')

            jest.mocked(getSetting).mockReturnValue('gregorian')
            expect(getSavedCalendarSystem()).toBe('gregorian')

            jest.mocked(getSetting).mockReturnValue('auto')
            expect(getSavedCalendarSystem()).toBe('auto')
        })

        it('returns auto for invalid stored string', () => {
            jest.mocked(getSetting).mockReturnValue('invalid_val')
            expect(getSavedCalendarSystem()).toBe('auto')
        })
    })

    describe('getSavedFirstDayOfWeek', () => {
        it('returns auto by default if not set', () => {
            jest.mocked(getSetting).mockReturnValue(null)
            expect(getSavedFirstDayOfWeek()).toBe('auto')
        })

        it('returns valid values when stored', () => {
            jest.mocked(getSetting).mockReturnValue('saturday')
            expect(getSavedFirstDayOfWeek()).toBe('saturday')

            jest.mocked(getSetting).mockReturnValue('sunday')
            expect(getSavedFirstDayOfWeek()).toBe('sunday')

            jest.mocked(getSetting).mockReturnValue('monday')
            expect(getSavedFirstDayOfWeek()).toBe('monday')

            jest.mocked(getSetting).mockReturnValue('auto')
            expect(getSavedFirstDayOfWeek()).toBe('auto')
        })

        it('returns auto for invalid stored string', () => {
            jest.mocked(getSetting).mockReturnValue('invalid_val')
            expect(getSavedFirstDayOfWeek()).toBe('auto')
        })
    })

    describe('resolveFirstDayOfWeek', () => {
        it('resolves explicit days regardless of calendar', () => {
            expect(resolveFirstDayOfWeek('saturday', 'gregorian')).toBe(6)
            expect(resolveFirstDayOfWeek('saturday', 'jalali')).toBe(6)
            expect(resolveFirstDayOfWeek('sunday', 'gregorian')).toBe(0)
            expect(resolveFirstDayOfWeek('sunday', 'jalali')).toBe(0)
            expect(resolveFirstDayOfWeek('monday', 'gregorian')).toBe(1)
            expect(resolveFirstDayOfWeek('monday', 'jalali')).toBe(1)
        })

        it('resolves auto based on calendar system', () => {
            expect(resolveFirstDayOfWeek('auto', 'jalali')).toBe(6) // Saturday
            expect(resolveFirstDayOfWeek('auto', 'gregorian')).toBe(1) // Monday
        })
    })

    describe('getWeekRange', () => {
        it('calculates week range with Monday as start', () => {
            // 2026-11-11 is a Wednesday
            const range = getWeekRange('2026-11-11', 'monday', 'gregorian')
            expect(range.start).toBe('2026-11-09') // Monday
            expect(range.end).toBe('2026-11-15') // Sunday
        })

        it('calculates week range with Saturday as start', () => {
            // 2026-11-11 is a Wednesday
            const range = getWeekRange('2026-11-11', 'saturday', 'gregorian')
            expect(range.start).toBe('2026-11-07') // Saturday
            expect(range.end).toBe('2026-11-13') // Friday
        })

        it('calculates week range with Sunday as start', () => {
            const range = getWeekRange('2026-11-11', 'sunday', 'gregorian')
            expect(range.start).toBe('2026-11-08') // Sunday
            expect(range.end).toBe('2026-11-14') // Saturday
        })

        it('uses defaults when parameters are omitted', () => {
            const range = getWeekRange('2026-11-11')
            // auto + gregorian => Monday start
            expect(range.start).toBe('2026-11-09')
            expect(range.end).toBe('2026-11-15')
        })
    })

    describe('getMonthRange', () => {
        it('returns Gregorian month range for gregorian calendar', () => {
            const range = getMonthRange('2026-11-15', 'gregorian')
            expect(range.start).toBe('2026-11-01')
            expect(range.end).toBe('2026-11-30')
            expect(range.monthIdentifier).toBe('2026-11')
        })

        it('returns Jalali month range for jalali calendar', () => {
            // 2026-11-11 is 1405-08-20 (Aban 1405: 1405-08-01 to 1405-08-30)
            const range = getMonthRange('2026-11-11', 'jalali')
            expect(range.start).toBe('2026-10-23')
            expect(range.end).toBe('2026-11-21')
            expect(range.monthIdentifier).toBe('1405-08')
        })
    })

    describe('stepMonth', () => {
        it('steps Gregorian months forward and backward', () => {
            expect(stepMonth('2026-11-15', 1, 'gregorian')).toBe('2026-12-01')
            expect(stepMonth('2026-11-15', -1, 'gregorian')).toBe('2026-10-01')
            expect(stepMonth('2026-12-15', 1, 'gregorian')).toBe('2027-01-01')
        })

        it('steps Jalali months forward and backward across years', () => {
            // 2026-11-11 is Aban 1405 (month 8)
            // Next month is Azar 1405 (month 9) -> 1405-09-01 is 2026-11-22
            expect(stepMonth('2026-11-11', 1, 'jalali')).toBe('2026-11-22')

            // Step across year boundary (+6 months from month 8 -> month 14 -> month 2 of next year 1406)
            const steppedForward = stepMonth('2026-11-11', 6, 'jalali')
            expect(steppedForward).toBe('2027-04-21') // 1406-02-01

            // Step backward across year boundary (-10 months from month 8 -> Dey of previous year 1404)
            const steppedBackward = stepMonth('2026-11-11', -10, 'jalali')
            expect(steppedBackward).toBe('2025-12-22') // 1404-10-01
        })
    })

    describe('formatHeaderDate', () => {
        it('returns empty string if dateStr is empty', () => {
            expect(formatHeaderDate('', 'day', 'gregorian', 'en-US')).toBe('')
        })

        it('formats day view for gregorian and jalali', () => {
            const dateStr = '2026-11-11'
            const gDay = formatHeaderDate(dateStr, 'day', 'gregorian', 'en-US')
            expect(gDay).toContain('2026')

            const jDayEn = formatHeaderDate(dateStr, 'day', 'jalali', 'en-US')
            expect(jDayEn).toContain('Wed')
            expect(jDayEn).toContain('Aban 1405')

            const jDayDe = formatHeaderDate(dateStr, 'day', 'jalali', 'de-DE')
            expect(jDayDe).toContain('Mi')
            expect(jDayDe).toContain('Aban 1405')

            const jDayEs = formatHeaderDate(dateStr, 'day', 'jalali', 'es-ES')
            expect(jDayEs).toContain('mié')
            expect(jDayEs).toContain('Aban 1405')
        })

        it('formats week view for gregorian and jalali (same and multi-month)', () => {
            const dateStr = '2026-11-11'
            const gWeek = formatHeaderDate(
                dateStr,
                'week',
                'gregorian',
                'en-US',
            )
            expect(gWeek).toContain('Nov')

            // Jalali month week in EN and DE
            const jWeekEn = formatHeaderDate(
                dateStr,
                'week',
                'jalali',
                'en',
                'saturday',
            )
            expect(jWeekEn).toContain('Aban 1405')

            const jWeekDe = formatHeaderDate(
                dateStr,
                'week',
                'jalali',
                'de',
                'saturday',
            )
            expect(jWeekDe).toContain('Aban 1405')

            // Multi-month Jalali week (around 2026-10-23, transitioning Mehr to Aban)
            const jWeekMulti = formatHeaderDate(
                '2026-10-23',
                'week',
                'jalali',
                'en',
                'monday',
            )
            expect(jWeekMulti).toContain('1405')
        })

        it('formats month view for gregorian and jalali in en and de', () => {
            const dateStr = '2026-11-11'
            const gMonth = formatHeaderDate(
                dateStr,
                'month',
                'gregorian',
                'en-US',
            )
            expect(gMonth).toContain('November 2026')

            const jMonthEn = formatHeaderDate(dateStr, 'month', 'jalali', 'en')
            expect(jMonthEn).toBe('Aban 1405')

            const jMonthDe = formatHeaderDate(dateStr, 'month', 'jalali', 'de')
            expect(jMonthDe).toBe('Aban 1405')

            const customGMonth = formatHeaderDate(
                '2026-11-25',
                'month',
                'gregorian',
                'en-US',
                'auto',
                15,
            )
            expect(customGMonth).toContain('Nov 15')
            expect(customGMonth).toContain('Dec 14')

            const customJMonth = formatHeaderDate(
                '2026-11-25',
                'month',
                'jalali',
                'en',
                'auto',
                15,
            )
            expect(customJMonth).toBe('15 Aban - 14 Azar 1405')
        })
    })

    describe('getSavedMonthStartDay & custom month range/step', () => {
        it('parses valid month_start_day (1-28) and defaults to 1 otherwise', () => {
            jest.mocked(getSetting).mockReturnValue(null)
            expect(getSavedMonthStartDay()).toBe(1)

            jest.mocked(getSetting).mockReturnValue('15')
            expect(getSavedMonthStartDay()).toBe(15)

            jest.mocked(getSetting).mockReturnValue('28')
            expect(getSavedMonthStartDay()).toBe(28)

            jest.mocked(getSetting).mockReturnValue('0')
            expect(getSavedMonthStartDay()).toBe(1)

            jest.mocked(getSetting).mockReturnValue('29')
            expect(getSavedMonthStartDay()).toBe(1)

            jest.mocked(getSetting).mockReturnValue('15abc')
            expect(getSavedMonthStartDay()).toBe(1)
        })

        it('computes custom Gregorian month range and steps correctly', () => {
            // On or after start day 15
            expect(getMonthRange('2026-11-25', 'gregorian', 15)).toEqual({
                start: '2026-11-15',
                end: '2026-12-14',
                monthIdentifier: '2026-11-15',
            })

            // Before start day 15 (crosses year boundary)
            expect(getMonthRange('2026-01-10', 'gregorian', 15)).toEqual({
                start: '2025-12-15',
                end: '2026-01-14',
                monthIdentifier: '2025-12-15',
            })

            // Day 28 in February
            expect(getMonthRange('2026-03-05', 'gregorian', 28)).toEqual({
                start: '2026-02-28',
                end: '2026-03-27',
                monthIdentifier: '2026-02-28',
            })

            // Invalid monthStartDay falls back to 1
            expect(getMonthRange('2026-11-25', 'gregorian', 31)).toEqual({
                start: '2026-11-01',
                end: '2026-11-30',
                monthIdentifier: '2026-11',
            })

            // stepMonth forward & backward
            expect(stepMonth('2026-11-25', 1, 'gregorian', 15)).toBe(
                '2026-12-15',
            )
            expect(stepMonth('2026-01-10', -1, 'gregorian', 15)).toBe(
                '2025-11-15',
            )
        })

        it('computes custom Jalali month range and steps correctly', () => {
            // 2026-11-25 is 1405-09-04 (< 15), so range is 1405-08-15 to 1405-09-14
            // 1405-08-15 is 2026-11-06, 1405-09-14 is 2026-12-05
            expect(getMonthRange('2026-11-25', 'jalali', 15)).toEqual({
                start: '2026-11-06',
                end: '2026-12-05',
                monthIdentifier: '2026-11-06',
            })

            expect(stepMonth('2026-11-25', 1, 'jalali', 15)).toBe('2026-12-06')
            expect(stepMonth('2026-11-25', -1, 'jalali', 15)).toBe('2026-10-07')
        })
    })

    describe('calendar hooks', () => {
        function TestHookComponent() {
            const active = useActiveCalendarSystem()
            const saved = useSavedCalendarSystem()
            const firstDay = useSavedFirstDayOfWeek()
            const monthStartDay = useSavedMonthStartDay()
            return React.createElement(
                View,
                null,
                React.createElement(
                    Text,
                    { testID: 'active-calendar' },
                    active,
                ),
                React.createElement(Text, { testID: 'saved-calendar' }, saved),
                React.createElement(Text, { testID: 'first-day' }, firstDay),
                React.createElement(
                    Text,
                    { testID: 'month-start-day' },
                    String(monthStartDay),
                ),
            )
        }

        it('reactively updates hooks when SQLite settings change', async () => {
            let calendarSetting: string | null = null
            let firstDaySetting: string | null = null
            let monthStartSetting: string | null = null

            jest.mocked(getSetting).mockImplementation((key) => {
                if (key === 'calendar_system') return calendarSetting
                if (key === 'first_day_of_week') return firstDaySetting
                if (key === 'month_start_day') return monthStartSetting
                return null
            })

            await render(React.createElement(TestHookComponent))

            // Initial defaults
            expect(screen.getByTestId('active-calendar')).toHaveTextContent(
                'gregorian',
            )
            expect(screen.getByTestId('saved-calendar')).toHaveTextContent(
                'auto',
            )
            expect(screen.getByTestId('first-day')).toHaveTextContent('auto')

            // Update calendar setting to jalali
            calendarSetting = 'jalali'
            await act(() => {
                notifySettingsListeners()
            })

            expect(screen.getByTestId('active-calendar')).toHaveTextContent(
                'jalali',
            )
            expect(screen.getByTestId('saved-calendar')).toHaveTextContent(
                'jalali',
            )

            // Update first day of week setting to saturday
            firstDaySetting = 'saturday'
            await act(() => {
                notifySettingsListeners()
            })

            expect(screen.getByTestId('first-day')).toHaveTextContent(
                'saturday',
            )

            // Update first day to sunday
            firstDaySetting = 'sunday'
            await act(() => {
                notifySettingsListeners()
            })

            expect(screen.getByTestId('first-day')).toHaveTextContent('sunday')

            // Switch back to gregorian
            calendarSetting = 'gregorian'
            await act(() => {
                notifySettingsListeners()
            })

            expect(screen.getByTestId('active-calendar')).toHaveTextContent(
                'gregorian',
            )
            expect(screen.getByTestId('saved-calendar')).toHaveTextContent(
                'gregorian',
            )

            // Update month start day setting to 15
            monthStartSetting = '15'
            await act(() => {
                notifySettingsListeners()
            })

            expect(screen.getByTestId('month-start-day')).toHaveTextContent(
                '15',
            )
        })
    })
})
