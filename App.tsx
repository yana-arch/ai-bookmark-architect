import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense, useReducer } from 'react';

import { AILogoIcon, ChartIcon, UploadIcon, ImportIcon } from './components/Icons';
// Fix: Consolidate type imports into a single statement.
import { AppState, BrokenLinkCheckState, type Bookmark, type Folder, type CategorizedBookmark, type ApiConfig, type DetailedLog, ApiKeyStatus, type DuplicateStats, type InstructionPreset, type FolderTemplate, type TemplateSettings, type FolderCreationMode, type UserCorrection, type SmartClassifyRule } from './types';
import Sidebar from './components/Sidebar';
import BookmarkList from './components/BookmarkList';
import RestructurePanel from './components/RestructurePanel';
import FileDropzone from './components/FileDropzone';
import * as db from './db';
import { saveLog, getUserCorrections } from './db';
import { searchCache, cacheKeys, generateHash, cacheStats } from './src/cache';
import { formatNumber, parseCSVBookmarks, parseHTMLBookmarks, exportBookmarksToCSV, normalizeURL } from './src/utils';
import { backupScheduler } from './src/services/backupScheduler';
import { perfMonitor } from './src/performance';

// Lazy load modals for better performance
const ImportModal = lazy(() => import('./components/ImportModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));
const ApiConfigModal = lazy(() => import('./components/ApiConfigModal'));
const LogModal = lazy(() => import('./components/LogModal'));
const DuplicateModal = lazy(() => import('./components/DuplicateModal'));
const BrokenLinkModal = lazy(() => import('./components/BrokenLinkModal'));
const InstructionPresetModal = lazy(() => import('./components/InstructionPresetModal'));
const FolderTemplateModal = lazy(() => import('./components/FolderTemplateModal'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const KeyInputModal = lazy(() => import('./components/KeyInputModal'));
const NotificationToast = lazy(() => import('./components/NotificationToast'));
const AIConfigSettingsModal = lazy(() => import('./components/AIConfigSettingsModal'));

const createMockData = (): Bookmark[] => {
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

const DEFAULT_SYSTEM_PROMPT = `You are an intelligent bookmark organizer. Your goal is to create a clean, hierarchical folder structure in VIETNAMESE. You will be given an *existing folder structure* and a *new list of bookmarks*. For each bookmark, you must:
1. Place it into the most logical folder path. **CRITICALLY IMPORTANT: If a suitable folder already exists, use it.** Do not create new folders that are synonyms or slight variations of existing ones. Consolidate them.
2. **FOLDER NAMING RULES:** Avoid creating folders with similar names that differ only by letters (e.g., don't create both "React" and "ReactJS", or "Web Dev" and "WebDev"). Use the most appropriate existing folder.
3. **EXISTING STRUCTURE PRIORITY:** Always prefer using existing folders over creating new ones. The existing structure should be respected and utilized.
4. Generate 3-5 relevant, concise, VIETNAMESE tags for the bookmark.`;

const DEFAULT_PLANNING_PROMPT = `You are a professional librarian and information architect. Your task is to design a clean, hierarchical folder structure based on the provided list of tags or sample URLs. 
- Use Vietnamese for folder names.
- Maximum depth: 3 levels.
- **CRITICAL:** Do not wrap everything in a single "Root" or "General" (Tổng hợp) folder. Provide the main categories directly at the top level of the array.
- Output ONLY a JSON array of folder objects. Each folder object must have: "id" (string), "name" (string), "children" (array of folder objects), and "parentId" (string or null).
- Do not include individual bookmarks in this output, only the folder skeleton.`;


const App: React.FC = () => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [folders, setFolders] = useState<(Folder | Bookmark)[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
    const [appState, setAppState] = useState<AppState>(AppState.EMPTY);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState<string[]>([]);
    const [detailedLogs, setDetailedLogs] = useState<DetailedLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFileName, setImportFileName] = useState<string>('');
    const [previewBookmarks, setPreviewBookmarks] = useState<Bookmark[]>([]);
    const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'info' | 'error' | 'success' | 'warning', duration?: number, action?: { label: string, onClick: () => void } }[]>([]);
    const [userCorrections, setUserCorrections] = useState<UserCorrection[]>([]);
    const [customInstructions, setCustomInstructions] = useState<string>('');
    const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
    const [planningPrompt, setPlanningPrompt] = useState<string>(DEFAULT_PLANNING_PROMPT);
    const [sessionTokenUsage, setSessionTokenUsage] = useState({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    const [batchSize, setBatchSize] = useState(5);
    const [maxRetries, setMaxRetries] = useState(2);
    const [processingMode, setProcessingMode] = useState<'single' | 'multi'>('multi');
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [isBrokenLinkModalOpen, setIsBrokenLinkModalOpen] = useState(false);
    const [isInstructionPresetModalOpen, setIsInstructionPresetModalOpen] = useState(false);
    const [isFolderTemplateModalOpen, setIsFolderTemplateModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
    const [isKeyInputModalOpen, setIsKeyInputModalOpen] = useState(false);
    const [isAIConfigModalOpen, setIsAIConfigModalOpen] = useState(false);
    const [keyInputMode, setKeyInputMode] = useState<'upload' | 'import'>('upload');
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [instructionPresets, setInstructionPresets] = useState<InstructionPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [folderTemplates, setFolderTemplates] = useState<FolderTemplate[]>([]);
    const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
        folderCreationMode: 'hybrid',
        selectedTemplateId: null,
        allowAiFolderCreation: true,
        strictMode: false,
    });
    const [duplicateStats, setDuplicateStats] = useState<DuplicateStats>({ count: 0, byHost: {} });
    const [brokenLinks, setBrokenLinks] = useState<Bookmark[]>([]);
    const [brokenLinkCheckState, setBrokenLinkCheckState] = useState<BrokenLinkCheckState>(BrokenLinkCheckState.IDLE);
    const [brokenLinkCheckProgress, setBrokenLinkCheckProgress] = useState({ current: 0, total: 0 });
    const [allCategorizedBookmarks, setAllCategorizedBookmarks] = useState<CategorizedBookmark[]>([]);
    const [proposedStructure, setProposedStructure] = useState<(Folder | Bookmark)[]>([]);
    const [smartClassifyRules, setSmartClassifyRules] = useState<SmartClassifyRule[]>([]);
    const [sessionRules, setSessionRules] = useState<SmartClassifyRule[]>([]);
    const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const importInputRef = useRef<HTMLInputElement>(null);
    const stopProcessingRef = useRef(false);
    const workersRef = useRef<Worker[]>([]);
    const activeWorkersRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        const loadData = async () => {
            await perfMonitor.timeAsyncFunction('app_load_data', async () => {
                setIsLoading(true);
            const savedFolders = await db.getFolders();
            const savedBookmarks = await db.getBookmarks();
            const savedApiConfigs = await db.getApiConfigs();
            const savedInstructionPresets = await db.getInstructionPresets();
            const savedFolderTemplates = await db.getFolderTemplates();
            const savedUserCorrections = await db.getUserCorrections();
            const savedSmartRules = await db.getSmartClassifyRules();

            setApiConfigs(savedApiConfigs || []);
            setSmartClassifyRules(savedSmartRules || []);
            setInstructionPresets(savedInstructionPresets || []);
            setFolderTemplates(savedFolderTemplates || []);
            setUserCorrections(savedUserCorrections || []);

            // Initialize default templates if none exist
            if (savedFolderTemplates.length === 0) {
                await initializeDefaultTemplates();
            }

            // Initialize backup scheduler
            await backupScheduler.initialize();

            if (savedFolders && savedFolders.length > 0) {
                setFolders(savedFolders);
                setBookmarks(savedBookmarks);
                setAppState(AppState.STRUCTURED);
                setSelectedFolderId('root');
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
        };
        loadData();
    }, []);

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
    
    const handleFileLoaded = useCallback(async (fileName: string, loadedBookmarks: Bookmark[]) => {
        setImportFileName(fileName);
        setPreviewBookmarks(loadedBookmarks);
        setShowImportModal(true);
    }, []);
    
    const handleSaveApiConfig = useCallback(async (config: ApiConfig) => {
        await db.saveApiConfig(config);
        setApiConfigs(prev => {
            const existingIndex = prev.findIndex(c => c.id === config.id);
            if (existingIndex > -1) {
                const newConfigs = [...prev];
                newConfigs[existingIndex] = config;
                return newConfigs;
            }
            return [...prev, config];
        });
    }, []);

    const handleDeleteApiConfig = useCallback(async (id: string) => {
        await db.deleteApiConfig(id);
        setApiConfigs(prev => prev.filter(c => c.id !== id));
    }, []);

    const handleToggleApiConfigStatus = useCallback(async (id: string, status: ApiKeyStatus) => {
        const config = apiConfigs.find(c => c.id === id);
        if (config) {
            await handleSaveApiConfig({ ...config, status });
        }
    }, [apiConfigs, handleSaveApiConfig]);

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
    }, [bookmarks, appState]);

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
    }, [brokenLinkCheckState, bookmarks.length]);

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
    }, [brokenLinks, bookmarks, appState]);

    const arrayToTree = useCallback((bookmarks: (Bookmark & { path?: string[] })[], existingTree: (Folder | Bookmark)[] = []): (Folder | Bookmark)[] => {
        const root: Folder = { id: 'root', name: 'Thư Mục', children: [], parentId: null };
        const foldersMap = new Map<string, Folder>();
        foldersMap.set('root', root);

        // Helper to add existing folders to the map
        const mapExistingFolders = (nodes: (Folder | Bookmark)[]) => {
            nodes.forEach(node => {
                if (!('url' in node)) {
                    foldersMap.set(node.id, node as Folder);
                    // Clear children but keep the folder
                    (node as Folder).children = [];
                    if (node.parentId === null) {
                        root.children.push(node);
                    }
                    if ((node as Folder).children) {
                        mapExistingFolders((node as Folder).children);
                    }
                }
            });
        };

        // Note: The simple mapExistingFolders above is a bit flawed for deep nested structures.
        // Let's use a cleaner approach that clones the existing structure first.
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
    }, []);
    
    const handleStopRestructuring = () => {
        stopProcessingRef.current = true;
    };



    // Helper function to add detailed logs - defined here so it can be used by force stop
    const addDetailedLog = async (type: DetailedLog['type'], title: string, content: string | object, usage?: DetailedLog['usage']) => {
        const newLog: DetailedLog = {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString('en-GB'),
            type,
            title,
            content,
            usage
        };
        setDetailedLogs(prev => [...prev, newLog]);
        await saveLog(newLog); // Save to IndexedDB

        // Trigger real-time notification for certain types of logs
        if (type === 'error' || (type === 'info' && title.includes('Hoàn tất'))) {
            setNotifications(prev => [...prev, { id: newLog.id, message: `${newLog.title}: ${typeof newLog.content === 'string' ? newLog.content.substring(0, 100) : ''}...`, type: newLog.type === 'error' ? 'error' : 'success' }]);
        }
    };

    const handleForceStopRestructuring = useCallback(() => {
        // Immediately terminate all workers
        workersRef.current.forEach(worker => {
            worker.terminate();
        });
        workersRef.current = [];
        activeWorkersRef.current.clear();

        // Set stop flag and transition to error state
        stopProcessingRef.current = true;

        // Add force stop log
        addDetailedLog('info', 'Force stop initiated', 'All workers terminated immediately');

        setLogs(prev => [...prev, 'Đã dừng xử lý bắt buộc - tất cả worker đã bị terminate']);
        setErrorDetails('Xử lý đã được dừng bắt buộc. Bạn có thể áp dụng kết quả đã xử lý hoặc bắt đầu lại.');
        setAppState(AppState.ERROR);
    }, []);

    const handleDismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const generateStructureSuggestion = async (source: 'tags' | 'domains') => {
        setIsGeneratingStructure(true);
        setAppState(AppState.PLANNING);
        setLogs(prev => [...prev, `Đang phân tích ${source === 'tags' ? 'tag' : 'link gốc'} để gợi ý cấu trúc...`]);

        try {
            const availableKeys = apiConfigs.filter(c => c.status === 'active');
            if (availableKeys.length === 0) throw new Error("Chưa có API key hoạt động.");

            let inputData = '';
            if (source === 'tags') {
                const allTags = new Set<string>();
                bookmarks.forEach(bm => bm.tags?.forEach(tag => allTags.add(tag)));
                inputData = Array.from(allTags).join(', ');
            } else {
                const domains = new Set<string>();
                bookmarks.forEach(bm => domains.add(normalizeURL(bm.url)));
                inputData = Array.from(domains).slice(0, 100).join('\n'); // Limit to first 100 unique links for context
            }

            const userPrompt = `Dựa trên danh sách ${source === 'tags' ? 'tag' : 'link'} sau đây, hãy tạo một cấu trúc thư mục logic:\n\n${inputData}`;

            // We'll reuse the aiWorker but with a special message type or just a direct fetch for simplicity if we want to wait
            // For now, let's use a temporary worker or direct call to keep it clean
            const currentKey = availableKeys[0]; // Use first active key
            
            // To avoid complex worker management for a single call, we'll use a simplified version of the worker logic here
            const result = await fetch(currentKey.provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : currentKey.apiUrl || '', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentKey.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: currentKey.model,
                    messages: [
                        { role: 'system', content: planningPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!result.ok) throw new Error("API call failed");
            const data = await result.json();
            const content = data.choices[0].message.content;
            
            // Parse response - assuming the AI returns { "folders": [...] } or similar
            let parsed;
            try {
                const rawParsed = JSON.parse(content);
                parsed = rawParsed.folders || rawParsed;
            } catch (e) {
                // Fallback to regex if JSON is slightly malformed
                const match = content.match(/\[\s*{[\s\S]*}\s*\]/);
                if (match) parsed = JSON.parse(match[0]);
                else throw new Error("Could not parse AI response");
            }

            // Flatten logic: If AI returned a single root folder that wraps everything, promote its children
            if (Array.isArray(parsed) && parsed.length === 1 && parsed[0].children && parsed[0].children.length > 0) {
                const rootName = parsed[0].name.toLowerCase();
                if (rootName === 'root' || rootName === 'tổng hợp' || rootName === 'bookmarks' || rootName === 'thư mục') {
                    setLogs(prev => [...prev, `Đã tự động loại bỏ thư mục gốc dư thừa: "${parsed[0].name}"`]);
                    parsed = parsed[0].children.map((c: any) => ({ ...c, parentId: null }));
                }
            }

            setProposedStructure(parsed);
            setLogs(prev => [...prev, "Đã tạo cấu trúc gợi ý thành công."]);
        } catch (error: any) {
            setLogs(prev => [...prev, `Lỗi: ${error.message}`]);
            setErrorDetails(`Không thể tạo gợi ý cấu trúc: ${error.message}`);
        } finally {
            setIsGeneratingStructure(false);
        }
    };

    const handleSaveSmartRule = useCallback(async (rule: SmartClassifyRule) => {
        await db.saveSmartClassifyRule(rule);
        setSmartClassifyRules(prev => {
            const existingIndex = prev.findIndex(r => r.id === rule.id);
            if (existingIndex > -1) {
                const newRules = [...prev];
                newRules[existingIndex] = rule;
                return newRules;
            }
            return [...prev, rule];
        });
    }, []);

    const handleDeleteSmartRule = useCallback(async (id: string) => {
        await db.deleteSmartClassifyRule(id);
        setSmartClassifyRules(prev => prev.filter(r => r.id !== id));
    }, []);

    const applySmartClassify = useCallback((bookmarksToProcess: Bookmark[], rules: SmartClassifyRule[]): { classified: CategorizedBookmark[], remaining: Bookmark[] } => {
        const classified: CategorizedBookmark[] = [];
        const remaining: Bookmark[] = [];
        const activeRules = rules.filter(r => r.enabled);

        bookmarksToProcess.forEach(bm => {
            let matched = false;
            for (const rule of activeRules) {
                if (rule.type === 'tag') {
                    if (bm.tags?.some(tag => tag.toLowerCase().includes(rule.pattern.toLowerCase()))) {
                        classified.push({ ...bm, path: rule.targetPath, tags: bm.tags || [] } as CategorizedBookmark);
                        matched = true;
                        break;
                    }
                } else if (rule.type === 'link') {
                    if (bm.url.toLowerCase().includes(rule.pattern.toLowerCase())) {
                        classified.push({ ...bm, path: rule.targetPath, tags: bm.tags || [] } as CategorizedBookmark);
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) remaining.push(bm);
        });

        return { classified, remaining };
    }, []);

    const getStructureGuide = useCallback((nodes: any[], path: string[] = []): string[] => {
        let list: string[] = [];
        nodes.forEach(node => {
            if (!('url' in node)) {
                const currentPath = [...path, node.name];
                list.push(currentPath.join(' -> '));
                if (node.children) {
                    list = list.concat(getStructureGuide(node.children, currentPath));
                }
            }
        });
        return list;
    }, []);

    const confirmProposedStructure = async () => {
        setFolders(proposedStructure);
        await db.saveFolders(proposedStructure);
        
        // Feed the confirmed structure into the system prompt as a rigid guide
        const availableFolders = getStructureGuide(proposedStructure);
        const folderGuide = availableFolders.map((folder, index) => `${index + 1}. ${folder}`).join('\n');
        
        const planningGuideline = `\n\n**PLANNED STRUCTURE (Prioritize these folders):**\n${folderGuide}\n\n**STRICT CATEGORIZATION RULES:**\n1. Use the folders listed above whenever possible.\n2. If a bookmark has a tag matching one of these folders, put it there.\n3. Only create a NEW folder if the bookmark absolutely does not fit into any of the planned categories.`;
        
        setSystemPrompt(prev => prev + planningGuideline);

        // Apply session rules immediately
        if (sessionRules.length > 0) {
            const { classified } = applySmartClassify(bookmarks, sessionRules);
            if (classified.length > 0) {
                setAllCategorizedBookmarks(prev => [...prev, ...classified]);
                setLogs(prev => [...prev, `Smart Classify: Đã tự động phân loại ${classified.length} bookmark theo quy tắc tùy chỉnh.`]);
            }
        }

        setAppState(AppState.STRUCTURED);
        setProposedStructure([]);
        setSessionRules([]);
        setNotifications(prev => [...prev, { id: 'confirm-struct', message: 'Đã áp dụng cấu trúc và quy tắc mới. AI đã được cập nhật chỉ dẫn theo sơ đồ này.', type: 'success' }]);
    };

    const startRestructuring = async (isContinuation = false) => {
        await perfMonitor.timeAsyncFunction('start_restructuring', async () => {
            // Apply Smart Classify rules before AI processing
            const { classified, remaining } = applySmartClassify(bookmarks, [...smartClassifyRules, ...sessionRules]);
            
            if (!isContinuation && classified.length > 0) {
                setAllCategorizedBookmarks(classified);
                setLogs(prev => [...prev, `Smart Classify: Đã tự động phân loại ${classified.length} bookmark.`]);
            }

            const addDetailedLog = async (type: DetailedLog['type'], title: string, content: string | object, usage?: DetailedLog['usage']) => {
            const newLog: DetailedLog = {
                id: `log-${Date.now()}-${Math.random()}`,
                timestamp: new Date().toLocaleTimeString('en-GB'),
                type,
                title,
                content,
                usage
            };
            setDetailedLogs(prev => [...prev, newLog]);
            await saveLog(newLog); // Save to IndexedDB

            // Trigger real-time notification for certain types of logs
            if (type === 'error' || (type === 'info' && title.includes('Hoàn tất'))) {
                setNotifications(prev => [...prev, { id: newLog.id, message: `${newLog.title}: ${typeof newLog.content === 'string' ? newLog.content.substring(0, 100) : ''}...`, type: newLog.type === 'error' ? 'error' : 'success' }]);
            }
        };

        if (!isContinuation) {
            stopProcessingRef.current = false;
            setAllCategorizedBookmarks([]);
            setDetailedLogs([]);
            setLogs(['Bắt đầu quá trình tái cấu trúc đa luồng...']);
            setSessionTokenUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
            addDetailedLog('info', 'Bắt đầu quá trình đa luồng', `Tổng số bookmarks: ${bookmarks.length}, Cỡ batch: ${batchSize}, Thử lại tối đa: ${maxRetries}`);
        } else {
            setLogs(prev => [...prev, '--- TIẾP TỤC QUÁ TRÌNH ---']);
            addDetailedLog('info', 'Tiếp tục quá trình', `Tiếp tục từ bookmark thứ ${allCategorizedBookmarks.length + 1}`);
        }

        const availableKeys = apiConfigs.filter(c => c.status === 'active');
        if (availableKeys.length === 0) {
            setErrorDetails("Không có API key nào đang hoạt động. Vui lòng thêm hoặc kích hoạt một key hợp lệ.");
            setLogs(prev => [...prev, "Lỗi: Không tìm thấy API key đang hoạt động."]);
            addDetailedLog('error', "Không tìm thấy API key", "Không có API key nào được cấu hình hoặc đang hoạt động.");
            setAppState(AppState.ERROR);
            return;
        }

        setAppState(AppState.PROCESSING);
        setProgress({ current: allCategorizedBookmarks.length, total: bookmarks.length });
        setErrorDetails(null);

        const bookmarksToProcess = isContinuation 
            ? bookmarks.slice(allCategorizedBookmarks.length)
            : remaining;
        const BATCH_SIZE = Math.max(1, batchSize);
        const totalBatches = Math.ceil(bookmarksToProcess.length / BATCH_SIZE);
        // Use 1 worker for single mode, up to 3 for multi mode
        const MAX_CONCURRENT_WORKERS = processingMode === 'single' ? 1 : 3;

        let runningCategorizedBookmarks = [...allCategorizedBookmarks];
        let completedBatches = 0;
        let failedBatches = 0;
        let nextBatchToStart = 0;
        const batchResults: { [key: number]: CategorizedBookmark[] } = {};
        const userInstructionBlock = customInstructions.trim()
            ? `\n\nUSER'S CUSTOM INSTRUCTIONS (Follow these strictly):\n- ${customInstructions.trim().replace(/\n/g, '\n- ')}`
            : '';

        // Initialize workers
        const initializeWorkers = () => {
            for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
                const worker = new Worker(new URL('./src/aiWorker.ts', import.meta.url), { type: 'module' });
                workersRef.current.push(worker);

                worker.onmessage = (e) => {
                    const { type, data, error, batchIndex } = e.data;

                    if (type === 'log') {
                        setLogs(prev => [...prev, `[Worker ${batchIndex}] ${data}`]);
                        addDetailedLog('info', `Worker ${batchIndex}`, data);
                    } else if (type === 'batch_result') {
                        // Check if processing was stopped; if so, ignore this result
                        if (stopProcessingRef.current) {
                            activeWorkersRef.current.delete(batchIndex);
                            return; // Discard the result
                        }

                        activeWorkersRef.current.delete(batchIndex);
                        completedBatches++;
                        batchResults[batchIndex] = data.categorizedBatch;

                        // Update token usage
                        if (data.usage) {
                            setSessionTokenUsage(prev => ({
                                promptTokens: prev.promptTokens + (data.usage.promptTokens || 0),
                                completionTokens: prev.completionTokens + (data.usage.completionTokens || 0),
                                totalTokens: prev.totalTokens + (data.usage.totalTokens || 0)
                            }));
                        }

                        // Update progress
                        const currentProgress = allCategorizedBookmarks.length + Object.values(batchResults).flat().length;
                        setProgress({ current: currentProgress, total: bookmarks.length });

                        // Update folders - IMPORTANT: Preserve existing folder structure if we are in PLANNING/STRUCTURED mode
                        const allResults = Object.values(batchResults).flat();
                        const currentFolders = arrayToTree(
                            bookmarks.map(bm => {
                                const categorized = [...runningCategorizedBookmarks, ...allResults].find(cb => cb.url === bm.url);
                                return { ...bm, path: categorized?.path || [], tags: categorized?.tags || [] };
                            }),
                            folders // Pass existing folders to preserve structure
                        );
                        setFolders(currentFolders);

                        // Check if all batches are done
                        if (completedBatches + failedBatches >= totalBatches) {
                            finalizeProcessing();
                        } else {
                            // Start next batch
                            startNextBatch();
                        }
                    } else if (type === 'batch_error') {
                        // Check if processing was stopped; if so, ignore this error
                        if (stopProcessingRef.current) {
                            activeWorkersRef.current.delete(batchIndex);
                            return; // Discard the error
                        }

                        activeWorkersRef.current.delete(batchIndex);
                        failedBatches++;
                        setLogs(prev => [...prev, `[Worker ${batchIndex}] Lỗi: ${error}`]);
                        addDetailedLog('error', `Worker ${batchIndex} thất bại`, error);

                        // Check if all batches are done
                        if (completedBatches + failedBatches >= totalBatches) {
                            finalizeProcessing();
                        } else {
                            // Start next batch
                            startNextBatch();
                        }
                    } else if (type === 'detailed_log') {
                        // Handle detailed logs from worker
                        addDetailedLog(data.type, data.title, data.content, data.usage);
                    }
                };

                worker.onerror = (error) => {
                    console.error('Worker error:', error);
                    setLogs(prev => [...prev, `Lỗi worker: ${error.message}`]);
                };
            }
        };



        const startNextBatch = () => {
            if (stopProcessingRef.current) {
                cleanupWorkers();
                const stopMsg = "Quá trình đã được người dùng dừng lại.";
                setLogs(prev => [...prev, stopMsg]);
                addDetailedLog('info', 'Xử lý đã dừng', stopMsg);
                setErrorDetails(stopMsg);
                setAppState(AppState.ERROR);
                return;
            }

            if (nextBatchToStart >= totalBatches) return;

            const batchIndex = nextBatchToStart;
            nextBatchToStart++;

            const batch = bookmarksToProcess.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
            const currentTree = arrayToTree(
                bookmarks.map(bm => {
                    const categorized = [...runningCategorizedBookmarks, ...Object.values(batchResults).flat()].find(cb => cb.url === bm.url);
                    return { ...bm, path: categorized?.path || [], tags: categorized?.tags || [] };
                }),
                folders // Preserve the "baseline" structure
            );

            // Find available worker
            const availableWorker = workersRef.current.find((_, index) => !activeWorkersRef.current.has(index));
            if (availableWorker) {
                activeWorkersRef.current.add(batchIndex);
                availableWorker.postMessage({
                    type: 'process_batch',
                    data: {
                        batch,
                        apiConfigs: availableKeys,
                        systemPrompt,
                        userInstructionBlock,
                        currentTree,
                        batchIndex,
                        maxRetries,
                        userHistory: userCorrections,
                        domainKnowledge: ""
                    }
                });
            }
        };

        const finalizeProcessing = () => {
            cleanupWorkers();

            const allResults = Object.values(batchResults).flat();
            runningCategorizedBookmarks.push(...allResults);
            setAllCategorizedBookmarks(runningCategorizedBookmarks);

            if (failedBatches > 0) {
                const errorMsg = `${failedBatches} batch thất bại. Bạn có thể thử lại với các key khác.`;
                setLogs(prev => [...prev, errorMsg]);
                addDetailedLog('error', 'Một số batch thất bại', errorMsg);
                setErrorDetails(errorMsg);
                setAppState(AppState.ERROR);
            } else {
                setAppState(AppState.REVIEW);
                const successMsg = 'Tái cấu trúc đa luồng hoàn tất! Xem lại các thay đổi.';
                setLogs(prev => [...prev, successMsg]);
                addDetailedLog('info', 'Hoàn tất', successMsg);
            }
        };

        const cleanupWorkers = () => {
            workersRef.current.forEach(worker => {
                worker.postMessage({ type: 'cancel' });
                worker.terminate();
            });
            workersRef.current = [];
            activeWorkersRef.current.clear();
        };

            initializeWorkers();
            for (let i = 0; i < Math.min(MAX_CONCURRENT_WORKERS, totalBatches); i++) {
                startNextBatch();
            }
        });
    };
    
    const applyChanges = async () => {
       await perfMonitor.timeAsyncFunction('apply_changes', async () => {
           const finalBookmarks = bookmarks.map(bm => {
           const categorized = allCategorizedBookmarks.find(cb => cb.url === bm.url);
           return { ...bm, ...categorized }; // merge path and tags
       });
       await db.saveBookmarks(finalBookmarks);
       await db.saveFolders(folders);
       setBookmarks(finalBookmarks);
       setAppState(AppState.STRUCTURED);
       setLogs([]);
       setProgress({current: 0, total: 0});
           setSelectedFolderId('root');
           setAllCategorizedBookmarks([]);
       });
    };

    const discardChanges = () => {
        setFolders([]);
        setAppState(AppState.LOADED);
        setLogs([]);
        setDetailedLogs([]);
        setProgress({current: 0, total: 0});
        setErrorDetails(null);
        setAllCategorizedBookmarks([]);
        setSessionTokenUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    };
    
    const continueRestructuring = () => {
        startRestructuring(true);
    };

    const handleClearData = useCallback(async () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa tất cả dữ liệu bookmarks không? Hành động này không thể hoàn tác.")) {
            await db.clearAllData();
            setBookmarks([]);
            setFolders([]);
            setAppState(AppState.EMPTY);
        }
    }, []);

    const handleImportClick = useCallback(() => {
        // Create a hidden file input to trigger file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.csv';
        input.multiple = false;
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target?.result as string;
                    if (content) {
                        try {
                            let parsedBookmarks: Bookmark[] = [];
                            if (file.name.endsWith('.html')) {
                                parsedBookmarks = parseHTMLBookmarks(content);
                            } else if (file.name.endsWith('.csv')) {
                                parsedBookmarks = parseCSVBookmarks(content);
                            }
                            handleFileLoaded(file.name, parsedBookmarks);
                        } catch (error: any) {
                            alert(`Lỗi khi đọc file: ${error.message}`);
                        }
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }, [handleFileLoaded]);

    const processImport = useCallback(async (mode: 'merge' | 'overwrite') => {
        if (previewBookmarks.length === 0) return;
        await perfMonitor.timeAsyncFunction('process_import', async () => {

        let combinedBookmarks: Bookmark[] = [];
        if (mode === 'merge') {
            const urlMap = new Map(bookmarks.map(bm => [normalizeURL(bm.url), bm]));
            
            // For merge, we want to add new bookmarks AND potentially update existing ones if the new ones have tags
            const newBookmarks = previewBookmarks.filter(bm => !urlMap.has(normalizeURL(bm.url)));
            const existingToUpdate = previewBookmarks.filter(bm => urlMap.has(normalizeURL(bm.url)));
            
            // Create a copy of existing bookmarks
            const updatedExisting = bookmarks.map(bm => {
                const normalizedUrl = normalizeURL(bm.url);
                const newInfo = existingToUpdate.find(ni => normalizeURL(ni.url) === normalizedUrl);
                if (newInfo && newInfo.tags && newInfo.tags.length > 0) {
                    // Update existing bookmark with new tags if it doesn't have any or merge them
                    const mergedTags = Array.from(new Set([...(bm.tags || []), ...newInfo.tags]));
                    return { ...bm, tags: mergedTags };
                }
                return bm;
            });

            combinedBookmarks = [...updatedExisting, ...newBookmarks];
        } else { // overwrite
            combinedBookmarks = previewBookmarks;
        }

        await db.saveBookmarks(combinedBookmarks);
        await db.saveFolders([]); // Clear structure on any import
        setBookmarks(combinedBookmarks);
        setFolders([]);
        setSelectedFolderId('root');
        setAppState(AppState.LOADED);
        setShowImportModal(false);
            setImportFileName('');
            setPreviewBookmarks([]);
        });
    }, [previewBookmarks, bookmarks]);

    const handleExportBookmarks = useCallback(async (options: any) => {
        await perfMonitor.timeAsyncFunction('export_bookmarks', async () => {
            // Filter bookmarks based on options
        let filteredBookmarks = bookmarks;

        // Filter by folders
        if (options.selectedFolders && options.selectedFolders.length > 0) {
            // Create a function to recursively get all bookmark IDs in selected folders
            const getBookmarksInSelectedFolders = (folderItems: (Folder | Bookmark)[], selectedFolderIds: string[], collectedBookmarkIds: Set<string> = new Set()): Set<string> => {
                folderItems.forEach(item => {
                    if ('children' in item) {
                        // Check if this folder or any of its path matches selected folders
                        const isSelected = selectedFolderIds.some(selectedId => {
                            // Check if the folder ID matches or if it's part of the path
                            return item.id === selectedId || selectedId.includes(item.id);
                        });

                        if (isSelected) {
                            // Add all bookmarks in this folder and subfolders
                            const collectBookmarks = (folder: Folder) => {
                                folder.children.forEach(child => {
                                    if ('url' in child) {
                                        collectedBookmarkIds.add(child.id);
                                    } else {
                                        collectBookmarks(child);
                                    }
                                });
                            };
                            collectBookmarks(item);
                        } else {
                            // Recursively check children
                            getBookmarksInSelectedFolders(item.children, selectedFolderIds, collectedBookmarkIds);
                        }
                    }
                });
                return collectedBookmarkIds;
            };

            const selectedBookmarkIds = getBookmarksInSelectedFolders(folders, options.selectedFolders);
            filteredBookmarks = filteredBookmarks.filter(bm => selectedBookmarkIds.has(bm.id));
        }

        // Filter by tags
        if (options.selectedTags && options.selectedTags.length > 0) {
            filteredBookmarks = filteredBookmarks.filter(bm =>
                options.selectedTags.some((tag: string) => bm.tags?.includes(tag))
            );
        }

        // Filter by date range (not implemented yet)
        if (options.dateRange && (options.dateRange.from || options.dateRange.to)) {
            // TODO: Implement date filtering when date fields are added to bookmarks
            filteredBookmarks = filteredBookmarks;
        }

        // Build export content based on format
        let content: string;
        let mimeType: string;
        let fileName: string;

        if (options.format === 'html') {
            const buildHtml = (items: (Folder | Bookmark)[], level: number): string => {
                let html = '';
                const indent = ' '.repeat(level * 4);

                items.forEach(item => {
                    if ('url' in item) { // It's a bookmark
                        const tagsAttribute = item.tags && item.tags.length > 0 ? ` TAGS="${item.tags.join(',')}"` : '';
                        html += `${indent}<DT><A HREF="${item.url}"${tagsAttribute}>${item.title}</A>\n`;
                    } else { // It's a folder
                        html += `${indent}<DT><H3>${item.name}</H3>\n`;
                        if (item.children && item.children.length > 0) {
                            html += `${indent}<DL><p>\n`;
                            html += buildHtml(item.children, level + 1);
                            html += `${indent}</DL><p>\n`;
                        }
                    }
                });
                return html;
            };

            // Create folder structure from filtered bookmarks
            const filteredFolders = folders.length > 0 ? folders : [];
            const bookmarksHtml = buildHtml(filteredFolders, 1);
            content = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${bookmarksHtml}</DL><p>`;
            mimeType = 'text/html';
            fileName = 'bookmarks_export.html';
        } else if (options.format === 'csv') {
            content = exportBookmarksToCSV(filteredBookmarks);
            mimeType = 'text/csv';
            fileName = 'bookmarks_export.csv';
        } else if (options.format === 'json') {
            content = JSON.stringify(filteredBookmarks, null, 2);
            mimeType = 'application/json';
            fileName = 'bookmarks_export.json';
        } else if (options.format === 'md') {
            const buildMarkdown = (items: (Folder | Bookmark)[], level: number): string => {
                let md = '';
                items.forEach(item => {
                    if ('url' in item) { // It's a bookmark
                        md += `${'  '.repeat(level)}- [${item.title}](${item.url})`;
                        if (item.tags && item.tags.length > 0) {
                            md += ` (Tags: ${item.tags.join(', ')})`;
                        }
                        md += '\n';
                    } else { // It's a folder
                        md += `${'#'.repeat(level + 1)} ${item.name}\n\n`;
                        if (item.children && item.children.length > 0) {
                            md += buildMarkdown(item.children, level + 1);
                        }
                    }
                });
                return md;
            };

            const filteredFolders = folders.length > 0 ? folders : [];
            content = buildMarkdown(filteredFolders, 0);
            mimeType = 'text/markdown';
            fileName = 'bookmarks_export.md';
        } else {
            throw new Error(`Unsupported export format: ${options.format}`);
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }, [folders, bookmarks]);

    const handleOpenExportModal = useCallback(() => {
        setIsExportModalOpen(true);
    }, []);

    const handleUploadData = useCallback(async (key: string) => {
        await perfMonitor.timeAsyncFunction('upload_data', async () => {
            try {
            const { keyBasedService } = await import('./src/services/postgresqlService');
            const metadata = {
                name: `Backup ${new Date().toLocaleString('vi-VN')}`,
                description: `Manual backup with ${bookmarks.length} bookmarks`,
                bookmarkCount: bookmarks.length,
                folderCount: folders.length,
                type: 'manual' as const,
                size: 0, // Will be calculated by service
                timestamp: Date.now(),
                status: 'completed' as const,
            };

            await keyBasedService.uploadBackup(key, { bookmarks, folders }, metadata, (progress) => {
                setNotifications(prev => [...prev, {
                    id: `upload-progress-${Date.now()}-${Math.random()}`,
                    message: `Upload progress: ${progress}%`,
                    type: 'info'
                }]);
            });

            setNotifications(prev => [...prev, {
                id: `upload-success-${Date.now()}`,
                message: 'Upload thành công! Dữ liệu đã được lưu với key của bạn.',
                type: 'success'
            }]);
        } catch (error: any) {
            setNotifications(prev => [...prev, {
                id: `upload-error-${Date.now()}`,
                message: `Upload thất bại: ${error.message}`,
                type: 'error'
            }]);
                throw error;
            }
        });
    }, [bookmarks, folders]);

    const handleImportData = useCallback(async (key: string) => {
        await perfMonitor.timeAsyncFunction('import_data', async () => {
            try {
            const { keyBasedService } = await import('./src/services/postgresqlService');
            const result = await keyBasedService.downloadBackup(key, (progress) => {
                setNotifications(prev => [...prev, {
                    id: `import-progress-${Date.now()}-${Math.random()}`,
                    message: `Import progress: ${progress}%`,
                    type: 'info'
                }]);
            });

            // Save imported data
            await db.saveBookmarks(result.data.bookmarks);
            await db.saveFolders(result.data.folders);

            // Update state
            setBookmarks(result.data.bookmarks);
            setFolders(result.data.folders);
            setAppState(AppState.STRUCTURED);
            setSelectedFolderId('root');

            setNotifications(prev => [...prev, {
                id: `import-success-${Date.now()}`,
                message: `Import thành công! Đã tải ${result.data.bookmarks.length} bookmarks.`,
                type: 'success'
            }]);
        } catch (error: any) {
            setNotifications(prev => [...prev, {
                id: `import-error-${Date.now()}`,
                message: `Import thất bại: ${error.message}`,
                type: 'error'
            }]);
                throw error;
            }
        });
    }, []);

    // Instruction Preset handlers
    const handleSaveInstructionPreset = useCallback(async (preset: InstructionPreset) => {
        await db.saveInstructionPreset(preset);
        setInstructionPresets(prev => {
            const existingIndex = prev.findIndex(p => p.id === preset.id);
            if (existingIndex > -1) {
                const newPresets = [...prev];
                newPresets[existingIndex] = preset;
                return newPresets;
            }
            return [...prev, preset];
        });
    }, []);

    const handleDeleteInstructionPreset = useCallback(async (id: string) => {
        await db.deleteInstructionPreset(id);
        setInstructionPresets(prev => prev.filter(p => p.id !== id));
        if (selectedPresetId === id) {
            setSelectedPresetId(null);
        }
    }, [selectedPresetId]);

    const handleSelectPreset = useCallback((presetId: string | null) => {
        setSelectedPresetId(presetId);
        if (presetId) {
            const preset = instructionPresets.find(p => p.id === presetId);
            if (preset) {
                // Apply preset to current settings
                setCustomInstructions(preset.customInstructions);
                // You could also update system prompt or other settings here
            }
        }
    }, [instructionPresets]);

    // Folder Template handlers
    const handleSaveFolderTemplate = useCallback(async (template: FolderTemplate) => {
        await db.saveFolderTemplate(template);
        setFolderTemplates(prev => {
            const existingIndex = prev.findIndex(t => t.id === template.id);
            if (existingIndex > -1) {
                const newTemplates = [...prev];
                newTemplates[existingIndex] = template;
                return newTemplates;
            }
            return [...prev, template];
        });
    }, []);

    const handleDeleteFolderTemplate = useCallback(async (id: string) => {
        await db.deleteFolderTemplate(id);
        setFolderTemplates(prev => prev.filter(t => t.id !== id));
    }, []);

    const handleApplyFolderTemplate = useCallback(async (template: FolderTemplate) => {
        setTemplateSettings(prev => ({
            ...prev,
            selectedTemplateId: template.id,
            folderCreationMode: 'template_based'
        }));

        // Update system prompt to use template structure as the FILLED categorization guide
        const flattenTemplateFolders = (node: any, path: string[] = []): string[] => {
            let folders: string[] = [];
            const currentPath = [...path, node.name];
            folders.push(currentPath.join(' -> '));

            if (node.children && node.children.length > 0) {
                node.children.forEach((child: any) => {
                    folders = folders.concat(flattenTemplateFolders(child, currentPath));
                });
            }
            return folders;
        };

        const availableFolders = template.structure.flatMap(node => flattenTemplateFolders(node));
        const folderGuide = availableFolders.map((folder, index) => `${index + 1}. ${folder}`).join('\n');

        const newSystemPrompt = `${DEFAULT_SYSTEM_PROMPT}\n\n**TEMPLATE MODE ACTIVATED - STRICT TEMPLATE FOLLOWING:** You MUST use the selected template "${template.name}" as your ONLY categorization framework. The template has created empty folders that you MUST fill with bookmarks.

**AVAILABLE TEMPLATE FOLDERS (You may ONLY use these - NO NEW FOLDERS ALLOWED):**
${folderGuide}

**STRICT RULES - FOLLOW EXACTLY:**
1. NEVER create new folders - ONLY use the folders listed above.
2. For each bookmark, find the SINGLE BEST MATCHING folder from the template structure.
3. Analyze the bookmark's content and map it directly to the most appropriate template category.
4. If no perfect match exists, choose the closest related category from the template.
5. Template purpose: ${template.description}

**CATEGORIZATION EXAMPLES:**
- React tutorials/docs → Frontend -> React
- Node.js guides → Backend -> Node.js
- Git repositories → Công cụ & Tiện ích -> Version Control
- Python backend code → Backend -> Python`;

        setSystemPrompt(newSystemPrompt);
        // Do not call setFolders or setAppState here anymore to avoid showing empty folders in UI
        setNotifications(prev => [...prev, { id: 'template-applied', message: `Đã áp dụng mẫu "${template.name}" làm chỉ dẫn cho AI.`, type: 'info' }]);
    }, []);

    const handleTemplateSettingsChange = useCallback((newSettings: Partial<TemplateSettings>) => {
        setTemplateSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    async function initializeDefaultTemplates() {
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

        // Save all default templates
        await Promise.all(defaultTemplates.map(template => db.saveFolderTemplate(template)));
        setFolderTemplates(defaultTemplates);
    }

    const foldersWithCounts = useMemo(() => {
        const addCounts = (items: (Folder | Bookmark)[]): (Folder | Bookmark)[] => {
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

    const filteredBookmarks = useMemo(() => {
        if (!searchQuery.trim()) {
            return [];
        }

        const bookmarksHash = generateHash(bookmarks);
        const cacheKey = cacheKeys.searchResults(searchQuery, bookmarksHash);

        // Try to get from cache first
        const cached = searchCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Perform search
        const lowercasedQuery = searchQuery.toLowerCase();
        const results = bookmarks.filter(bm =>
            bm.title.toLowerCase().includes(lowercasedQuery) ||
            bm.url.toLowerCase().includes(lowercasedQuery)
        );

        // Cache the results
        searchCache.set(cacheKey, results, 10 * 60 * 1000); // Cache for 10 minutes

        return results;
    }, [searchQuery, bookmarks]);

    const selectedFolder = selectedFolderId === 'root' 
        ? { id: 'root', name: 'Tất cả Bookmarks', children: [], parentId: null } 
        : findFolder(folders, selectedFolderId);

    const displayedBookmarks = selectedFolderId === 'root'
        ? bookmarks
        : getBookmarksInFolder(selectedFolder);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full bg-[#1E2127] items-center justify-center">
                <p className="text-white text-lg">Đang tải dữ liệu...</p>
            </div>
        );
    }
    
    const isSearching = searchQuery.trim() !== '';
    const bookmarksToDisplay = isSearching ? filteredBookmarks : displayedBookmarks;
    const listTitle = isSearching
        ? `Kết quả tìm kiếm cho "${searchQuery}"`
        : (selectedFolder?.name || "Tất cả Bookmarks");
    const noBookmarksMessage = isSearching
        ? `Không tìm thấy kết quả nào cho "${searchQuery}".`
        : "Không có bookmark nào trong thư mục này.";


    return (
        <div className="flex h-screen w-full bg-[#1E2127] text-gray-300 font-sans">
            <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Đang tải...</div></div>}>
                {showImportModal && (
                    <ImportModal
                        fileName={importFileName}
                        previewBookmarks={previewBookmarks}
                        existingBookmarks={bookmarks}
                        onImport={processImport}
                        onCancel={() => {
                            setShowImportModal(false);
                            setImportFileName('');
                            setPreviewBookmarks([]);
                        }}
                    />
                )}
                {isApiModalOpen && (
                    <ApiConfigModal
                        onClose={() => setIsApiModalOpen(false)}
                        apiConfigs={apiConfigs}
                        onSaveApiConfig={handleSaveApiConfig}
                        onDeleteApiConfig={handleDeleteApiConfig}
                        onToggleApiConfigStatus={handleToggleApiConfigStatus}
                    />
                )}
                {isLogModalOpen && (
                    <LogModal
                        logs={detailedLogs}
                        onClose={() => setIsLogModalOpen(false)}
                    />
                )}
                {isDuplicateModalOpen && (
                    <DuplicateModal
                        stats={duplicateStats}
                        onClose={() => setIsDuplicateModalOpen(false)}
                        onClean={handleCleanDuplicates}
                    />
                )}
                {isBrokenLinkModalOpen && (
                    <BrokenLinkModal
                        brokenLinks={brokenLinks}
                        onClose={() => setIsBrokenLinkModalOpen(false)}
                        onClean={handleCleanBrokenLinks}
                    />
                )}
                {isInstructionPresetModalOpen && (
                    <InstructionPresetModal
                        isOpen={isInstructionPresetModalOpen}
                        onClose={() => setIsInstructionPresetModalOpen(false)}
                        onSave={handleSaveInstructionPreset}
                        onDelete={handleDeleteInstructionPreset}
                        presets={instructionPresets}
                    />
                )}
                {isFolderTemplateModalOpen && (
                    <FolderTemplateModal
                        isOpen={isFolderTemplateModalOpen}
                        onClose={() => setIsFolderTemplateModalOpen(false)}
                        templates={folderTemplates}
                        onSaveTemplate={handleSaveFolderTemplate}
                        onDeleteTemplate={handleDeleteFolderTemplate}
                        onApplyFolderTemplate={handleApplyFolderTemplate}
                        apiConfigs={apiConfigs}
                    />
                )}
                {isExportModalOpen && (
                    <ExportModal
                        folders={folders}
                        bookmarks={bookmarks}
                        onExport={handleExportBookmarks}
                        onCancel={() => setIsExportModalOpen(false)}
                    />
                )}
                {isAnalyticsDashboardOpen && (
                    <AnalyticsDashboard
                        bookmarks={bookmarks}
                        folders={folders}
                        onClose={() => setIsAnalyticsDashboardOpen(false)}
                    />
                )}
                {isKeyInputModalOpen && (
                    <KeyInputModal
                        isOpen={isKeyInputModalOpen}
                        onClose={() => setIsKeyInputModalOpen(false)}
                        mode={keyInputMode}
                        onSubmit={async (key) => {
                            if (keyInputMode === 'upload') {
                                // Handle upload
                                await handleUploadData(key);
                            } else {
                                // Handle import
                                await handleImportData(key);
                            }
                        }}
                    />
                )}
                {isAIConfigModalOpen && (
                    <AIConfigSettingsModal
                        isOpen={isAIConfigModalOpen}
                        onClose={() => setIsAIConfigModalOpen(false)}
                        systemPrompt={systemPrompt}
                        onSystemPromptChange={setSystemPrompt}
                        planningPrompt={planningPrompt}
                        onPlanningPromptChange={setPlanningPrompt}
                        customInstructions={customInstructions}
                        onCustomInstructionsChange={setCustomInstructions}
                        batchSize={batchSize}
                        onBatchSizeChange={setBatchSize}
                        maxRetries={maxRetries}
                        onMaxRetriesChange={setMaxRetries}
                        processingMode={processingMode}
                        onProcessingModeChange={setProcessingMode}
                        folderTemplates={folderTemplates}
                        selectedTemplateId={templateSettings.selectedTemplateId}
                        onSelectedTemplateChange={(id) => setTemplateSettings(prev => ({ ...prev, selectedTemplateId: id }))}
                        onOpenFolderTemplateModal={() => setIsFolderTemplateModalOpen(true)}
                        onOpenInstructionPresetModal={() => setIsInstructionPresetModalOpen(true)}
                        onApplyFolderTemplate={handleApplyFolderTemplate}
                        smartClassifyRules={smartClassifyRules}
                        onSaveSmartRule={handleSaveSmartRule}
                        onDeleteSmartRule={handleDeleteSmartRule}
                    />
                )}

            </Suspense>
            <div className="fixed bottom-4 right-4 z-50 space-y-2">
                {notifications.map((notification, index) => (
                    <NotificationToast
                        key={notification.id}
                        id={notification.id}
                        message={notification.message}
                        type={notification.type}
                        duration={notification.duration}
                        action={notification.action}
                        index={index}
                        onDismiss={handleDismissNotification}
                    />
                ))}
            </div>
            <div className="w-full max-w-10xl mx-auto flex h-full p-4">
                <main className="flex flex-1 bg-[#282C34] rounded-xl shadow-2xl overflow-hidden">
                    <Sidebar
                        folders={foldersWithCounts as Folder[]}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        onClearData={handleClearData}
                        onImport={handleImportClick}
                        onExport={handleOpenExportModal}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        totalBookmarks={bookmarks.length}
                        duplicateCount={duplicateStats.count}
                        onOpenDuplicateModal={() => setIsDuplicateModalOpen(true)}
                        onStartBrokenLinkCheck={handleStartBrokenLinkCheck}
                        brokenLinkCheckState={brokenLinkCheckState}
                        brokenLinkCheckProgress={brokenLinkCheckProgress}
                    />

                    <div className="flex-1 flex flex-col min-w-0">
                         <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                            <h1 className="text-lg font-bold text-white flex items-center">
                                <AILogoIcon className="w-6 h-6 mr-3 text-emerald-400" />
                                AI Bookmark Architect
                            </h1>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => {
                                        setKeyInputMode('upload');
                                        setIsKeyInputModalOpen(true);
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                                    title="Upload dữ liệu"
                                >
                                    <UploadIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setKeyInputMode('import');
                                        setIsKeyInputModalOpen(true);
                                    }}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                                    title="Import dữ liệu"
                                >
                                    <ImportIcon className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={() => setIsAnalyticsDashboardOpen(true)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-md transition-colors"
                                    title="Xem phân tích dữ liệu"
                                >
                                    <ChartIcon className="w-4 h-4" />
                                </button>
                                <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600"></button>
                                <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600"></button>
                                <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600"></button>
                            </div>
                        </header>
                       
                        {appState === AppState.EMPTY && <FileDropzone onFileLoaded={handleFileLoaded} />}

                        {(appState !== AppState.EMPTY) && (
                            <div className="flex flex-1 min-h-0">
                                <BookmarkList
                                    bookmarks={bookmarksToDisplay}
                                    folderName={listTitle}
                                    noBookmarksMessage={noBookmarksMessage}
                                />
                                <RestructurePanel
                                    appState={appState}
                                    progress={{
                                        current: allCategorizedBookmarks.length > 0 ? allCategorizedBookmarks.length : progress.current,
                                        total: bookmarks.length > 0 ? bookmarks.length : progress.total,
                                    }}
                                    logs={logs}
                                    errorDetails={errorDetails}
                                    apiConfigs={apiConfigs}
                                    systemPrompt={systemPrompt}
                                    onSystemPromptChange={setSystemPrompt}
                                    sessionTokenUsage={sessionTokenUsage}
                                    customInstructions={customInstructions}
                                    batchSize={batchSize}
                                    maxRetries={maxRetries}
                                    processingMode={processingMode}
                                    hasPartialResults={allCategorizedBookmarks.length > 0}
                                    folderTemplates={folderTemplates}
                                    selectedTemplateId={templateSettings.selectedTemplateId}
                                    onStart={() => startRestructuring(false)}
                                    onStop={handleStopRestructuring}
                                    onForceStop={handleForceStopRestructuring}
                                    onApply={applyChanges}
                                    onDiscard={discardChanges}
                                    onContinue={continueRestructuring}
                                    onOpenApiModal={() => setIsApiModalOpen(true)}
                                    onOpenLogModal={() => setIsLogModalOpen(true)}
                                    onOpenInstructionPresetModal={() => setIsInstructionPresetModalOpen(true)}
                                    onOpenFolderTemplateModal={() => setIsFolderTemplateModalOpen(true)}
                                    onCustomInstructionsChange={setCustomInstructions}
                                    onBatchSizeChange={setBatchSize}
                                    onMaxRetriesChange={setMaxRetries}
                                    onProcessingModeChange={setProcessingMode}
                                    onApplyFolderTemplate={handleApplyFolderTemplate}
                                    onSelectedTemplateChange={(templateId) => {
                                        setTemplateSettings(prev => ({ ...prev, selectedTemplateId: templateId }));
                                        // If no template selected, revert to default system prompt
                                        if (!templateId) {
                                            setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
                                        }
                                    }}
                                    onSuggestStructure={generateStructureSuggestion}
                                    onConfirmProposedStructure={confirmProposedStructure}
                                    proposedStructure={proposedStructure}
                                    isGeneratingStructure={isGeneratingStructure}
                                    planningPrompt={planningPrompt}
                                    onPlanningPromptChange={setPlanningPrompt}
                                    onOpenAIConfigModal={() => setIsAIConfigModalOpen(true)}
                                    sessionRules={sessionRules}
                                    onSessionRulesChange={setSessionRules}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

// Helper functions (Iterative implementations)
function findFolder(items: (Folder | Bookmark)[], id: string | null): Folder | null {
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

function getBookmarksInFolder(folder: Folder | null): Bookmark[] {
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

export default App;
