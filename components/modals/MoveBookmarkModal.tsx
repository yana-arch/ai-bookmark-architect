import React, { useState } from 'react';
import type { Folder, Bookmark } from '@/types';
import { FolderIcon, ChevronRightIcon, XIcon } from '../ui/Icons';

interface MoveBookmarkModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookmark: Bookmark;
    folders: (Folder | Bookmark)[];
    onMove: (bookmarkId: string, targetFolderId: string | 'root') => void;
}

const FolderPickerItem: React.FC<{
    folder: Folder;
    level: number;
    onSelect: (id: string) => void;
}> = ({ folder, level, onSelect }) => {
    const [isOpen, setIsOpen] = useState(true);
    const subFolders = folder.children.filter((c): c is Folder => !('url' in c));

    return (
        <div>
            <div
                onClick={() => onSelect(folder.id)}
                className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
            >
                <ChevronRightIcon
                    className={`w-4 h-4 mr-2 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                />
                <FolderIcon className="w-5 h-5 mr-3 text-yellow-500/80 group-hover:text-yellow-400" />
                <span className="truncate text-sm font-medium text-gray-300 group-hover:text-white">{folder.name}</span>
            </div>
            {isOpen && subFolders.length > 0 && (
                <div className="mt-1">
                    {subFolders.map(subFolder => (
                        <FolderPickerItem
                            key={subFolder.id}
                            folder={subFolder}
                            level={level + 1}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const MoveBookmarkModal: React.FC<MoveBookmarkModalProps> = ({
    isOpen, onClose, bookmark, folders, onMove
}) => {
    if (!isOpen) return null;

    const rootFolders = folders.filter((item): item is Folder => !('url' in item));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-md bg-[#0a0c10] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Move Bookmark</h2>
                        <p className="text-xs text-gray-400 font-medium mt-1 truncate max-w-[280px]">
                            {bookmark.title}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#0d1117]">
                    <div
                        onClick={() => onMove(bookmark.id, 'root')}
                        className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all border border-transparent hover:border-white/5 mb-2 group"
                    >
                        <FolderIcon className="w-5 h-5 mr-3 text-sky-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-gray-200 group-hover:text-white">All Bookmarks (Root)</span>
                    </div>

                    <div className="space-y-1">
                        {rootFolders.map(folder => (
                            <FolderPickerItem
                                key={folder.id}
                                folder={folder}
                                level={0}
                                onSelect={(id) => onMove(bookmark.id, id)}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-[#0a0c10] border-t border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-xs font-black text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveBookmarkModal;
