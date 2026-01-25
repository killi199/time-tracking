import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme, Text, Button, Portal, Dialog } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager'

export default function NFCSetupScreen() {
    const theme = useTheme()
    const { t } = useTranslation()
    const [supported, setSupported] = useState<boolean | null>(null)
    const [writing, setWriting] = useState(false)

    // Dialog state
    const [dialogVisible, setDialogVisible] = useState(false)
    const [dialogTitle, setDialogTitle] = useState('')
    const [dialogMessage, setDialogMessage] = useState('')

    const cancelRef = useRef(false)

    useEffect(() => {
        async function checkNfc() {
            const isSupported = await NfcManager.isSupported()
            setSupported(isSupported)
        }
        checkNfc()

        return () => {
            NfcManager.cancelTechnologyRequest().catch(() => 0)
            setWriting(false)
        }
    }, [])

    const showDialog = (title: string, message: string) => {
        setDialogTitle(title)
        setDialogMessage(message)
        setDialogVisible(true)
    }

    const hideDialog = () => setDialogVisible(false)

    const writeTag = async () => {
        if (!supported) {
            showDialog(t('common.error'), t('nfc.notSupported'))
            return
        }

        try {
            setWriting(true)
            cancelRef.current = false
            await NfcManager.requestTechnology(NfcTech.Ndef)

            const bytes = Ndef.encodeMessage([
                Ndef.uriRecord('timetracking://nfc'),
            ])

            if (bytes) {
                // Pass options object to prevent native crash on 'reconnectAfterWrite' lookup
                await (NfcManager as any).writeNdefMessage(bytes, {
                    reconnectAfterWrite: true,
                })
                showDialog(t('common.success'), t('nfc.writeSuccess'))
            }
        } catch (ex: any) {
            // Don't show error if user cancelled
            if (!cancelRef.current) {
                console.warn(ex)
                showDialog(t('common.error'), t('nfc.writeError'))
            }
        } finally {
            // Ensure we clean up
            NfcManager.cancelTechnologyRequest().catch(() => 0)
            setWriting(false)
        }
    }

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <Text variant="titleLarge" style={styles.title}>
                {t('nfc.title')}
            </Text>

            {supported === false ? (
                <Text style={{ color: theme.colors.error }}>
                    {t('nfc.notSupported')}
                </Text>
            ) : (
                <>
                    <Text variant="bodyMedium" style={styles.instruction}>
                        {t('nfc.instruction')}
                    </Text>

                    <View style={styles.buttonContainer}>
                        <Button
                            mode="contained"
                            onPress={writeTag}
                            loading={writing}
                            disabled={writing}
                        >
                            {writing ? t('nfc.reading') : t('nfc.write')}
                        </Button>

                        <Button
                            onPress={() => {
                                cancelRef.current = true
                                NfcManager.cancelTechnologyRequest().catch(
                                    () => 0,
                                )
                                setWriting(false)
                            }}
                            style={{ marginTop: 10, opacity: writing ? 1 : 0 }}
                            disabled={!writing}
                        >
                            {t('common.cancel')}
                        </Button>
                    </View>
                </>
            )}

            <Portal>
                <Dialog visible={dialogVisible} onDismiss={hideDialog}>
                    <Dialog.Title>{dialogTitle}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">{dialogMessage}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog}>
                            {t('common.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        marginBottom: 20,
        fontWeight: 'bold',
    },
    instruction: {
        textAlign: 'center',
        marginBottom: 30,
    },
    buttonContainer: {
        alignItems: 'center',
    },
    writingContainer: {
        alignItems: 'center',
    },
})
