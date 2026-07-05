import { useState } from 'react'
import { Platform, View } from 'react-native'
import { Portal, Dialog, Button } from 'react-native-paper'
import DateTimePicker from '@expo/ui/community/datetime-picker'
import { shiftToUTC, shiftToLocal } from '../utils/dateShift'

export interface AdaptiveDateTimePickerProps {
    visible: boolean
    onDismiss: () => void
    onConfirm: (date: Date) => void
    value: Date
    mode: 'date' | 'time'
    locale?: string
    cancelLabel: string
    confirmLabel: string
}

const AdaptiveDateTimePicker = ({
    visible,
    onDismiss,
    onConfirm,
    value,
    mode,
    locale,
    cancelLabel,
    confirmLabel,
}: AdaptiveDateTimePickerProps) => {
    const [tempDate, setTempDate] = useState(value)
    const [prevVisible, setPrevVisible] = useState(visible)

    if (visible !== prevVisible) {
        setPrevVisible(visible)
        if (visible) {
            setTempDate(value)
        }
    }

    if (!visible) return <></>

    if (Platform.OS === 'ios') {
        return (
            <Portal>
                <Dialog visible={visible} onDismiss={onDismiss}>
                    <Dialog.Content>
                        <View style={{ alignItems: 'center' }}>
                            <DateTimePicker
                                value={tempDate}
                                mode={mode}
                                display="spinner"
                                locale={locale}
                                onValueChange={(_, selectedDate) => {
                                    setTempDate(selectedDate)
                                }}
                            />
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={onDismiss}>{cancelLabel}</Button>
                        <Button
                            onPress={() => {
                                onConfirm(tempDate)
                            }}
                        >
                            {confirmLabel}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        )
    }

    const androidValue = mode === 'date' ? shiftToUTC(value) : value

    return (
        <DateTimePicker
            value={androidValue}
            mode={mode}
            presentation="dialog"
            onValueChange={(_, selectedDate) => {
                onConfirm(
                    mode === 'date' ? shiftToLocal(selectedDate) : selectedDate,
                )
            }}
            onDismiss={onDismiss}
        />
    )
}

export default AdaptiveDateTimePicker
