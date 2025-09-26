
import React, { useState } from 'react';
import type { Folder, Bookmark } from '../types';
import { FolderIcon, ChevronRightIcon, TrashIcon, ImportIcon, ExportIcon, SearchIcon, XIcon } from './Icons';

interface SidebarProps {
    folders: Folder[];
    selectedFolderId: string | null;
    totalBookmarks: number;
    searchQuery: string;
    onSelectFolder: (id: string | null) => void;
    onClearData: () => void;
    onImport: () => void;
    onExport: () => void;
    onSearchChange: (query: string) => void;
}

const FolderItem: React.FC<{
    folder: Folder;
    level: number;
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
}> = ({ folder, level, selectedFolderId, onSelectFolder }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isSelected = selectedFolderId === folder.id;

    const subFolders = folder.children.filter((c): c is Folder => !('url' in c));

    return (
        <div>
            <div
                onClick={() => onSelectFolder(folder.id)}
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-150 ${
                    isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-gray-700/50'
                }`}
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
                <ChevronRightIcon
                    className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0"
                    isRotated={isOpen}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                />
                <FolderIcon className="w-5 h-5 mr-3 text-yellow-500 flex-shrink-0" isOpen={isOpen} />
                <span className="truncate font-medium flex-1">{folder.name}</span>
                 {typeof folder.bookmarkCount !== 'undefined' && (
                    <span className="ml-2 text-xs font-mono bg-gray-700 px-1.5 py-0.5 rounded">{folder.bookmarkCount}</span>
                )}
            </div>
            {isOpen && subFolders.length > 0 && (
                <div className="mt-1">
                    {subFolders.map(subFolder => (
                        <FolderItem
                            key={subFolder.id}
                            folder={subFolder}
                            level={level + 1}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={onSelectFolder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ folders, selectedFolderId, onSelectFolder, onClearData, onImport, onExport, searchQuery, onSearchChange, totalBookmarks }) => {
    return (
        <aside className="w-72 bg-[#21252C] p-3 flex-shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Thư Mục</h2>
                <div className="flex items-center space-x-3">
                     <button 
                        onClick={onImport} 
                        className="text-gray-400 hover:text-sky-400 transition-colors"
                        title="Nhập bookmarks"
                    >
                        <ImportIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onExport} 
                        className="text-gray-400 hover:text-emerald-400 transition-colors"
                        title="Xuất bookmarks"
                    >
                        <ExportIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onClearData} 
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa tất cả dữ liệu"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Tìm kiếm bookmarks..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md pl-9 pr-8 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {searchQuery && (
                    <XIcon 
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 hover:text-white cursor-pointer" 
                    />
                )}
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                 <div
                    onClick={() => onSelectFolder('root')}
                    className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-150 ${
                        selectedFolderId === 'root' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-gray-700/50'
                    }`}
                >
                    <FolderIcon className="w-5 h-5 mr-3 text-sky-400 flex-shrink-0" />
                    <span className="truncate font-medium flex-1">Tất cả Bookmarks</span>
                    <span className="ml-2 text-xs font-mono bg-gray-700 px-1.5 py-0.5 rounded">{totalBookmarks}</span>
                </div>
                {folders
                    .filter((item): item is Folder => !('url' in item))
                    .map(folder => (
                        <FolderItem
                            key={folder.id}
                            folder={folder}
                            level={0}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={onSelectFolder}
                        />
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;