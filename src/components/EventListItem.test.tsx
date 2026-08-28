import React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, userEvent } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { EventListItem } from './EventListItem'
import { TimeEvent } from '../types'
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'

const mockClose = jest.fn()

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
    const RN = jest.requireActual<typeof import('react-native')>('react-native')
    const ReactActual = jest.requireActual<typeof import('react')>('react')
    const MockSwipeable = ReactActual.forwardRef(
        (
            props: {
                testID?: string
                children?: React.ReactNode
                renderLeftActions?: () => React.ReactNode
                renderRightActions?: () => React.ReactNode
                onSwipeableOpen?: (direction: string) => void
            },
            ref: React.Ref<SwipeableMethods>,
        ) => {
            ReactActual.useImperativeHandle(ref, () => ({
                close: mockClose,
                openLeft: jest.fn(),
                openRight: jest.fn(),
                reset: jest.fn(),
            }))
            return (
                <RN.View testID={props.testID}>
                    {props.renderLeftActions ? props.renderLeftActions() : null}
                    {props.children}
                    {props.renderRightActions
                        ? props.renderRightActions()
                        : null}
                    <RN.TouchableOpacity
                        testID="swipe-right-btn"
                        onPress={() => props.onSwipeableOpen?.('right')}
                    >
                        <RN.Text>Swipe Right</RN.Text>
                    </RN.TouchableOpacity>
                    <RN.TouchableOpacity
                        testID="swipe-left-btn"
                        onPress={() => props.onSwipeableOpen?.('left')}
                    >
                        <RN.Text>Swipe Left</RN.Text>
                    </RN.TouchableOpacity>
                </RN.View>
            )
        },
    )
    return {
        __esModule: true,
        default: MockSwipeable,
        SwipeDirection: { LEFT: 'left', RIGHT: 'right' },
    }
})

describe('EventListItem', () => {
    const baseItem: TimeEvent = {
        id: 42,
        date: '2023-10-15',
        time: '08:30',
        note: 'Morning check-in',
        isManualEntry: false,
    }

    const mockOnEdit = jest.fn<(event: TimeEvent, close?: () => void) => void>()
    const mockOnDelete =
        jest.fn<(event: TimeEvent, close?: () => void) => void>()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders start type event correctly without manual entry flag', async () => {
        await render(
            <PaperProvider>
                <EventListItem
                    item={baseItem}
                    type="start"
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            </PaperProvider>,
        )

        expect(screen.getByText('home.checkIn home.at 08:30')).toBeVisible()
        expect(screen.getByText('Morning check-in')).toBeVisible()
        expect(screen.getByTestId('event-item-42')).toBeVisible()
    })

    it('renders end type event with late entry label when isManualEntry is true', async () => {
        const manualItem: TimeEvent = {
            ...baseItem,
            id: 99,
            time: '17:00',
            note: 'Evening check-out',
            isManualEntry: true,
        }

        await render(
            <PaperProvider>
                <EventListItem
                    item={manualItem}
                    type="end"
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            </PaperProvider>,
        )

        expect(
            screen.getByText('home.checkOut home.at 17:00 home.lateEntry'),
        ).toBeVisible()
        expect(screen.getByText('Evening check-out')).toBeVisible()
    })

    it('triggers onEdit when swiped right and allows closing the swipeable', async () => {
        const user = userEvent.setup()
        let capturedClose: (() => void) | undefined

        mockOnEdit.mockImplementation(
            (_item: TimeEvent, close?: () => void) => {
                capturedClose = close
            },
        )

        await render(
            <PaperProvider>
                <EventListItem
                    item={baseItem}
                    type="start"
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            </PaperProvider>,
        )

        await user.press(screen.getByTestId('swipe-right-btn'))
        expect(mockOnEdit).toHaveBeenCalledWith(baseItem, expect.any(Function))

        capturedClose?.()
        expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('triggers onDelete when swiped left and allows closing the swipeable', async () => {
        const user = userEvent.setup()
        let capturedClose: (() => void) | undefined

        mockOnDelete.mockImplementation(
            (_item: TimeEvent, close?: () => void) => {
                capturedClose = close
            },
        )

        await render(
            <PaperProvider>
                <EventListItem
                    item={baseItem}
                    type="end"
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                />
            </PaperProvider>,
        )

        await user.press(screen.getByTestId('swipe-left-btn'))
        expect(mockOnDelete).toHaveBeenCalledWith(
            baseItem,
            expect.any(Function),
        )

        capturedClose?.()
        expect(mockClose).toHaveBeenCalledTimes(1)
    })
})
