
// src/analyticsWorker.ts

import type { Bookmark, Folder, AnalyticsData } from '@/types';
import * as db from '@/db';

// Helper function to count bookmarks in a folder iteratively
function getBookmarksInFolder(folder: Folder, allBookmarks: Bookmark[]): Bookmark[] {
    const folderIds = new Set<string>();
    const queue: (Folder | Bookmark)[] = [folder];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current.id)) {
            continue;
        }
        visited.add(current.id);

        if ('children' in current && current.children) {
            folderIds.add(current.id);
            for (const child of current.children) {
                queue.push(child);
            }
        }
    }

    return allBookmarks.filter(bm => bm.parentId && folderIds.has(bm.parentId));
}


self.onmessage = async (e: MessageEvent<{ bookmarks: Bookmark[], folders: (Folder | Bookmark)[] }>) => {
    const { bookmarks, folders } = e.data;

    // Calculate basic stats
    const totalBookmarks = bookmarks.length;
    const totalFolders = folders.filter(item => 'children' in item).length;
    const avgBookmarksPerFolder = totalFolders > 0 ? totalBookmarks / totalFolders : 0;

    // Calculate top domains
    const domainMap = new Map<string, number>();
    bookmarks.forEach(bookmark => {
        try {
            const url = new URL(bookmark.url);
            const domain = url.hostname;
            domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
        } catch (e) {
            // Invalid URL, skip
        }
    });
    const topDomains = Array.from(domainMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

    // Calculate folder distribution
    const folderDistribution = folders
        .filter((item): item is Folder => 'children' in item)
        .map(folder => {
            const bookmarkCount = getBookmarksInFolder(folder, bookmarks).length;
            return { folder: folder.name, count: bookmarkCount };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Calculate tag usage
    const tagMap = new Map<string, number>();
    bookmarks.forEach(bookmark => {
        if (bookmark.tags) {
            bookmark.tags.forEach(tag => {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
        }
    });
    const tagUsage = Array.from(tagMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

    // Get AI performance data from logs
    const logs = await db.getLogs();
    const aiRequests = logs.filter(log => log.type === 'request' && log.title.includes('Request'));
    const aiResponses = logs.filter(log => log.type === 'response' && log.title.includes('Response'));

    const totalRequests = aiRequests.length;
    const successRate = totalRequests > 0 ? (aiResponses.length / totalRequests) * 100 : 0;

    // Calculate average tokens per request
    const tokenUsages = logs
        .filter(log => log.usage)
        .map(log => log.usage!.totalTokens);
    const avgTokensPerRequest = tokenUsages.length > 0
        ? tokenUsages.reduce((sum, tokens) => sum + tokens, 0) / tokenUsages.length
        : 0;

    // Get user corrections for accuracy score
    const corrections = await db.getUserCorrections();
    const accuracyScore = totalRequests > 0
        ? ((totalRequests - corrections.length) / totalRequests) * 100
        : 100;

    // Mock usage stats (in a real app, these would be tracked)
    const usageStats = {
        totalSessions: 1, // Would be tracked
        avgSessionDuration: 0, // Would be tracked
        mostUsedFeatures: ['Import', 'Restructure', 'Export'], // Would be tracked
        importCount: logs.filter(log => log.title.includes('Import')).length,
        exportCount: logs.filter(log => log.title.includes('Export')).length,
    };

    // Mock growth trends (in a real app, historical data would be stored)
    const growthTrends = [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 10), folders: Math.max(0, totalFolders - 2) },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 8), folders: Math.max(0, totalFolders - 1) },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 6), folders: totalFolders },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 4), folders: totalFolders },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 2), folders: totalFolders },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: totalBookmarks, folders: totalFolders },
        { date: new Date().toISOString().split('T')[0], bookmarks: totalBookmarks, folders: totalFolders },
    ];

    const analytics: AnalyticsData = {
        totalBookmarks,
        totalFolders,
        avgBookmarksPerFolder,
        topDomains,
        folderDistribution,
        tagUsage,
        aiPerformance: {
            totalRequests,
            successRate,
            avgTokensPerRequest,
            accuracyScore,
        },
        usageStats,
        growthTrends,
    };

    self.postMessage(analytics);
};
