import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateHash, cacheStats, CachedOperation, MemoryCache } from '../cache';
import { perfMonitor } from '../performance';
import { repairJson, parseAIResponse } from '../services/aiService';
import { arrayToTree, removeEmptyFolders, distributeBookmarksByTagSchema } from '../utils/treeUtils';
import type { Bookmark, Folder, CategorizedBookmark } from '../../types';
import type { TagFolderSchema } from '../utils/aiUtils';

describe('Integration Tests (Ported from src/tests.ts)', () => {
    
    describe('Core Logic', () => {
        it('should repair JSON with missing commas', () => {
            const brokenJson = '{"a": 1} {"b": 2}';
            expect(repairJson(brokenJson)).toBe('{"a": 1},{"b": 2}');
        });

        it('should repair JSON with trailing commas', () => {
            const brokenJson = '{"a": 1, }';
            expect(repairJson(brokenJson)).toBe('{"a": 1 }');
        });

        it('should parse AI response with markdown blocks', () => {
            const aiResponse = 'Here is the JSON: ```json {"bookmarks": [{"title": "T", "url": "U"}]} ```';
            const parsed = parseAIResponse(aiResponse);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].title).toBe('T');
        });
    });

    describe('Tree Construction & Manipulation', () => {
        it('should construct a tree from flat bookmarks', () => {
            const flatBookmarks: CategorizedBookmark[] = [
                { id: '1', title: 'B1', url: 'U1', path: ['A', 'B'], parentId: null, tags: [] },
                { id: '2', title: 'B2', url: 'U2', path: ['A'], parentId: null, tags: [] },
            ];
            const tree = arrayToTree(flatBookmarks);
            expect(tree).toHaveLength(1);
            expect((tree[0] as Folder).name).toBe('A');
            expect((tree[0] as Folder).children).toHaveLength(2);
        });

        it('should remove empty folders', () => {
            const treeWithEmptyFolders: (Folder | Bookmark)[] = [
                { id: 'f1', name: 'Non-Empty', children: [{ id: 'b1', title: 'B1', url: 'U1', tags: [], parentId: 'f1' }], parentId: 'root' },
                { id: 'f2', name: 'Empty', children: [], parentId: 'root' },
                { id: 'f3', name: 'Nested Empty', children: [{ id: 'f4', name: 'Inner Empty', children: [], parentId: 'f3' }], parentId: 'root' },
            ];
            const cleanedTree = removeEmptyFolders(treeWithEmptyFolders);
            expect(cleanedTree).toHaveLength(1);
            expect((cleanedTree[0] as Folder).name).toBe('Non-Empty');
            expect(cleanedTree.some((f) => (f as Folder).name === 'Nested Empty')).toBe(false);
        });

        it('should canonicalize paths correctly', () => {
            const existingTreeForPath: (Folder | Bookmark)[] = [
                { id: 'f-design', name: 'Design', children: [
                    { id: 'f-tools', name: 'Tools', children: [], parentId: 'f-design' }
                ], parentId: 'root' }
            ];
            
            const bookmarksToStandardize: (Bookmark & { path: string[] })[] = [
                { id: 'b3', title: 'AI Design Tool', url: 'U3', path: ['AI', 'Tools', 'Design'], parentId: null, tags: [] }
            ];
            
            const standardizedTree = arrayToTree(bookmarksToStandardize as any, existingTreeForPath);
            const designFolder = standardizedTree.find(f => !('url' in f) && (f as Folder).name === 'Design') as Folder;
            const toolsInDesign = designFolder?.children.find(f => !('url' in f) && (f as Folder).name === 'Tools') as Folder;
            const aiInTools = toolsInDesign?.children.find(f => !('url' in f) && (f as Folder).name === 'AI') as Folder;
            
            expect(aiInTools).toBeDefined();
        });

        it('should distribute bookmarks by tag schema', () => {
            const mockSchema: TagFolderSchema[] = [
                { name: 'Development', mappedTags: ['coding', 'software'], children: [
                    { name: 'Frontend', mappedTags: ['react', 'vue'], children: [] }
                ]}
            ];
            const bookmarksForTags: Bookmark[] = [
                { id: 't1', title: 'React Docs', url: 'U-R', tags: ['React'], parentId: null },
                { id: 't2', title: 'Random', url: 'U-M', tags: ['random-tag'], parentId: null }
            ];
            const distributed = distributeBookmarksByTagSchema(bookmarksForTags, mockSchema);
            expect(distributed[0].path?.join('/')).toBe('Development/Frontend');
            expect(distributed[1].path).toEqual(['[Unmapped Tags]']);
        });
    });

    describe('Cache Functionality', () => {
        beforeEach(() => {
            cacheStats.reset();
        });

        it('should generate consistent hashes', () => {
            const testData = { bookmarks: [{ id: '1', title: 'Test', url: 'http://test.com' }] };
            const hash1 = generateHash(testData);
            const hash2 = generateHash(testData);
            const hash3 = generateHash({ ...testData, modified: true });

            expect(hash1).toBe(hash2);
            expect(hash1).not.toBe(hash3);
        });

        it('should cache and reuse results', async () => {
            let opCount = 0;
            const mockOp = async () => {
                opCount++;
                return `result-${opCount}`;
            };

            const memoryCache = new MemoryCache<string>(10);
            const cachedOp = new CachedOperation<string>([memoryCache], mockOp);
            
            const res1 = await cachedOp.get('test-key');
            expect(res1).toBe('result-1');
            expect(cacheStats.misses).toBe(1);
            
            const res2 = await cachedOp.get('test-key');
            expect(res2).toBe('result-1');
            expect(cacheStats.hits).toBe(1);
            
            await cachedOp.delete('test-key');
            const res3 = await cachedOp.get('test-key');
            expect(res3).toBe('result-2');
            expect(cacheStats.misses).toBe(2);
        });
    });

    describe('Performance Monitoring', () => {
        it('should time synchronous functions', () => {
            const testFunction = () => {
                let sum = 0;
                for (let i = 0; i < 1000; i++) { sum += i; }
                return sum;
            };

            const result = perfMonitor.timeFunction('test_sync', testFunction);
            expect(result).toBe(499500);
            expect(perfMonitor.getMetricsSummary()['test_sync']).toBeDefined();
        });

        it('should time asynchronous functions', async () => {
            const testAsyncFunction = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'async_result';
            };

            const result = await perfMonitor.timeAsyncFunction('test_async', testAsyncFunction);
            expect(result).toBe('async_result');
            expect(perfMonitor.getMetricsSummary()['test_async']).toBeDefined();
        });
    });
});
