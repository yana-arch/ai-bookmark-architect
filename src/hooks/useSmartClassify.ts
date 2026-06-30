import { useState, useCallback, useEffect } from 'react';
import { libraryRepo } from '@/src/db/repositories/library';
import { Bookmark, SmartClassifyRule, CategorizedBookmark } from '@/types';

export const useSmartClassify = () => {
    const [smartClassifyRules, setSmartClassifyRules] = useState<SmartClassifyRule[]>([]);
    const [sessionRules, setSessionRules] = useState<SmartClassifyRule[]>([]);
    const [isLoadingRules, setIsLoadingRules] = useState(true);

    // Load rules from DB on mount
    useEffect(() => {
        const loadRules = async () => {
            try {
                const savedRules = await libraryRepo.getRules();
                if (savedRules) {
                    setSmartClassifyRules(savedRules);
                }
            } catch (error) {
                console.error('Failed to load smart classify rules:', error);
            } finally {
                setIsLoadingRules(false);
            }
        };
        loadRules();
    }, []);

    const saveRule = useCallback(async (rule: SmartClassifyRule) => {
        // Basic validation
        if (!rule.pattern?.trim() || !rule.targetPath || rule.targetPath.length === 0) {
            console.warn('Invalid rule: Pattern or Target Path is missing');
            return;
        }

        await libraryRepo.saveRule(rule);
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

    const deleteRule = useCallback(async (id: string) => {
        await libraryRepo.deleteRule(id);
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

    return {
        smartClassifyRules,
        sessionRules,
        setSessionRules,
        isLoadingRules,
        saveRule,
        deleteRule,
        applySmartClassify
    };
};
