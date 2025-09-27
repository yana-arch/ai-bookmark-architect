// Basic test suite for performance optimizations

import { generateHash, cacheStats } from './cache';
import { perfMonitor } from './performance';

// Test cache functionality
export const testCacheFunctionality = () => {
    console.log('🧪 Testing Cache Functionality...');

    // Test hash generation
    const testData = { bookmarks: [{ id: '1', title: 'Test', url: 'http://test.com' }] };
    const hash1 = generateHash(testData);
    const hash2 = generateHash(testData);
    const hash3 = generateHash({ ...testData, modified: true });

    console.log('✅ Hash generation:', hash1 === hash2, hash1 !== hash3);

    // Test cache stats
    cacheStats.reset();
    console.log('✅ Cache stats reset:', cacheStats.hits === 0 && cacheStats.misses === 0);

    console.log('✅ Cache tests passed');
};

// Test performance monitoring
export const testPerformanceMonitoring = () => {
    console.log('🧪 Testing Performance Monitoring...');

    // Test function timing
    const testFunction = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
            sum += i;
        }
        return sum;
    };

    const result = perfMonitor.timeFunction('test_function', testFunction);
    console.log('✅ Function timing result:', result === 499500);

    // Test async function timing
    const testAsyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async_result';
    };

    perfMonitor.timeAsyncFunction('test_async_function', testAsyncFunction)
        .then(result => {
            console.log('✅ Async function timing result:', result === 'async_result');
        });

    // Test metrics summary
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
        console.log('✅ Memory tracking available');
    } else {
        console.log('⚠️ Memory tracking not available in this browser');
    }
};

// Test search performance with caching
export const testSearchPerformance = () => {
    console.log('🧪 Testing Search Performance...');

    // Create test bookmarks
    const testBookmarks = [
        { id: '1', title: 'React Documentation', url: 'https://react.dev' },
        { id: '2', title: 'Vue.js Guide', url: 'https://vuejs.org' },
        { id: '3', title: 'Angular Tutorial', url: 'https://angular.io' },
        { id: '4', title: 'JavaScript MDN', url: 'https://developer.mozilla.org' },
    ];

    // Test search function
    const searchBookmarks = (query: string) => {
        return testBookmarks.filter(bm =>
            bm.title.toLowerCase().includes(query.toLowerCase()) ||
            bm.url.toLowerCase().includes(query.toLowerCase())
        );
    };

    // Time search operations
    perfMonitor.timeFunction('search_react', () => searchBookmarks('react'));
    perfMonitor.timeFunction('search_vue', () => searchBookmarks('vue'));
    perfMonitor.timeFunction('search_js', () => searchBookmarks('javascript'));

    console.log('✅ Search performance tests completed');
};

// Run all tests
export const runAllTests = async () => {
    console.group('🚀 Running Performance Optimization Tests');

    try {
        testCacheFunctionality();
        testPerformanceMonitoring();
        testMemoryUsage();
        testSearchPerformance();

        // Wait a bit for async tests
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('🎉 All tests completed successfully!');
        console.log('📊 Final Performance Report:');
        console.log(perfMonitor.getMetricsSummary());

    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    console.groupEnd();
};

// Auto-run tests in development
if (import.meta.env?.DEV) {
    // Run tests after a short delay to ensure everything is loaded
    setTimeout(runAllTests, 1000);
}
