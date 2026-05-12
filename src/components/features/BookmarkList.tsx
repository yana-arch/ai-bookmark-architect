import React, { useState, useCallback, useMemo } from 'react';
import type { Bookmark, CategorizedBookmark } from '@/types';
import { OpenBookIcon, MoveIcon } from '@/src/components/ui/Icons';
import { useApp } from '@/src/context/AppContext';
import MoveBookmarkModal from '@/src/components/modals/MoveBookmarkModal';

interface BookmarkListProps {
    bookmarks: Bookmark[];
    folderName: string;
    noBookmarksMessage: string;
}

const BookmarkItem: React.FC<{ 
    bookmark: Bookmark;
    onMoveClick: (bookmark: Bookmark) => void;
}> = ({ bookmark, onMoveClick }) => {
    // Validates URL to prevent "about:blank" or malformed URLs from hitting Google's API
    const getSafeFaviconUrl = (url: string) => {
        try {
            if (!url || url === 'about:blank' || !url.startsWith('http')) return null;
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`;
        } catch {
            return null;
        }
    };

    const [imgSrc, setImgSrc] = useState<string | null>(getSafeFaviconUrl(bookmark.url));
    const [hasError, setHasError] = useState(false);

    // Fallback transparent pixel to stop loading endless 404s
    const FALLBACK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // Confidence indicator logic
    const categorizedBookmark = bookmark as CategorizedBookmark;
    const confidence = categorizedBookmark.confidence;
    
    const getConfidenceColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (score >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    };

    return (
        <div className="p-3 hover:bg-gray-700/40 rounded-xl transition-all duration-150 group border border-transparent hover:border-white/5">
            <div className="flex items-center">
                {!hasError && imgSrc ? (
                    <img 
                        src={imgSrc} 
                        alt="" 
                        className="w-5 h-5 mr-4 flex-shrink-0 rounded-md shadow-lg" 
                        loading="lazy"
                        onError={() => {
                            setHasError(true);
                            setImgSrc(FALLBACK_IMAGE);
                        }}
                    />
                ) : (
                    // Render a generic icon when favicon fails or is invalid
                    <div className="w-5 h-5 mr-4 flex-shrink-0 flex items-center justify-center bg-gray-700/50 rounded-md text-gray-400 shadow-inner">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-gray-100 truncate group-hover:text-white transition-colors">{bookmark.title}</p>
                        {typeof confidence !== 'undefined' && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-tighter ${getConfidenceColor(confidence)}`}>
                                {confidence}% Accurate
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5">{bookmark.url}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                    <button 
                        onClick={() => onMoveClick(bookmark)}
                        className="p-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-sky-500 hover:text-white transition-all border border-white/5 active:scale-90"
                        title="Move to folder"
                    >
                        <MoveIcon className="w-3.5 h-3.5" />
                    </button>
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black bg-white/5 text-gray-400 px-4 py-1.5 rounded-lg hover:bg-emerald-500 hover:text-white transition-all flex-shrink-0 uppercase tracking-widest active:scale-95 border border-white/5 hover:border-emerald-500/50">
                        Open
                    </a>
                </div>
            </div>
            {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pl-9">
                    {bookmark.tags.map((tag, index) => (
                        <span key={index} className="px-2.5 py-1 text-[9px] font-black bg-gray-800/40 text-gray-400 rounded-lg border border-white/5 uppercase tracking-wider hover:bg-gray-700/60 transition-colors">
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
    onMoveClick: (bookmark: Bookmark) => void;
}> = ({ bookmarks, itemHeight, containerHeight, onMoveClick }) => {
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
                            <BookmarkItem bookmark={bookmark} onMoveClick={onMoveClick} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const BookmarkList: React.FC<BookmarkListProps> = ({ bookmarks, folderName, noBookmarksMessage }) => {
    const { folders, handleMoveBookmark } = useApp();
    const [movingBookmark, setMovingBookmark] = useState<Bookmark | null>(null);

    const ITEM_HEIGHT = 100; // Increased height to accommodate tags
    const CONTAINER_HEIGHT = 600; // Fixed height for virtual scrolling

    // Use virtual scrolling for large lists (>50 items) to improve performance
    const shouldUseVirtualScrolling = bookmarks.length > 50;

    const handleConfirmMove = async (bookmarkId: string, targetFolderId: string | 'root') => {
        await handleMoveBookmark(bookmarkId, targetFolderId);
        setMovingBookmark(null);
    };

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
                    onMoveClick={setMovingBookmark}
                />
            ) : (
                <div className="p-4 space-y-2 overflow-y-auto flex-1">
                    {bookmarks.length > 0 ? (
                        bookmarks.map(bm => (
                            <BookmarkItem 
                                key={bm.id} 
                                bookmark={bm} 
                                onMoveClick={setMovingBookmark} 
                            />
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-10">
                            <p>{noBookmarksMessage}</p>
                        </div>
                    )}
                </div>
            )}

            {movingBookmark && (
                <MoveBookmarkModal
                    isOpen={!!movingBookmark}
                    onClose={() => setMovingBookmark(null)}
                    bookmark={movingBookmark}
                    folders={folders}
                    onMove={handleConfirmMove}
                />
            )}
        </div>
    );
};

export default React.memo(BookmarkList);
