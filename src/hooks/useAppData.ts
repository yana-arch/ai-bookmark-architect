import { useState, useEffect, useCallback } from 'react';
import { libraryRepo } from '@/src/db/repositories/library';
import { settingsRepo } from '@/src/db/repositories/settings';
import { systemRepo } from '@/src/db/repositories/system';
import { perfMonitor } from '@/src/performance';
import { createMockData } from '@/src/utils/mockUtils';
import { DEFAULT_TEMPLATES, DEFAULT_PROFILES } from '@/src/constants/defaults';
import { AppState, Bookmark, Folder, ApiConfig, InstructionPreset, FolderTemplate, UserCorrection, AIProfile } from '@/types';

export const useAppData = () => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [folders, setFolders] = useState<(Folder | Bookmark)[]>([]);
    const [appState, setAppState] = useState<AppState>(AppState.EMPTY);
    const [isLoading, setIsLoading] = useState(true);
    const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
    const [instructionPresets, setInstructionPresets] = useState<InstructionPreset[]>([]);
    const [folderTemplates, setFolderTemplates] = useState<FolderTemplate[]>([]);
    const [userCorrections, setUserCorrections] = useState<UserCorrection[]>([]);
    const [aiProfiles, setAiProfiles] = useState<AIProfile[]>([]);
    const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'info' | 'error' | 'success' | 'warning', duration?: number, action?: { label: string, onClick: () => void } }[]>([]);

    // Function to initialize default templates
    const initializeDefaults = useCallback(async () => {
        await Promise.all([
            ...DEFAULT_TEMPLATES.map(t => settingsRepo.saveTemplate(t)),
            ...DEFAULT_PROFILES.map(p => settingsRepo.saveProfile(p))
        ]);
        
        setFolderTemplates(DEFAULT_TEMPLATES);
        setAiProfiles(DEFAULT_PROFILES);
    }, []);

    const loadData = useCallback(async () => {
        await perfMonitor.timeAsyncFunction('app_load_data', async () => {
            setIsLoading(true);
            const [
                savedFolders, savedBookmarks, savedApiConfigs,
                savedPresets, savedTemplates, savedCorrections, savedProfiles
            ] = await Promise.all([
                libraryRepo.getTree(),
                libraryRepo.getBookmarks(),
                settingsRepo.getApiConfigs(),
                settingsRepo.getPresets(),
                settingsRepo.getTemplates(),
                libraryRepo.getCorrections(),
                settingsRepo.getProfiles()
            ]);

            setApiConfigs(savedApiConfigs || []);
            setInstructionPresets(savedPresets || []);
            setFolderTemplates(savedTemplates || []);
            setUserCorrections(savedCorrections || []);
            setAiProfiles(savedProfiles || []);

            if (!savedTemplates || savedTemplates.length === 0 || !savedProfiles || savedProfiles.length === 0) {
                await initializeDefaults();
            }

            if (savedFolders && savedFolders.length > 0) {
                setFolders(savedFolders);
                setBookmarks(savedBookmarks);
                setAppState(AppState.STRUCTURED);
            } else if (savedBookmarks && savedBookmarks.length > 0) {
                setBookmarks(savedBookmarks);
                setAppState(AppState.LOADED);
            } else {
                // No data, let's load mock data
                const mockBookmarks = createMockData();
                await libraryRepo.syncBookmarks(mockBookmarks);
                setBookmarks(mockBookmarks);
                setAppState(AppState.LOADED);
            }
            setIsLoading(false);
        });
    }, [initializeDefaults]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleClearData = useCallback(async () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu bookmarks không? Hành động này không thể hoàn tác.')) {
            await systemRepo.factoryReset();
            setBookmarks([]);
            setFolders([]);
            setAppState(AppState.EMPTY);
        }
    }, []);

    const handleMoveBookmark = useCallback(async (bookmarkId: string, targetFolderId: string | 'root') => {
        const bookmark = bookmarks.find(b => b.id === bookmarkId);
        if (!bookmark) return;

        const originalPath = bookmark.path || [];

        // Find target folder to get its path
        let targetPath: string[] = [];
        if (targetFolderId !== 'root') {
            const findPath = (items: (Folder | Bookmark)[], id: string, currentPath: string[] = []): string[] | null => {
                for (const item of items) {
                    if ('url' in item) continue;
                    const folder = item as Folder;
                    const newPath = [...currentPath, folder.name];
                    if (folder.id === id) return newPath;
                    const subPath = findPath(folder.children, id, newPath);
                    if (subPath) return subPath;
                }
                return null;
            };
            targetPath = findPath(folders, targetFolderId) || [];
        }

        // 1. Update bookmark in flat list
        const updatedBookmarks = bookmarks.map(b =>
            b.id === bookmarkId ? { ...b, parentId: targetFolderId === 'root' ? null : targetFolderId, path: targetPath } : b
        );
        setBookmarks(updatedBookmarks);
        await libraryRepo.syncBookmarks(updatedBookmarks);

        // 2. Update folder tree
        const removeBookmarkFromTree = (items: (Folder | Bookmark)[]): (Folder | Bookmark)[] => {
            return items.filter(item => {
                if ('url' in item) return (item as Bookmark).id !== bookmarkId;
                (item as Folder).children = removeBookmarkFromTree((item as Folder).children);
                return true;
            });
        };

        const addBookmarkToTree = (items: (Folder | Bookmark)[], targetId: string | 'root', bookmarkToAdd: Bookmark): (Folder | Bookmark)[] => {
            if (targetId === 'root') {
                return [...items, bookmarkToAdd];
            }
            return items.map(item => {
                if ('url' in item) return item;
                const folder = item as Folder;
                if (folder.id === targetId) {
                    return { ...folder, children: [...folder.children, bookmarkToAdd] };
                }
                return { ...folder, children: addBookmarkToTree(folder.children, targetId, bookmarkToAdd) };
            });
        };

        const treeWithoutBookmark = removeBookmarkFromTree(folders);
        const updatedBookmark = updatedBookmarks.find(b => b.id === bookmarkId)!;
        const finalTree = addBookmarkToTree(treeWithoutBookmark, targetFolderId, updatedBookmark);

        setFolders(finalTree);
        await libraryRepo.saveTree(finalTree);

        // 3. Record User Correction for AI Learning
        const correction: UserCorrection = {
            id: `corr-${Date.now()}`,
            originalBookmarkUrl: bookmark.url,
            originalPath,
            correctedPath: targetPath,
            timestamp: Date.now()
        };

        const updatedCorrections = [...userCorrections, correction];
        setUserCorrections(updatedCorrections);
        await libraryRepo.addCorrection(correction);

        setNotifications(prev => [...prev, {
            id: `move-${Date.now()}`,
            message: `Đã di chuyển bookmark tới [${targetPath.join(' > ') || 'Root'}] và ghi nhận thay đổi.`,
            type: 'success',
            duration: 3000
        }]);
    }, [bookmarks, folders, userCorrections]);

    const refreshData = loadData;

    return {
        bookmarks,
        setBookmarks,
        folders,
        setFolders,
        appState,
        setAppState,
        isLoading,
        apiConfigs,
        setApiConfigs,
        instructionPresets,
        setInstructionPresets,
        folderTemplates,
        setFolderTemplates,
        userCorrections,
        setUserCorrections,
        aiProfiles,
        setAiProfiles,
        notifications,
        setNotifications,
        handleClearData,
        handleMoveBookmark,
        refreshData
    };
};
