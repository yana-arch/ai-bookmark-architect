import { useMemo } from 'react';
import type { Folder, Bookmark } from '@/types';
import { getBookmarksInFolder } from '@/src/utils/treeUtils';

export const useFolderStats = (folders: (Folder | Bookmark)[]) => {
    const foldersWithCounts = useMemo(() => {
        const addCounts = (items: (Folder | Bookmark)[]): (Folder | Bookmark)[] => {
            if (!Array.isArray(items)) return [];
            return items.map(item => {
                if ('url' in item) {
                    return item;
                }
                const folder = item as Folder;
                const bookmarkCount = getBookmarksInFolder(folder).length;
                return {
                    ...folder,
                    bookmarkCount,
                    children: addCounts(folder.children),
                };
            });
        };
        return addCounts(folders);
    }, [folders]);

    return { foldersWithCounts };
};
