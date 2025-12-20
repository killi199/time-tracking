export const formatTime = (totalMinutes: number, showSign = false) => {
    const isNegative = totalMinutes < 0;
    const absMinutes = Math.abs(totalMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = Math.floor(absMinutes % 60);
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    if (showSign) {
        return isNegative ? `-${timeString}` : `+${timeString}`;
    }
    return timeString;
};
