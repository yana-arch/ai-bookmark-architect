import { useState, useEffect, useCallback } from 'react';
import * as db from '../db';
import { perfMonitor } from '../src/performance';
import { backupScheduler } from '../src/services/backupScheduler';
import { createMockData } from '../src/utils';
import { AppState, Bookmark, Folder, ApiConfig, InstructionPreset, FolderTemplate, UserCorrection } from '../types';

export const useAppData = () => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [folders, setFolders] = useState<(Folder | Bookmark)[]>([]);
    const [appState, setAppState] = useState<AppState>(AppState.EMPTY);
    const [isLoading, setIsLoading] = useState(true);
    const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
    const [instructionPresets, setInstructionPresets] = useState<InstructionPreset[]>([]);
    const [folderTemplates, setFolderTemplates] = useState<FolderTemplate[]>([]);
    const [userCorrections, setUserCorrections] = useState<UserCorrection[]>([]);
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
            },
        ];

        await Promise.all(defaultTemplates.map(template => db.saveFolderTemplate(template)));
        setFolderTemplates(defaultTemplates);
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

            setApiConfigs(savedApiConfigs || []);
            setInstructionPresets(savedInstructionPresets || []);
            setFolderTemplates(savedFolderTemplates || []);
            setUserCorrections(savedUserCorrections || []);

            // Initialize default templates if none exist
            if (!savedFolderTemplates || savedFolderTemplates.length === 0) {
                await initializeDefaultTemplates();
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
    }, [initializeDefaultTemplates]);

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
        notifications,
        setNotifications,
        handleClearData,
        refreshData
    };
};
