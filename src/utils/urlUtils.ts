/**
 * Normalizes a URL for comparison
 * @param url - The URL string to normalize
 * @returns Normalized URL string
 */
export const normalizeURL = (url: string): string => {
    try {
        const parsed = new URL(url);
        // Protocol and hostname are automatically lowercased by the URL constructor
        let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}`;
        
        // Remove trailing slash if present
        if (normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }

        // Add search params back, but sort them to handle different order
        if (parsed.search) {
            const searchParams = new URLSearchParams(parsed.search);
            searchParams.sort();
            normalized += '?' + searchParams.toString();
        }

        return normalized;
    } catch (e) {
        // Fallback for invalid URLs: trim and remove trailing slash
        let fallback = url.trim();
        if (fallback.endsWith('/')) {
            fallback = fallback.slice(0, -1);
        }
        return fallback;
    }
};
