
import React from 'react';
import type { Bookmark } from '../types';
import { OpenBookIcon } from './Icons';

interface BookmarkListProps {
    bookmarks: Bookmark[];
    folderName: string;
}

const BookmarkItem: React.FC<{ bookmark: Bookmark }> = ({ bookmark }) => {
    const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${bookmark.url}`;

    return (
        <div className="flex items-center p-3 hover:bg-gray-700/40 rounded-lg transition-colors duration-150">
            <img src={faviconUrl} alt="" className="w-5 h-5 mr-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{bookmark.title}</p>
                <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
            </div>
            <button className="ml-4 text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500/30 transition-colors">
                Thử AI
            </button>
        </div>
    );
};


const BookmarkList: React.FC<BookmarkListProps> = ({ bookmarks, folderName }) => {
    return (
        <div className="flex-1 bg-[#282C34] flex flex-col overflow-y-auto">
             <div className="p-4 border-b border-gray-700/50 sticky top-0 bg-[#282C34] z-10">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <OpenBookIcon className="w-6 h-6 mr-3 text-gray-400" />
                    {folderName}
                </h2>
            </div>
            <div className="p-4 space-y-2">
                {bookmarks.length > 0 ? (
                    bookmarks.map(bm => <BookmarkItem key={bm.id} bookmark={bm} />)
                ) : (
                    <div className="text-center text-gray-500 py-10">
                        <p>Không có bookmark nào trong thư mục này.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookmarkList;
