import { useState, useEffect, useCallback } from 'react';
import { Bookmark, DuplicateStats, AppState, Folder } from '../types';
import { perfMonitor } from '../src/performance';
import { normalizeURL, arrayToTree } from '../src/utils';
import * as db from '../db';

export const useDuplicates = (
    bookmarks: Bookmark[],
    setBookmarks: (bookmarks: Bookmark[]) => void,
    appState: AppState,
    setFolders: (folders: (Folder | Bookmark)[]) => void,
    setAppState: (state: AppState) => void
) => {
    const [duplicateStats, setDuplicateStats] = useState<DuplicateStats>({ count: 0, byHost: {} });
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

    const getHostname = (url: string): string => {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return 'invalid_url';
        }
    };

    useEffect(() => {
        const findDuplicates = () => {
            perfMonitor.timeFunction('find_duplicates', () => {
                const urlMap = new Map<string, Bookmark[]>();
                bookmarks.forEach(bm => {
                    const normalizedUrl = normalizeURL(bm.url);
                    const existing = urlMap.get(normalizedUrl);
                    if (existing) {
                        existing.push(bm);
                    } else {
                        urlMap.set(normalizedUrl, [bm]);
                    }
                });

                const duplicates = Array.from(urlMap.values()).filter(group => group.length > 1);
                const totalDuplicates = duplicates.reduce((acc, group) => acc + group.length - 1, 0);

                if (totalDuplicates > 0) {
                    const byHost: { [host: string]: number } = {};
                    duplicates.forEach(group => {
                        const host = getHostname(group[0].url);
                        const duplicateCount = group.length - 1;
                        byHost[host] = (byHost[host] || 0) + duplicateCount;
                    });
                    setDuplicateStats({ count: totalDuplicates, byHost });
                } else {
                    setDuplicateStats({ count: 0, byHost: {} });
                }
            });
        };

        // Debounce duplicate detection to avoid excessive calculations
        const timeoutId = setTimeout(findDuplicates, 300);
        return () => clearTimeout(timeoutId);
    }, [bookmarks]);

    const handleCleanDuplicates = useCallback(async () => {
        await perfMonitor.timeAsyncFunction('clean_duplicates', async () => {
            const seenUrls = new Set<string>();
            const uniqueBookmarks: Bookmark[] = [];
            // Iterate backwards to keep the "last" (most recent) bookmark
            for (let i = bookmarks.length - 1; i >= 0; i--) {
                const bm = bookmarks[i];
                const normalizedUrl = normalizeURL(bm.url);
                if (!seenUrls.has(normalizedUrl)) {
                    uniqueBookmarks.push(bm);
                    seenUrls.add(normalizedUrl);
                }
            }

            const cleanedBookmarks = uniqueBookmarks.reverse(); // Restore original order
            await db.saveBookmarks(cleanedBookmarks);
            setBookmarks(cleanedBookmarks);

            // If the current structure exists, rebuild it with remaining bookmarks
            if (appState === AppState.STRUCTURED) {
                const updatedFolders = arrayToTree(cleanedBookmarks);
                await db.saveFolders(updatedFolders);
                setFolders(updatedFolders);
            } else if (appState === AppState.REVIEW || appState === AppState.ERROR) {
                // Clear temporary structure for non-applied changes
                await db.saveFolders([]);
                setFolders([]);
                setAppState(AppState.LOADED);
            }

            setIsDuplicateModalOpen(false);
        });
    }, [bookmarks, appState, setBookmarks, setFolders, setAppState]);

    return {
        duplicateStats,
        isDuplicateModalOpen,
        setIsDuplicateModalOpen,
        handleCleanDuplicates
    };
};
