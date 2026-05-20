import type { Bookmark, Folder, FolderStructureNode } from '@/types';
import { getAllExistingPaths, standardizePath } from './pathUtils';
import type { TagFolderSchema } from './aiUtils';

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

    const updatedUrls = new Set(bookmarks.map(bm => bm.url));
    const existingPaths = getAllExistingPaths(existingTree);

    // Helper to clone existing tree and remove bookmarks that are being updated
    const cloneTree = (nodes: (Folder | Bookmark)[], currentPath: string[] = []): (Folder | Bookmark)[] => {
        return nodes
            .filter(n => !('url' in n) || !updatedUrls.has((n as Bookmark).url))
            .map(n => {
                if ('url' in n) return { ...n }; // Preserve existing bookmark that's not being updated
                
                const folder = n as Folder;
                const path = [...currentPath, folder.name];
                const pathKey = JSON.stringify(path);
                const newFolder = { ...folder, children: [...cloneTree(folder.children, path)] };
                foldersMap.set(pathKey, newFolder);
                return newFolder;
            });
    };

    const clonedRootChildren = cloneTree(existingTree);
    root.children = clonedRootChildren;

    const getOrCreateFolder = (path: string[]): Folder => {
        let currentLevel = root;
        const currentPath: string[] = [];

        for (const folderName of path) {
            currentPath.push(folderName);
            const pathKey = JSON.stringify(currentPath);
            let folder = foldersMap.get(pathKey);
            
            if (!folder) {
                // Try to find by name in current level to avoid creating duplicates if ID is different
                const existingInLevel = currentLevel.children.find(c => !('url' in c) && (c as Folder).name === folderName) as Folder;
                if (existingInLevel) {
                    folder = existingInLevel;
                } else {
                    const parentId = currentLevel.id;
                    const folderId = `folder-${Math.random().toString(36).substring(2, 11)}`;
                    folder = { id: folderId, name: folderName, children: [], parentId };
                    currentLevel.children = [...currentLevel.children, folder];
                }
                foldersMap.set(pathKey, folder);
            }
            currentLevel = folder;
        }
        return currentLevel;
    };

    bookmarks.forEach(bm => {
        if (bm.path && bm.path.length > 0) {
            // Standardize path before creating folders
            const standardized = standardizePath(bm.path, existingPaths);
            const parentFolder = getOrCreateFolder(standardized);
            parentFolder.children = [...parentFolder.children, { ...bm, parentId: parentFolder.id }];
        } else {
            root.children = [...root.children, { ...bm, parentId: 'root' }];
        }
    });
    
    return root.children;
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

/**
 * Converts a FolderStructureNode structure to a Folder tree
 */
export const convertStructureToTree = (structure: FolderStructureNode[]): (Folder | Bookmark)[] => {
    if (!structure || structure.length === 0) return [];
    
    const result: Folder[] = [];
    const stack: { node: FolderStructureNode; parent: Folder | null }[] = 
        structure.map(n => ({ node: n, parent: null }));
    
    const folderMap = new Map<string, Folder>();
    
    while (stack.length > 0) {
        const { node, parent } = stack.pop()!;
        
        const folder: Folder = {
            id: node.id,
            name: node.name,
            children: [],
            parentId: parent ? parent.id : null
        };
        
        folderMap.set(folder.id, folder);
        
        if (parent) {
            parent.children.push(folder);
        } else {
            result.push(folder);
        }
        
        if (node.children && node.children.length > 0) {
            for (let i = node.children.length - 1; i >= 0; i--) {
                stack.push({ node: node.children[i], parent: folder });
            }
        }
    }
    
    return result;
};
/**
 * Recursively removes folders that contain no bookmarks and no non-empty subfolders.
 * Uses an immutable approach and returns the original array if no changes were made to prevent infinite loops.
 */
export const removeEmptyFolders = (items: (Folder | Bookmark)[]): (Folder | Bookmark)[] => {
    let changed = false;
    
    const result = items.reduce<(Folder | Bookmark)[]>((acc, item) => {
        if ('url' in item) {
            acc.push(item);
            return acc;
        }
        
        const folder = item as Folder;
        const cleanedChildren = folder.children ? removeEmptyFolders(folder.children) : [];
        
        if (cleanedChildren.length > 0) {
            // Check if children changed by reference
            if (cleanedChildren !== folder.children) {
                changed = true;
                acc.push({ ...folder, children: cleanedChildren });
            } else {
                acc.push(folder);
            }
        } else {
            // Folder is now empty and was removed
            changed = true;
        }
        
        return acc;
    }, []);

    // Return original array reference if no items were removed or modified
    return (changed || result.length !== items.length) ? result : items;
};

/**
 * Distributes bookmarks into paths based on a tag-to-folder schema.
 * Handles multiple tags by prioritizing the first mapped tag found.
 * Unmapped bookmarks get an empty path (root).
 */
export const distributeBookmarksByTagSchema = (
    bookmarks: Bookmark[],
    schema: TagFolderSchema[]
): Bookmark[] => {
    // Build a map of tag to full path string[]
    const tagToPathMap = new Map<string, string[]>();
    const folderNameToPathMap = new Map<string, string[]>();

    const traverseSchema = (nodes: TagFolderSchema[], currentPath: string[]) => {
        nodes.forEach(node => {
            // Handle cases where AI returns "Parent/Child" or "Parent > Child" instead of a nested structure
            const nameSegments = node.name.split(/[/>|\\]/).map(s => s.trim()).filter(Boolean);
            const newPath = [...currentPath, ...nameSegments];
            
            const leafName = nameSegments.length > 0 ? nameSegments[nameSegments.length - 1] : node.name;
            folderNameToPathMap.set(leafName.toLowerCase().trim(), newPath);
            if (leafName !== node.name) {
                folderNameToPathMap.set(node.name.toLowerCase().trim(), newPath);
            }
            
            if (node.mappedTags && node.mappedTags.length > 0) {
                node.mappedTags.forEach(tag => {
                    const normalizedTag = tag.toLowerCase().trim();
                    if (!tagToPathMap.has(normalizedTag)) {
                        tagToPathMap.set(normalizedTag, newPath);
                    }
                });
            }
            if (node.children && node.children.length > 0) {
                traverseSchema(node.children, newPath);
            }
        });
    };

    traverseSchema(schema, []);

    return bookmarks.map(bm => {
        let assignedPath: string[] = [];
        
        if (bm.tags && bm.tags.length > 0) {
            let bestPath: string[] = [];
            
            // 1. Exact Match with mappedTags
            for (const tag of bm.tags) {
                const normalizedTag = tag.toLowerCase().trim();
                const path = tagToPathMap.get(normalizedTag);
                if (path && path.length > bestPath.length) {
                    bestPath = path;
                }
            }
            
            // 2. Fuzzy Match with folder names (if no exact match found yet)
            if (bestPath.length === 0) {
                for (const tag of bm.tags) {
                    const normalizedTag = tag.toLowerCase().trim();
                    // Check if tag is exactly a folder name or folder name contains tag
                    for (const [folderName, path] of folderNameToPathMap.entries()) {
                        if (folderName === normalizedTag || folderName.includes(normalizedTag) || normalizedTag.includes(folderName)) {
                            if (path.length > bestPath.length) {
                                bestPath = path;
                            }
                        }
                    }
                }
            }
            
            assignedPath = bestPath;
        }

        return {
            ...bm,
            path: assignedPath.length > 0 ? assignedPath : ['[Unmapped Tags]']
        };
    });
};
