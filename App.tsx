
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AILogoIcon } from './components/Icons';
// Fix: Consolidate type imports into a single statement.
import { AppState, type Bookmark, type Folder, type CategorizedBookmark, type ApiConfig } from './types';
import Sidebar from './components/Sidebar';
import BookmarkList from './components/BookmarkList';
import RestructurePanel from './components/RestructurePanel';
import FileDropzone from './components/FileDropzone';
import ImportModal from './components/ImportModal';
import ApiConfigModal from './components/ApiConfigModal';
import * as db from './db';

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
  ];
};


const App: React.FC = () => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [folders, setFolders] = useState<(Folder | Bookmark)[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
    const [appState, setAppState] = useState<AppState>(AppState.EMPTY);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [customInstructions, setCustomInstructions] = useState<string>('');
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const savedFolders = await db.getFolders();
            const savedBookmarks = await db.getBookmarks();
            const savedApiConfigs = await db.getApiConfigs();
            
            setApiConfigs(savedApiConfigs || []);

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
        };
        loadData();
    }, []);
    
    const parseBookmarksHTML = (htmlString: string): Bookmark[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        
        return links.map((link, index) => ({
            id: `bm-${Date.now()}-${index}`,
            title: link.textContent || 'No Title',
            url: link.href,
            parentId: null
        }));
    };

    const handleFileLoaded = async (loadedBookmarks: Bookmark[]) => {
        await db.saveBookmarks(loadedBookmarks);
        await db.saveFolders([]); // Clear any old folder structure
        setBookmarks(loadedBookmarks);
        setFolders([]);
        setSelectedFolderId('root');
        setAppState(AppState.LOADED);
    };
    
    const handleSaveApiConfig = async (config: ApiConfig) => {
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
    };

    const handleDeleteApiConfig = async (id: string) => {
        await db.deleteApiConfig(id);
        setApiConfigs(prev => prev.filter(c => c.id !== id));
    };

    const arrayToTree = (bookmarks: (Bookmark & { path?: string[] })[]): (Folder | Bookmark)[] => {
        const root: Folder = { id: 'root', name: 'Thư Mục', children: [], parentId: null };
        const foldersMap = new Map<string, Folder>();
        foldersMap.set('root', root);

        const getOrCreateFolder = (path: string[]): Folder => {
            let currentLevel = root;
            let currentPath = '';

            for (const folderName of path) {
                currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
                let folder = foldersMap.get(currentPath);
                
                if (!folder) {
                    const parentId = currentLevel.id;
                    folder = { id: currentPath, name: folderName, children: [], parentId };
                    currentLevel.children.push(folder);
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
    };

    const startRestructuring = async () => {
        let availableKeys = apiConfigs.filter(c => c.status === 'active');
        if (availableKeys.length === 0) {
            setErrorDetails("Không có API key nào đang hoạt động. Vui lòng thêm một key hợp lệ.");
            setLogs(["Lỗi: Không tìm thấy API key đang hoạt động."]);
            setAppState(AppState.ERROR);
            return;
        }

        setAppState(AppState.PROCESSING);
        setLogs(['Bắt đầu quá trình tái cấu trúc...']);
        setProgress({ current: 0, total: 0 });
        setErrorDetails(null);

        const BATCH_SIZE = 5;
        const totalBatches = Math.ceil(bookmarks.length / BATCH_SIZE);
        setProgress({ current: 0, total: totalBatches });

        let allCategorizedBookmarks: CategorizedBookmark[] = [];
        let currentTree: (Folder | Bookmark)[] = [];
        let keyIndex = 0;

        for (let i = 0; i < totalBatches; i++) {
            const batch = bookmarks.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
            setProgress({ current: i + 1, total: totalBatches });
            setLogs(prev => [...prev, `Đang xử lý batch ${i + 1}/${totalBatches}...`]);
            
            let batchSuccess = false;
            let attempt = 0;
            
            while(!batchSuccess && keyIndex < availableKeys.length) {
                const currentKeyConfig = availableKeys[keyIndex];
                attempt++;
                setLogs(prev => [...prev, `Attempt ${attempt} with key: ${currentKeyConfig.name}`]);

                try {
                    const ai = new GoogleGenAI({apiKey: currentKeyConfig.apiKey});
                    const userInstructionBlock = customInstructions.trim()
                        ? `\n\nUSER'S CUSTOM INSTRUCTIONS (Follow these strictly):\n- ${customInstructions.trim().replace(/\n/g, '\n- ')}`
                        : '';

                    const prompt = `You are an intelligent bookmark organizer. Your goal is to create a clean, hierarchical folder structure in VIETNAMESE. You will be given an *existing folder structure* and a *new list of bookmarks*. For each bookmark, place it into the most logical folder path.
                    **Crucially, if a suitable folder already exists, use it.** Do not create new folders that are synonyms or slight variations of existing ones (e.g., if 'Phát triển Web' exists, do not create 'Web Dev'). Consolidate them.
                    If you must create a new folder, make its name clear and distinct. You can create nested folders.
                    The folder structure should be logical and not too deep.
                    ${userInstructionBlock}
                    
                    EXISTING STRUCTURE:
                    ${JSON.stringify(currentTree, null, 2)}
                    
                    BOOKMARKS TO CATEGORIZE:
                    ${JSON.stringify(batch.map(b => ({ title: b.title, url: b.url })), null, 2)}
                    
                    Output a JSON array where each object represents a bookmark with its original 'title', 'url', and its final 'path' as an array of Vietnamese folder names (e.g., ['Phát triển Web', 'React', 'Hooks']).`;
                    
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        url: { type: Type.STRING },
                                        path: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    },
                                    required: ['title', 'url', 'path']
                                }
                            }
                        }
                    });

                    const categorizedBatch: CategorizedBookmark[] = JSON.parse(response.text.trim());
                    allCategorizedBookmarks.push(...categorizedBatch);

                    const combinedBookmarksForTree = bookmarks.map(bm => {
                        const categorized = allCategorizedBookmarks.find(cb => cb.url === bm.url);
                        return { ...bm, path: categorized?.path || [] };
                    });
                    currentTree = arrayToTree(combinedBookmarksForTree);
                    
                    batchSuccess = true; // Move to next batch
                } catch (error: any) {
                    const errorMessage = error.toString();
                     setLogs(prev => [...prev, `Lỗi với key "${currentKeyConfig.name}": ${errorMessage}`]);

                    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
                        keyIndex++; // Try next key
                        if(keyIndex >= availableKeys.length) {
                             setLogs(prev => [...prev, `Tất cả API keys đã hết hạn mức.`]);
                             setErrorDetails("Tất cả các API key đã hết hạn mức. Quá trình xử lý đã dừng lại. Kết quả một phần có sẵn để xem xét.");
                             setAppState(AppState.ERROR);
                             break; // Exit the while loop
                        }
                    } else {
                        setErrorDetails(`Lỗi không thể phục hồi ở batch ${i + 1}: ${errorMessage}`);
                        setAppState(AppState.ERROR);
                        break; // Exit while loop for unrecoverable error
                    }
                }
            } // end while for key retries

            if (!batchSuccess) {
                // Failed to process this batch with any key
                break; // Exit for loop over batches
            }
        } // end for loop over batches
        
        const finalCategorized = bookmarks.map(bm => {
            const found = allCategorizedBookmarks.find(cb => cb.url === bm.url);
            return { ...bm, path: found?.path || []};
        });
        
        const newFolders = arrayToTree(finalCategorized);
        setFolders(newFolders);
        
        if(appState !== AppState.ERROR) {
            setAppState(AppState.REVIEW);
            setLogs(prev => [...prev, 'Tái cấu trúc hoàn tất! Xem lại các thay đổi.']);
        } else {
             setLogs(prev => [...prev, 'Quá trình dừng lại do lỗi. Xem lại kết quả đã xử lý.']);
        }
    };
    
    const applyChanges = async () => {
       await db.saveFolders(folders);
       setAppState(AppState.STRUCTURED);
       setLogs([]);
       setProgress({current: 0, total: 0});
       setSelectedFolderId('root');
    };

    const discardChanges = () => {
        setFolders([]);
        setAppState(AppState.LOADED);
        setLogs([]);
        setProgress({current: 0, total: 0});
        setErrorDetails(null);
    };
    
    const retry = () => {
        // More sophisticated retry could start from the failed batch.
        // For now, it's a soft reset to the loaded state.
        discardChanges();
    };

    const handleClearData = async () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa tất cả dữ liệu bookmarks không? Hành động này không thể hoàn tác.")) {
            await db.clearAllData();
            setBookmarks([]);
            setFolders([]);
            setAppState(AppState.EMPTY);
        }
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileSelectedForImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setImportFile(event.target.files[0]);
            event.target.value = '';
        }
    };

    const processImport = async (mode: 'merge' | 'overwrite') => {
        if (!importFile) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (content) {
                const parsedBookmarks = parseBookmarksHTML(content);
                
                let combinedBookmarks: Bookmark[] = [];
                if (mode === 'merge') {
                    const existingUrls = new Set(bookmarks.map(bm => bm.url));
                    const newBookmarks = parsedBookmarks.filter(bm => !existingUrls.has(bm.url));
                    combinedBookmarks = [...bookmarks, ...newBookmarks];
                } else { // overwrite
                    combinedBookmarks = parsedBookmarks;
                }
                
                await db.saveBookmarks(combinedBookmarks);
                await db.saveFolders([]); // Clear structure on any import
                setBookmarks(combinedBookmarks);
                setFolders([]);
                setSelectedFolderId('root');
                setAppState(AppState.LOADED);
            }
        };
        reader.readAsText(importFile);
        setImportFile(null);
    };
    
    const handleExportBookmarks = () => {
        const buildHtml = (items: (Folder | Bookmark)[], level: number): string => {
            let html = '';
            const indent = ' '.repeat(level * 4);

            items.forEach(item => {
                if ('url' in item) { // It's a bookmark
                    html += `${indent}<DT><A HREF="${item.url}">${item.title}</A>\n`;
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
        
        const itemsToExport = folders.length > 0 ? folders : bookmarks;
        const bookmarksHtml = buildHtml(itemsToExport, 1);
        
        const fullHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${bookmarksHtml}</DL><p>`;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookmarks_export.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

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

    return (
        <div className="flex h-screen w-full bg-[#1E2127] text-gray-300 font-sans">
            <input 
                type="file" 
                ref={importInputRef}
                className="hidden" 
                accept=".html"
                onChange={handleFileSelectedForImport}
            />
            {importFile && (
                <ImportModal 
                    fileName={importFile.name}
                    onImport={processImport}
                    onCancel={() => setImportFile(null)}
                />
            )}
            {isApiModalOpen && (
                <ApiConfigModal
                    onClose={() => setIsApiModalOpen(false)}
                    apiConfigs={apiConfigs}
                    onSaveApiConfig={handleSaveApiConfig}
                    onDeleteApiConfig={handleDeleteApiConfig}
                />
            )}
            <div className="w-full max-w-7xl mx-auto flex h-full p-4">
                <main className="flex flex-1 bg-[#282C34] rounded-xl shadow-2xl overflow-hidden">
                    <Sidebar
                        folders={folders}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        onClearData={handleClearData}
                        onImport={handleImportClick}
                        onExport={handleExportBookmarks}
                    />

                    <div className="flex-1 flex flex-col min-w-0">
                         <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                            <h1 className="text-lg font-bold text-white flex items-center">
                                <AILogoIcon className="w-6 h-6 mr-3 text-emerald-400" />
                                AI Bookmark Architect
                            </h1>
                            <div className="flex items-center space-x-2">
                                <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600"></button>
                                <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600"></button>
                                <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600"></button>
                            </div>
                        </header>
                       
                        {appState === AppState.EMPTY && <FileDropzone onFileLoaded={handleFileLoaded} />}

                        {(appState !== AppState.EMPTY) && (
                            <div className="flex flex-1 min-h-0">
                                <BookmarkList
                                    bookmarks={displayedBookmarks}
                                    folderName={selectedFolder?.name || "Tất cả Bookmarks"}
                                />
                                <RestructurePanel
                                    appState={appState}
                                    progress={progress}
                                    logs={logs}
                                    errorDetails={errorDetails}
                                    apiConfigs={apiConfigs}
                                    customInstructions={customInstructions}
                                    onStart={startRestructuring}
                                    onApply={applyChanges}
                                    onDiscard={discardChanges}
                                    onRetry={retry}
                                    onOpenApiModal={() => setIsApiModalOpen(true)}
                                    onCustomInstructionsChange={setCustomInstructions}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

// Helper functions
function findFolder(items: (Folder | Bookmark)[], id: string | null): Folder | null {
    if (id === null) return null;
    for (const item of items) {
        if ('url' in item) continue;
        const folder = item as Folder;
        if (folder.id === id) return folder;
        if (folder.children) {
            const found = findFolder(folder.children, id);
            if (found) return found;
        }
    }
    return null;
}

function getBookmarksInFolder(folder: Folder | null): Bookmark[] {
    if (!folder) return [];
    let bookmarks: Bookmark[] = [];
    function recurse(current: Folder | Bookmark) {
        if ('url' in current) {
            bookmarks.push(current);
        } else if (current.children) {
            current.children.forEach(recurse);
        }
    }
    recurse(folder);
    return bookmarks;
}

export default App;
