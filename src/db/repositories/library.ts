import { bookmarkStore, smartRuleStore, userCorrectionStore, saveFolders, getFolders, saveBookmarks } from '../local';
import type { Bookmark, Folder, SmartClassifyRule, UserCorrection } from '@/types';

/**
 * LibraryRepository: Deep module for core bookmark data.
 * Leverage: Handles batching, tree state, and rules in one locality.
 */
export class LibraryRepository {
    /**
     * Replaces all bookmarks in storage.
     * Implementation handles the batching logic.
     */
    async syncBookmarks(bookmarks: Bookmark[]): Promise<void> {
        await saveBookmarks(bookmarks);
    }

    async getBookmarks(): Promise<Bookmark[]> {
        return bookmarkStore.getAll();
    }

    /**
     * Saves the entire folder tree structure.
     */
    async saveTree(folders: (Folder | Bookmark)[]): Promise<void> {
        await saveFolders(folders);
    }

    async getTree(): Promise<(Folder | Bookmark)[] | undefined> {
        return getFolders();
    }

    // Rules & Corrections
    async getRules(): Promise<SmartClassifyRule[]> {
        return smartRuleStore.getAll();
    }

    async saveRule(rule: SmartClassifyRule): Promise<void> {
        await smartRuleStore.put(rule);
    }

    async deleteRule(id: string): Promise<void> {
        await smartRuleStore.delete(id);
    }

    async getCorrections(): Promise<UserCorrection[]> {
        return userCorrectionStore.getAll();
    }

    async addCorrection(correction: UserCorrection): Promise<void> {
        await userCorrectionStore.add(correction);
    }
}

export const libraryRepo = new LibraryRepository();
