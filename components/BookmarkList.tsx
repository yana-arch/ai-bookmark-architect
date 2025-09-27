import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Bookmark } from '../types';
import { OpenBookIcon } from './Icons';

interface BookmarkListProps {
    bookmarks: Bookmark[];
    folderName: string;
    noBookmarksMessage: string;
}

const BookmarkItem: React.FC<{ bookmark: Bookmark }> = ({ bookmark }) => {
    const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${bookmark.url}`;

    return (
        <div className="p-3 hover:bg-gray-700/40 rounded-lg transition-colors duration-150">
            <div className="flex items-center">
                <img src={faviconUrl} alt="" className="w-5 h-5 mr-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{bookmark.title}</p>
                    <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
                </div>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="ml-4 text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500/30 transition-colors flex-shrink-0">
                    Mở
                </a>
            </div>
            {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 pl-9">
                    {bookmark.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-0.5 text-xs font-medium bg-gray-600/50 text-gray-300 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// Virtual scrolling component for large lists
const VirtualizedBookmarkList: React.FC<{
    bookmarks: Bookmark[];
    itemHeight: number;
    containerHeight: number;
}> = ({ bookmarks, itemHeight, containerHeight }) => {
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const visibleRange = useMemo(() => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(
            start + Math.ceil(containerHeight / itemHeight) + 2, // +2 for buffer
            bookmarks.length
        );
        return { start: Math.max(0, start - 1), end }; // -1 for buffer
    }, [scrollTop, itemHeight, containerHeight, bookmarks.length]);

    const visibleBookmarks = useMemo(() => {
        return bookmarks.slice(visibleRange.start, visibleRange.end);
    }, [bookmarks, visibleRange]);

    const totalHeight = bookmarks.length * itemHeight;
    const offsetY = visibleRange.start * itemHeight;

    if (bookmarks.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500 py-10">
                    <p>No bookmarks to display</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex-1 overflow-y-auto"
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div
                    style={{
                        transform: `translateY(${offsetY}px)`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                    }}
                >
                    {visibleBookmarks.map((bookmark, index) => (
                        <div
                            key={bookmark.id}
                            style={{
                                height: itemHeight,
                                position: 'absolute',
                                top: (visibleRange.start + index) * itemHeight - offsetY,
                                left: 0,
                                right: 0,
                            }}
                        >
                            <BookmarkItem bookmark={bookmark} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const BookmarkList: React.FC<BookmarkListProps> = ({ bookmarks, folderName, noBookmarksMessage }) => {
    const ITEM_HEIGHT = 80; // Approximate height of each bookmark item
    const HEADER_HEIGHT = 80; // Height of the header
    const CONTAINER_HEIGHT = 600; // Fixed height for virtual scrolling

    // Use virtual scrolling for large lists (>50 items) to improve performance
    const shouldUseVirtualScrolling = bookmarks.length > 50;

    return (
        <div className="flex-1 bg-[#282C34] flex flex-col">
            <div className="p-4 border-b border-gray-700/50 sticky top-0 bg-[#282C34] z-10">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <OpenBookIcon className="w-6 h-6 mr-3 text-gray-400" />
                    {folderName}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {bookmarks.length} bookmarks
                </p>
            </div>

            {shouldUseVirtualScrolling ? (
                <VirtualizedBookmarkList
                    bookmarks={bookmarks}
                    itemHeight={ITEM_HEIGHT}
                    containerHeight={CONTAINER_HEIGHT}
                />
            ) : (
                <div className="p-4 space-y-2 overflow-y-auto flex-1">
                    {bookmarks.length > 0 ? (
                        bookmarks.map(bm => <BookmarkItem key={bm.id} bookmark={bm} />)
                    ) : (
                        <div className="text-center text-gray-500 py-10">
                            <p>{noBookmarksMessage}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BookmarkList;
