import type { Bookmark } from '@/types';

/**
 * Formats a number using Vietnamese locale (dots as thousand separators)
 * @param num - The number to format
 * @returns Formatted string
 */
export const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
};

/**
 * Parses CSV content into bookmarks
 * @param csvContent - The CSV string content
 * @returns Array of bookmarks
 */
export const parseCSVBookmarks = (csvContent: string): Bookmark[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return []; // Need at least header and one data row

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIndex = headers.indexOf('name');
    const titleIndex = headers.indexOf('title');
    const urlIndex = headers.indexOf('url');
    const categoryIndex = headers.indexOf('category');
    const tagsIndex = headers.indexOf('tags');

    if ((nameIndex === -1 && titleIndex === -1) || urlIndex === -1) {
        throw new Error('CSV must contain title/name and url columns');
    }

    return lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const title = (values[nameIndex] || values[titleIndex] || 'No Title').trim();
        const url = values[urlIndex]?.trim() || '';
        const category = categoryIndex !== -1 ? values[categoryIndex]?.trim() : '';
        const tagsStr = tagsIndex !== -1 ? values[tagsIndex]?.trim() : '';

        // Combine category and tags
        const tags = [];
        if (category) tags.push(category);
        if (tagsStr) {
            tagsStr.split(';').forEach(tag => {
                const trimmed = tag.trim();
                if (trimmed && !tags.includes(trimmed)) tags.push(trimmed);
            });
        }

        return {
            id: `csv-${Date.now()}-${index}`,
            title,
            url,
            parentId: null,
            tags: tags.length > 0 ? tags : undefined
        };
    }).filter(bm => bm.url); // Filter out bookmarks without URLs
};

/**
 * Parses a single CSV line, handling quoted values
 * @param line - The CSV line
 * @returns Array of values
 */
const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};

/**
 * Exports bookmarks to CSV format
 * @param bookmarks - Array of bookmarks to export
 * @returns CSV string
 */
export const exportBookmarksToCSV = (bookmarks: Bookmark[]): string => {
    const headers = ['name', 'url', 'category', 'tags', 'date added'];
    const csvLines = [headers.join(',')];

    bookmarks.forEach(bm => {
        const category = bm.tags && bm.tags.length > 0 ? bm.tags[0] : '';
        const tags = bm.tags && bm.tags.length > 1 ? bm.tags.slice(1).join(';') : '';
        const dateAdded = new Date().toISOString();

        const line = [
            `"${bm.title.replace(/"/g, '""')}"`,
            `"${bm.url.replace(/"/g, '""')}"`,
            `"${category.replace(/"/g, '""')}"`,
            `"${tags.replace(/"/g, '""')}"`,
            `"${dateAdded}"`
        ];
        csvLines.push(line.join(','));
    });

    return csvLines.join('\n');
};
