import { useState, useEffect, useCallback } from 'react';
import * as db from '@db';
import { perfMonitor } from '@/src/performance';
import { backupScheduler } from '@/src/services/backupScheduler';
import { createMockData } from '@/src/utils/mockUtils';
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
    const initializeDefaultTemplates = useCallback(async () => {
        const defaultTemplates: FolderTemplate[] = [
            {
                id: 'template-web-dev',
                name: 'Phát triển Web',
                description: 'Cấu trúc thư mục cho các bookmark liên quan đến phát triển web',
                structure: [
                    {
                        id: 'web-frontend',
                        name: 'Frontend',
                        children: [
                            { id: 'web-react', name: 'React', children: [], parentId: 'web-frontend' },
                            { id: 'web-vue', name: 'Vue.js', children: [], parentId: 'web-frontend' },
                            { id: 'web-angular', name: 'Angular', children: [], parentId: 'web-frontend' },
                            { id: 'web-html-css', name: 'HTML/CSS', children: [], parentId: 'web-frontend' },
                        ],
                        parentId: null,
                    },
                    {
                        id: 'web-backend',
                        name: 'Backend',
                        children: [
                            { id: 'web-nodejs', name: 'Node.js', children: [], parentId: 'web-backend' },
                            { id: 'web-python', name: 'Python', children: [], parentId: 'web-backend' },
                            { id: 'web-php', name: 'PHP', children: [], parentId: 'web-backend' },
                            { id: 'web-database', name: 'Database', children: [], parentId: 'web-backend' },
                        ],
                        parentId: null,
                    },
                    {
                        id: 'web-tools',
                        name: 'Công cụ & Tiện ích',
                        children: [
                            { id: 'web-build-tools', name: 'Build Tools', children: [], parentId: 'web-tools' },
                            { id: 'web-editors', name: 'Editors', children: [], parentId: 'web-tools' },
                            { id: 'web-version-control', name: 'Version Control', children: [], parentId: 'web-tools' },
                        ],
                        parentId: null,
                    },
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isDefault: true,
                customPrompt: "Act as a specialized Web Development Architect. Focus on grouping technical documentation and frameworks into the provided structure.",
                tagDrivenPrompt: "Focus on technical tags like 'react', 'nodejs', 'api', 'frontend', 'backend'. Group these tags logically into the Web Development taxonomy."
            },
            {
                id: 'template-ai-ml',
                name: 'AI & Machine Learning',
                description: 'Cấu trúc thư mục cho các bookmark liên quan đến AI và Machine Learning',
                structure: [
                    {
                        id: 'ai-fundamentals',
                        name: 'Kiến thức cơ bản',
                        children: [
                            { id: 'ai-math', name: 'Toán học', children: [], parentId: 'ai-fundamentals' },
                            { id: 'ai-algorithms', name: 'Thuật toán', children: [], parentId: 'ai-fundamentals' },
                            { id: 'ai-concepts', name: 'Khái niệm cơ bản', children: [], parentId: 'ai-fundamentals' },
                        ],
                        parentId: null,
                    },
                    {
                        id: 'ai-frameworks',
                        name: 'Frameworks & Libraries',
                        children: [
                            { id: 'ai-tensorflow', name: 'TensorFlow', children: [], parentId: 'ai-frameworks' },
                            { id: 'ai-pytorch', name: 'PyTorch', children: [], parentId: 'ai-frameworks' },
                            { id: 'ai-keras', name: 'Keras', children: [], parentId: 'ai-frameworks' },
                            { id: 'ai-scikit-learn', name: 'Scikit-learn', children: [], parentId: 'ai-frameworks' },
                        ],
                        parentId: null,
                    },
                    {
                        id: 'ai-applications',
                        name: 'Ứng dụng',
                        children: [
                            { id: 'ai-nlp', name: 'Xử lý ngôn ngữ tự nhiên', children: [], parentId: 'ai-applications' },
                            { id: 'ai-computer-vision', name: 'Computer Vision', children: [], parentId: 'ai-applications' },
                            { id: 'ai-robotics', name: 'Robotics', children: [], parentId: 'ai-applications' },
                        ],
                        parentId: null,
                    },
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isDefault: true,
                customPrompt: "Act as an AI Research Librarian. Categorize highly technical papers and tools into the ML hierarchy.",
                tagDrivenPrompt: "Extract specific AI tags like 'LLM', 'neural-networks', 'transformers'. Map them to the AI/ML folder structure."
            },
            {
                id: 'template-general',
                name: 'Tổng hợp',
                description: 'Cấu trúc thư mục tổng hợp cho nhiều loại bookmark khác nhau',
                structure: [
                    {
                        id: 'general-tech',
                        name: 'Công nghệ',
                        children: [
                            { id: 'general-programming', name: 'Lập trình', children: [], parentId: 'general-tech' },
                            { id: 'general-ai', name: 'Trí tuệ nhân tạo', children: [], parentId: 'general-tech' },
                            { id: 'general-web', name: 'Web', children: [], parentId: 'general-tech' },
                        ],
                        parentId: null,
                    },
                    {
                        id: 'general-learning',
                        name: 'Học tập',
                        children: [
                            { id: 'general-tutorials', name: 'Hướng dẫn', children: [], parentId: 'general-learning' },
                            { id: 'general-courses', name: 'Khóa học', children: [], parentId: 'general-learning' },
                            { id: 'general-documentation', name: 'Tài liệu', children: [], parentId: 'general-learning' },
                        ],
                        parentId: null,
                    },
                    {
                        id: 'general-tools',
                        name: 'Công cụ',
                        children: [
                            { id: 'general-development', name: 'Phát triển', children: [], parentId: 'general-tools' },
                            { id: 'general-design', name: 'Thiết kế', children: [], parentId: 'general-tools' },
                            { id: 'general-productivity', name: 'Năng suất', children: [], parentId: 'general-tools' },
                        ],
                        parentId: null,
                    },
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isDefault: true,
                customPrompt: "General organizer mode. Balance the categorization across Tech, Learning and Tools.",
                tagDrivenPrompt: "Identify broad tags and distribute them across the three main pillars: Tech, Learning, and Tools."
            },
        ];

        await Promise.all(defaultTemplates.map(template => db.saveFolderTemplate(template)));
        setFolderTemplates(defaultTemplates);
    }, []);

    const initializeDefaultAIProfiles = useCallback(async () => {
        const defaultProfiles: AIProfile[] = [
            {
                id: 'profile-default',
                name: 'Cơ bản (Khuyên dùng)',
                isDefault: true,
                systemInstruction: 'You are an intelligent bookmark organizer. Categorize bookmarks into a clean, hierarchical folder structure in VIETNAMESE.',
                temperature: 0.2,
                topK: 40,
                topP: 0.95,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            {
                id: 'profile-creative',
                name: 'Sáng tạo (Thư mục mới)',
                isDefault: true,
                systemInstruction: 'You are an intelligent bookmark organizer. You are encouraged to create new and creative folder categories based on the content of the bookmarks.',
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                presencePenalty: 0.1,
                frequencyPenalty: 0.1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            {
                id: 'profile-strict',
                name: 'Nghiêm ngặt (Gộp nhóm)',
                isDefault: true,
                systemInstruction: 'You are a strict taxonomy organizer. Do NOT create new folders unless absolutely necessary. Consolidate bookmarks into the most suitable existing folders.',
                temperature: 0.0,
                topK: 1,
                topP: 0.1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }
        ];

        await Promise.all(defaultProfiles.map(profile => db.saveAIProfile(profile)));
        setAiProfiles(defaultProfiles);
    }, []);

    const loadData = useCallback(async () => {
        await perfMonitor.timeAsyncFunction('app_load_data', async () => {
            setIsLoading(true);
            const savedFolders = await db.getFolders();
            const savedBookmarks = await db.getBookmarks();
            const savedApiConfigs = await db.getApiConfigs();
            const savedInstructionPresets = await db.getInstructionPresets();
            const savedFolderTemplates = await db.getFolderTemplates();
            const savedUserCorrections = await db.getUserCorrections();
            const savedAIProfiles = await db.getAIProfiles();

            setApiConfigs(savedApiConfigs || []);
            setInstructionPresets(savedInstructionPresets || []);
            setFolderTemplates(savedFolderTemplates || []);
            setUserCorrections(savedUserCorrections || []);
            setAiProfiles(savedAIProfiles || []);

            // Initialize default templates if none exist
            if (!savedFolderTemplates || savedFolderTemplates.length === 0) {
                await initializeDefaultTemplates();
            }

            if (!savedAIProfiles || savedAIProfiles.length === 0) {
                await initializeDefaultAIProfiles();
            }

            // Initialize backup scheduler
            await backupScheduler.initialize();

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
                await db.saveBookmarks(mockBookmarks);
                setBookmarks(mockBookmarks);
                setAppState(AppState.LOADED);
            }
            setIsLoading(false);
        });
    }, [initializeDefaultTemplates, initializeDefaultAIProfiles]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleClearData = useCallback(async () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu bookmarks không? Hành động này không thể hoàn tác.')) {
            await db.clearAllData();
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
        await db.saveBookmarks(updatedBookmarks);

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
        await db.saveFolders(finalTree);

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
        await db.saveUserCorrection(correction);

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
