export const GeofencingEventType = {
    Enter: 1,
    Exit: 2,
}

export const PermissionStatus = {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
}

const permissionResponse = () =>
    Promise.resolve({
        status: PermissionStatus.DENIED,
    })

export const getForegroundPermissionsAsync = permissionResponse
export const requestForegroundPermissionsAsync = permissionResponse
export const getBackgroundPermissionsAsync = permissionResponse
export const requestBackgroundPermissionsAsync = permissionResponse
export const getLastKnownPositionAsync = () => Promise.resolve(null)
export const getCurrentPositionAsync = () => Promise.reject(new Error('Not implemented'))
export const startGeofencingAsync = () => Promise.reject(new Error('Not implemented'))
export const stopGeofencingAsync = () => Promise.resolve()
