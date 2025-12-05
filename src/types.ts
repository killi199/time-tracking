export interface Entry {
    id: number;
    startTime: string;
    endTime: string | null;
    date: string;
    note: string | null;
}

export interface TimeEvent {
    id: number;
    date: string;
    time: string;
    note: string | null;
}

export interface Settings {
    theme: 'auto' | 'light' | 'dark';
}
