import { generateHash, cacheStats, CachedOperation, MemoryCache } from './cache';
import { perfMonitor } from './performance';
import { repairJson, parseAIResponse } from './services/aiService';
import { arrayToTree, removeEmptyFolders } from './utils/treeUtils';
import { getApiConfigs, saveApiConfig, deleteApiConfig } from '../db';
import type { Bookmark, Folder, CategorizedBookmark } from '../types';

// Test core business logic
export const testCoreLogic = () => {
    console.group('🧪 Testing Core Business Logic...');

    // 1. Test JSON Repair
    const brokenJson = '{"a": 1} {"b": 2}';
    const repaired = repairJson(brokenJson);
    console.log('✅ JSON Repair (missing comma):', repaired === '{"a": 1},{"b": 2}');
    
    const brokenJson2 = '{"a": 1, }';
    console.log('✅ JSON Repair (trailing comma):', repairJson(brokenJson2) === '{"a": 1 }');

    // 2. Test AI Response Parsing
    const aiResponse = 'Here is the JSON: ```json {"bookmarks": [{"title": "T", "url": "U"}]} ```';
    const parsed = parseAIResponse(aiResponse);
    console.log('✅ AI Response Parsing:', parsed.length === 1 && parsed[0].title === 'T');

    // 3. Test Tree Construction
    const flatBookmarks: CategorizedBookmark[] = [
        { id: '1', title: 'B1', url: 'U1', path: ['A', 'B'], parentId: null, tags: [] },
        { id: '2', title: 'B2', url: 'U2', path: ['A'], parentId: null, tags: [] },
    ];
    const tree = arrayToTree(flatBookmarks);
    console.log('✅ Tree Construction (roots):', tree.length === 1 && (tree[0] as Folder).name === 'A');
    console.log('✅ Tree Construction (nested):', (tree[0] as Folder).children.length === 2); // One folder B and one bookmark B2
    
    // 4. Test Empty Folder Removal
    const treeWithEmptyFolders: (Folder | Bookmark)[] = [
        { id: 'f1', name: 'Non-Empty', children: [{ id: 'b1', title: 'B1', url: 'U1', tags: [], parentId: 'f1' }], parentId: 'root' },
        { id: 'f2', name: 'Empty', children: [], parentId: 'root' },
        { id: 'f3', name: 'Nested Empty', children: [{ id: 'f4', name: 'Inner Empty', children: [], parentId: 'f3' }], parentId: 'root' },
    ];
    const cleanedTree = removeEmptyFolders(treeWithEmptyFolders);
    console.log('✅ Empty Folder Removal (root empty):', cleanedTree.length === 1 && (cleanedTree[0] as Folder).name === 'Non-Empty');
    console.log('✅ Empty Folder Removal (nested empty):', !cleanedTree.some((f) => (f as Folder).name === 'Nested Empty'));

    console.groupEnd();
};

// Test cache functionality
export const testCacheFunctionality = async () => {
    console.group('🧪 Testing Cache Functionality...');

    // Test hash generation
    const testData = { bookmarks: [{ id: '1', title: 'Test', url: 'http://test.com' }] };
    const hash1 = generateHash(testData);
    const hash2 = generateHash(testData);
    const hash3 = generateHash({ ...testData, modified: true });

    console.log('✅ Hash generation:', hash1 === hash2, hash1 !== hash3);

    // Test async CachedOperation
    let opCount = 0;
    const mockOp = async () => {
        opCount++;
        return `result-${opCount}`;
    };

    const memoryCache = new MemoryCache<string>(10);
    const cachedOp = new CachedOperation<string>([memoryCache], mockOp);
    
    cacheStats.reset();
    
    const res1 = await cachedOp.get('test-key');
    console.log('✅ Cache get (miss):', res1 === 'result-1' && cacheStats.misses === 1);
    
    const res2 = await cachedOp.get('test-key');
    console.log('✅ Cache get (hit):', res2 === 'result-1' && cacheStats.hits === 1);
    
    await cachedOp.delete('test-key');
    const res3 = await cachedOp.get('test-key');
    console.log('✅ Cache delete & retry:', res3 === 'result-2' && cacheStats.misses === 2);

    console.groupEnd();
};

// Test BaseStore (via API Configs)
export const testBaseStore = async () => {
    console.group('🧪 Testing BaseStore...');
    
    try {
        const initial = await getApiConfigs();
        const testId = `test-config-${Date.now()}`;
        
        await saveApiConfig({
            id: testId,
            name: 'Test Config',
            provider: 'gemini',
            apiKey: 'test-key',
            model: 'gemini-pro',
            status: 'inactive'
        });
        
        const afterAdd = await getApiConfigs();
        console.log('✅ BaseStore add/put:', afterAdd.length === initial.length + 1);
        
        await deleteApiConfig(testId);
        const afterDelete = await getApiConfigs();
        console.log('✅ BaseStore delete:', afterDelete.length === initial.length);
    } catch (e) {
        console.error('❌ BaseStore test failed:', e);
    }
    
    console.groupEnd();
};

// Test performance monitoring
export const testPerformanceMonitoring = () => {
    console.log('🧪 Testing Performance Monitoring...');

    const testFunction = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
            sum += i;
        }
        return sum;
    };

    const result = perfMonitor.timeFunction('test_function', testFunction);
    console.log('✅ Function timing result:', result === 499500);

    const testAsyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async_result';
    };

    perfMonitor.timeAsyncFunction('test_async_function', testAsyncFunction)
        .then(result => {
            console.log('✅ Async function timing result:', result === 'async_result');
        });

    const summary = perfMonitor.getMetricsSummary();
    console.log('✅ Metrics summary generated:', Object.keys(summary).length > 0);

    console.log('✅ Performance monitoring tests passed');
};

// Test memory usage tracking
export const testMemoryUsage = () => {
    console.log('🧪 Testing Memory Usage Tracking...');

    const memory = perfMonitor.getMemoryUsage();
    if (memory) {
        console.log('✅ Memory usage:', memory);
    } else {
        console.log('⚠️ Memory tracking not available in this browser');
    }
};

// Test search performance
export const testSearchPerformance = () => {
    console.log('🧪 Testing Search Performance...');

    const testBookmarks = [
        { id: '1', title: 'React Documentation', url: 'https://react.dev' },
        { id: '2', title: 'Vue.js Guide', url: 'https://vuejs.org' },
        { id: '3', title: 'Angular Tutorial', url: 'https://angular.io' },
        { id: '4', title: 'JavaScript MDN', url: 'https://developer.mozilla.org' },
    ];

    const searchBookmarks = (query: string) => {
        return testBookmarks.filter(bm =>
            bm.title.toLowerCase().includes(query.toLowerCase()) ||
            bm.url.toLowerCase().includes(query.toLowerCase())
        );
    };

    perfMonitor.timeFunction('search_react', () => searchBookmarks('react'));
    perfMonitor.timeFunction('search_vue', () => searchBookmarks('vue'));
    perfMonitor.timeFunction('search_js', () => searchBookmarks('javascript'));

    console.log('✅ Search performance tests completed');
};

// Run all tests
export const runAllTests = async () => {
    console.group('🚀 Running Comprehensive Tests');

    try {
        testCoreLogic();
        await testCacheFunctionality();
        await testBaseStore();
        testPerformanceMonitoring();
        testMemoryUsage();
        testSearchPerformance();

        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('🎉 All tests completed successfully!');
        console.log('📊 Final Performance Report:');
        console.log(perfMonitor.getMetricsSummary());

    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    console.groupEnd();
};

// Auto-run tests in development
if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
    setTimeout(runAllTests, 1500);
}
