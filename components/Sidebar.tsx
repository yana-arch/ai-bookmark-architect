
import React, { useState } from 'react';
import type { Folder, Bookmark } from '../types';
import { FolderIcon, ChevronRightIcon, TrashIcon, ImportIcon, ExportIcon } from './Icons';

interface SidebarProps {
    folders: (Folder | Bookmark)[];
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    onClearData: () => void;
    onImport: () => void;
    onExport: () => void;
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
                    className="w-4 h-4 mr-2 text-gray-500"
                    isRotated={isOpen}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                />
                <FolderIcon className="w-5 h-5 mr-3 text-yellow-500" isOpen={isOpen} />
                <span className="truncate font-medium">{folder.name}</span>
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


const Sidebar: React.FC<SidebarProps> = ({ folders, selectedFolderId, onSelectFolder, onClearData, onImport, onExport }) => {
    return (
        <aside className="w-64 bg-[#21252C] p-3 flex-shrink-0 flex flex-col">
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
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                 <div
                    onClick={() => onSelectFolder('root')}
                    className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-150 ${
                        selectedFolderId === 'root' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-gray-700/50'
                    }`}
                >
                    <FolderIcon className="w-5 h-5 mr-3 text-sky-400" />
                    <span className="truncate font-medium">Tất cả Bookmarks</span>
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
