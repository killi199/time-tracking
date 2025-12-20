/**
 * Formats a duration in minutes into a string format (HH:MM).
 *
 * @param totalMinutes - The total number of minutes to format. Can be negative.
 * @param showSign - Whether to explicitly show a '+' or '-' sign. Defaults to false.
 * @returns A string representing the formatted time (e.g., "01:30", "-01:30", "+01:30").
 */
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
