/**
 * Reinterprets the local wall-clock fields of a date as UTC fields.
 * Used to hand a date to pickers that operate on UTC values.
 *
 * @param date - The date whose local fields should be kept.
 * @returns A new Date whose UTC fields equal the input's local fields.
 */
export const shiftToUTC = (date: Date) => {
    return new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
        ),
    )
}

/**
 * Inverse of {@link shiftToUTC}: reinterprets the UTC fields of a date as
 * local wall-clock fields.
 *
 * @param date - The date whose UTC fields should be kept.
 * @returns A new Date whose local fields equal the input's UTC fields.
 */
export const shiftToLocal = (date: Date) => {
    return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
    )
}
