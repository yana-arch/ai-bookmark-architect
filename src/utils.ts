import type { Bookmark, Folder } from '@/types';

/**
 * Formats a number using Vietnamese locale (dots as thousand separators)
 * @param num - The number to format
 * @returns Formatted string
 */
export const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
};

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

/**
 * Parses HTML bookmark file content
 * @param htmlContent - The HTML string content
 * @returns Array of bookmarks
 */
export const parseHTMLBookmarks = (htmlContent: string): Bookmark[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));

    return links.map((link, index) => {
        const title = link.textContent || 'No Title';
        const url = link.href;
        
        // Netscape format often uses TAGS or KEYWORDS attribute
        const tagsAttr = link.getAttribute('TAGS') || link.getAttribute('KEYWORDS') || '';
        const tags = tagsAttr ? tagsAttr.split(',').map(t => t.trim()).filter(Boolean) : [];

        return {
            id: `html-${Date.now()}-${index}`,
            title,
            url,
            parentId: null,
            tags: tags.length > 0 ? tags : undefined
        };
    }).filter(bm => bm.url);
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

/**
 * Converts a flat list of bookmarks with paths into a folder tree structure.
 * @param bookmarks - List of bookmarks with 'path' property
 * @param existingTree - Existing folder structure to preserve
 * @returns The new folder tree
 */
export const arrayToTree = (bookmarks: (Bookmark & { path?: string[] })[], existingTree: (Folder | Bookmark)[] = []): (Folder | Bookmark)[] => {
    const root: Folder = { id: 'root', name: 'Thư Mục', children: [], parentId: null };
    const foldersMap = new Map<string, Folder>();
    foldersMap.set('root', root);

    // Helper to clone existing tree
    const cloneTree = (nodes: (Folder | Bookmark)[]): (Folder | Bookmark)[] => {
        return nodes.filter(n => !('url' in n)).map(n => {
            const folder = n as Folder;
            const newFolder = { ...folder, children: cloneTree(folder.children) };
            foldersMap.set(newFolder.id, newFolder);
            return newFolder;
        });
    };

    const clonedRootChildren = cloneTree(existingTree);
    root.children = clonedRootChildren;

    const getOrCreateFolder = (path: string[]): Folder => {
        let currentLevel = root;
        let currentPath = '';

        for (const folderName of path) {
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
            let folder = foldersMap.get(currentPath);
            
            if (!folder) {
                // Try to find by name in current level to avoid creating duplicates if ID is different
                const existingInLevel = currentLevel.children.find(c => !('url' in c) && (c as Folder).name === folderName) as Folder;
                if (existingInLevel) {
                    folder = existingInLevel;
                } else {
                    const parentId = currentLevel.id;
                    folder = { id: currentPath, name: folderName, children: [], parentId };
                    currentLevel.children.push(folder);
                }
                foldersMap.set(currentPath, folder);
            }
            currentLevel = folder;
        }
        return currentLevel;
    };

    bookmarks.forEach(bm => {
        if (bm.path && bm.path.length > 0) {
            const parentFolder = getOrCreateFolder(bm.path);
            parentFolder.children.push({ ...bm, parentId: parentFolder.id });
        } else {
            root.children.push({ ...bm, parentId: 'root' });
        }
    });
    
    return root.children;
};

/**
 * Creates mock data for testing/initialization
 * @returns Array of mock bookmarks
 */
export const createMockData = (): Bookmark[] => {
    return [
    // Web Development
        { id: 'bm-1', title: 'React Docs - Trang chủ chính thức', url: 'https://react.dev/', parentId: null },
        { id: 'bm-2', title: 'Tailwind CSS - Tiện ích CSS hàng đầu', url: 'https://tailwindcss.com/', parentId: null },
        { id: 'bm-3', title: 'MDN Web Docs - Tài liệu cho Lập trình viên Web', url: 'https://developer.mozilla.org/', parentId: null },
        { id: 'bm-4', title: 'Vite.js - Công cụ build thế hệ mới', url: 'https://vitejs.dev/', parentId: null },
        { id: 'bm-5', title: 'Node.js - Môi trường chạy JavaScript', url: 'https://nodejs.org/', parentId: null },

        // AI & Machine Learning
        { id: 'bm-6', title: 'Google Gemini API - Hướng dẫn', url: 'https://ai.google.dev/docs', parentId: null },
        { id: 'bm-7', title: 'Hugging Face - Cộng đồng AI', url: 'https://huggingface.co/', parentId: null },
        { id: 'bm-8', title: 'TensorFlow - Nền tảng Machine Learning', url: 'https://www.tensorflow.org/', parentId: null },
        { id: 'bm-9', title: 'PyTorch - Nền tảng Deep Learning', url: 'https://pytorch.org/', parentId: null },
        { id: 'bm-10', title: 'Giới thiệu về Mạng nơ-ron tích chập (CNN)', url: 'https://en.wikipedia.org/wiki/Convolutional_neural_network', parentId: null },

        // Design & UX/UI
        { id: 'bm-11', title: 'Figma - Công cụ thiết kế giao diện', url: 'https://www.figma.com/', parentId: null },
        { id: 'bm-12', title: 'Dribbble - Nơi trưng bày của các nhà thiết kế', url: 'https://dribbble.com/', parentId: null },
        { id: 'bm-13', title: 'Nielsen Norman Group - Nghiên cứu UX', url: 'https://www.nngroup.com/', parentId: null },
    
        // Productivity & Tools
        { id: 'bm-14', title: 'Notion - Không gian làm việc tất cả trong một', url: 'https://www.notion.so/', parentId: null },
        { id: 'bm-15', title: 'GitHub - Nơi thế giới xây dựng phần mềm', url: 'https://github.com/', parentId: null },
    
        // DUPLICATE MOCK DATA
        { id: 'bm-16', title: 'React Docs (Bản sao)', url: 'https://react.dev/', parentId: null },
        { id: 'bm-17', title: 'Figma Mirror', url: 'https://www.figma.com/', parentId: null },
    ];
};

/**
 * Finds a folder by ID in the tree
 */
export function findFolder(items: (Folder | Bookmark)[], id: string | null): Folder | null {
    if (id === null) return null;
    const queue = [...items];
    while (queue.length > 0) {
        const item = queue.shift()!;
        if ('url' in item) continue;
        const folder = item as Folder;
        if (folder.id === id) return folder;
        if (folder.children) {
            queue.push(...folder.children);
        }
    }
    return null;
}

/**
 * Gets all bookmarks within a folder and its subfolders
 */
export function getBookmarksInFolder(folder: Folder | null): Bookmark[] {
    if (!folder) return [];
    const bookmarks: Bookmark[] = [];
    const queue: (Folder | Bookmark)[] = [folder];
    while (queue.length > 0) {
        const current = queue.shift()!;
        if ('url' in current) {
            bookmarks.push(current as Bookmark);
        } else if (current.children) {
            queue.push(...current.children);
        }
    }
    return bookmarks;
}
