import { useState, useEffect } from 'react';
import type { Bookmark } from '@/types';

export const useSearch = (bookmarks: Bookmark[]) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);

    useEffect(() => {
        let isMounted = true;
        const performSearch = () => {
            if (!searchQuery.trim()) {
                if (isMounted) setFilteredBookmarks([]);
                return;
            }

            const lowercasedQuery = searchQuery.toLowerCase();
            const results = bookmarks.filter(bm =>
                bm.title.toLowerCase().includes(lowercasedQuery) ||
                bm.url.toLowerCase().includes(lowercasedQuery)
            );

            if (isMounted) {
                setFilteredBookmarks(results);
            }
        };

        performSearch();

        return () => {
            isMounted = false;
        };
    }, [searchQuery, bookmarks]);

    const isSearching = searchQuery.trim() !== '';

    return {
        searchQuery,
        setSearchQuery,
        filteredBookmarks,
        isSearching
    };
};
