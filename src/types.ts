export interface Entry {
    id: number
    startTime: string
    endTime: string | null
    date: string
    note: string | null
}

export interface TimeEvent {
    id: number
    date: string
    time: string
    note: string | null
    isManualEntry?: boolean
}

export interface SeparatorData {
    isSimpleDivider: boolean
    label: string
    isWork: boolean
}

export interface ProcessedTimeEvent extends TimeEvent {
    type?: 'start' | 'end'
    showDateHeader?: boolean
    separatorData?: SeparatorData
}

export interface Settings {
    theme: 'auto' | 'light' | 'dark'
}
