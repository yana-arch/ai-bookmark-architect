import { useState, useCallback } from 'react';
import { Bookmark, BrokenLinkCheckState, AppState, Folder } from '../types';
import { perfMonitor } from '../src/performance';
import { arrayToTree } from '../src/utils';
import * as db from '../db';

export const useBrokenLinks = (
    bookmarks: Bookmark[],
    setBookmarks: (bookmarks: Bookmark[]) => void,
    appState: AppState,
    setFolders: (folders: (Folder | Bookmark)[]) => void,
    setAppState: (state: AppState) => void
) => {
    const [brokenLinks, setBrokenLinks] = useState<Bookmark[]>([]);
    const [brokenLinkCheckState, setBrokenLinkCheckState] = useState<BrokenLinkCheckState>(BrokenLinkCheckState.IDLE);
    const [brokenLinkCheckProgress, setBrokenLinkCheckProgress] = useState({ current: 0, total: 0 });
    const [isBrokenLinkModalOpen, setIsBrokenLinkModalOpen] = useState(false);

    const isLinkBroken = async (url: string): Promise<boolean> => {
        try {
            await fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(5000) });
            return false;
        } catch (e) {
            return true;
        }
    };

    const handleStartBrokenLinkCheck = useCallback(async () => {
        if (brokenLinkCheckState === BrokenLinkCheckState.CHECKING) return;
        
        await perfMonitor.timeAsyncFunction('check_broken_links', async () => {
            setBrokenLinkCheckState(BrokenLinkCheckState.CHECKING);
            setBrokenLinkCheckProgress({ current: 0, total: bookmarks.length });
            const foundBrokenLinks: Bookmark[] = [];
            const BATCH_SIZE = 10;
            const DELAY_MS = 200;

            for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
                const batch = bookmarks.slice(i, i + BATCH_SIZE);
                const promises = batch.map(bm => isLinkBroken(bm.url).then(isBroken => ({ isBroken, bm })));

                const results = await Promise.all(promises);
                results.forEach(result => {
                    if (result.isBroken) {
                        foundBrokenLinks.push(result.bm);
                    }
                });

                setBrokenLinkCheckProgress(prev => ({ ...prev, current: i + batch.length }));
                if (i + BATCH_SIZE < bookmarks.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }

            setBrokenLinks(foundBrokenLinks);
            setBrokenLinkCheckState(BrokenLinkCheckState.IDLE);

            if (foundBrokenLinks.length > 0) {
                setIsBrokenLinkModalOpen(true);
            } else {
                alert('Không tìm thấy liên kết hỏng nào.');
            }
        });
    }, [brokenLinkCheckState, bookmarks]);

    const handleCleanBrokenLinks = useCallback(async () => {
        await perfMonitor.timeAsyncFunction('clean_broken_links', async () => {
            const brokenLinkIds = new Set(brokenLinks.map(bl => bl.id));
            const cleanedBookmarks = bookmarks.filter(bm => !brokenLinkIds.has(bm.id));

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

            setIsBrokenLinkModalOpen(false);
            setBrokenLinks([]);
        });
    }, [brokenLinks, bookmarks, appState, setBookmarks, setFolders, setAppState]);

    return {
        brokenLinks,
        brokenLinkCheckState,
        brokenLinkCheckProgress,
        isBrokenLinkModalOpen,
        setIsBrokenLinkModalOpen,
        handleStartBrokenLinkCheck,
        handleCleanBrokenLinks
    };
};
