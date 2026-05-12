import { describe, it, expect } from 'vitest';
import { repairJson, parseAIResponse } from '@/src/services/aiService';
import { arrayToTree } from '@/src/utils/treeUtils';

describe('Core Logic', () => {
    describe('repairJson', () => {
        it('should fix missing commas between objects', () => {
            const brokenJson = '{"a": 1} {"b": 2}';
            expect(repairJson(brokenJson)).toBe('{"a": 1},{"b": 2}');
        });

        it('should remove trailing commas', () => {
            const brokenJson = '{"a": 1, }';
            expect(repairJson(brokenJson)).toBe('{"a": 1 }');
        });
    });

    describe('parseAIResponse', () => {
        it('should extract JSON from markdown blocks', () => {
            const aiResponse = 'Here is the JSON: ```json {"bookmarks": [{"title": "T", "url": "U"}]} ```';
            const parsed = parseAIResponse(aiResponse);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].title).toBe('T');
        });

        it('should handle raw JSON response', () => {
            const aiResponse = '{"bookmarks": [{"title": "T", "url": "U"}]}';
            const parsed = parseAIResponse(aiResponse);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].title).toBe('T');
        });
    });

    describe('arrayToTree', () => {
        it('should construct a hierarchy from flat bookmarks', () => {
            const flatBookmarks = [
                { id: '1', title: 'B1', url: 'U1', path: ['A', 'B'], parentId: null },
                { id: '2', title: 'B2', url: 'U2', path: ['A'], parentId: null },
            ];
            const tree = arrayToTree(flatBookmarks as any);
            
            // Should have 1 root folder "A"
            expect(tree).toHaveLength(1);
            const folderA = tree[0] as any;
            expect(folderA.name).toBe('A');
            
            // Folder A should have 2 children: folder B and bookmark B2
            expect(folderA.children).toHaveLength(2);
            
            const folderB = folderA.children.find((c: any) => c.name === 'B');
            expect(folderB).toBeDefined();
            expect(folderB.children).toHaveLength(1);
            expect(folderB.children[0].title).toBe('B1');
        });
    });
});
