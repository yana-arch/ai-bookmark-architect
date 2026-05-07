/**
 * Formats a number using Vietnamese locale (dots as thousand separators)
 * @param num - The number to format
 * @returns Formatted string
 */
export const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
};
