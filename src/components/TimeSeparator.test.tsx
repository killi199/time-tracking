import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { TimeSeparator } from './TimeSeparator'
import { TimeEvent, ProcessedTimeEvent } from '../types'

describe('TimeSeparator', () => {
    const baseItem: TimeEvent = {
        id: 1,
        date: '2023-10-15',
        time: '08:00',
        note: null,
        isManualEntry: false,
    }

    it('renders nothing when separatorData is missing', async () => {
        await render(
            <PaperProvider>
                <TimeSeparator leadingItem={baseItem} />
            </PaperProvider>,
        )

        expect(screen.queryByText(/home\.(work|pause)/)).not.toBeOnTheScreen()
    })

    it('renders nothing when isSimpleDivider is true', async () => {
        const processedItem: ProcessedTimeEvent = {
            ...baseItem,
            type: 'start',
            separatorData: {
                isSimpleDivider: true,
                label: '00:30',
                isWork: false,
            },
        }

        await render(
            <PaperProvider>
                <TimeSeparator leadingItem={processedItem} />
            </PaperProvider>,
        )

        expect(screen.queryByText(/home\.(work|pause)/)).not.toBeOnTheScreen()
    })

    it('renders work label when isSimpleDivider is false and isWork is true', async () => {
        const processedItem: ProcessedTimeEvent = {
            ...baseItem,
            type: 'start',
            separatorData: {
                isSimpleDivider: false,
                label: '02:15',
                isWork: true,
            },
        }

        await render(
            <PaperProvider>
                <TimeSeparator leadingItem={processedItem} />
            </PaperProvider>,
        )

        expect(screen.getByText('home.work: 02:15')).toBeVisible()
    })

    it('renders pause label when isSimpleDivider is false and isWork is false', async () => {
        const processedItem: ProcessedTimeEvent = {
            ...baseItem,
            type: 'end',
            separatorData: {
                isSimpleDivider: false,
                label: '00:45',
                isWork: false,
            },
        }

        await render(
            <PaperProvider>
                <TimeSeparator leadingItem={processedItem} />
            </PaperProvider>,
        )

        expect(screen.getByText('home.pause: 00:45')).toBeVisible()
    })
})
