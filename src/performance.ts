// Performance monitoring utilities

interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    type: 'duration' | 'count' | 'size';
}

class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private maxMetrics = 1000;

    // Track function execution time
    timeFunction<T>(name: string, fn: () => T): T {
        const start = performance.now();
        try {
            const result = fn();
            const duration = performance.now() - start;
            this.recordMetric(name, duration, 'duration');
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(`${name}_error`, duration, 'duration');
            throw error;
        }
    }

    // Track async function execution time
    async timeAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.recordMetric(name, duration, 'duration');
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(`${name}_error`, duration, 'duration');
            throw error;
        }
    }

    // Record a custom metric
    recordMetric(name: string, value: number, type: 'duration' | 'count' | 'size' = 'count') {
        this.metrics.push({
            name,
            value,
            timestamp: Date.now(),
            type
        });

        // Keep only recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }

    // Get metrics summary
    getMetricsSummary(hours: number = 1): Record<string, any> {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

        const summary: Record<string, any> = {};

        // Group by metric name
        const grouped = recentMetrics.reduce((acc, metric) => {
            if (!acc[metric.name]) {
                acc[metric.name] = [];
            }
            acc[metric.name].push(metric);
            return acc;
        }, {} as Record<string, PerformanceMetric[]>);

        // Calculate statistics for each metric
        Object.entries(grouped).forEach(([name, metrics]) => {
            const values = metrics.map(m => m.value);
            const type = metrics[0].type;

            summary[name] = {
                type,
                count: metrics.length,
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                last: values[values.length - 1],
                trend: values.length > 1 ?
                    (values[values.length - 1] - values[values.length - 2]) / values[values.length - 2] * 100 : 0
            };
        });

        return summary;
    }

    // Get memory usage
    getMemoryUsage() {
        if ('memory' in performance) {
            const mem = (performance as any).memory;
            return {
                used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
                total: Math.round(mem.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
                usagePercent: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100)
            };
        }
        return null;
    }

    // Clear all metrics
    clear() {
        this.metrics = [];
    }

    // Export metrics for analysis
    exportMetrics() {
        return {
            metrics: this.metrics,
            memory: this.getMemoryUsage(),
            summary: this.getMetricsSummary()
        };
    }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// Performance tracking decorators/utilities
export const withPerformanceTracking = <T extends any[], R>(
    name: string,
    fn: (...args: T) => R
) => {
    return (...args: T): R => {
        return perfMonitor.timeFunction(name, () => fn(...args));
    };
};

export const withAsyncPerformanceTracking = <T extends any[], R>(
    name: string,
    fn: (...args: T) => Promise<R>
) => {
    return async (...args: T): Promise<R> => {
        return perfMonitor.timeAsyncFunction(name, () => fn(...args));
    };
};

// React hook for performance monitoring
export const usePerformanceTracking = () => {
    const trackRender = (componentName: string) => {
        perfMonitor.recordMetric(`${componentName}_render`, 1, 'count');
    };

    const trackInteraction = (interactionName: string) => {
        perfMonitor.recordMetric(`interaction_${interactionName}`, 1, 'count');
    };

    const getMetrics = () => perfMonitor.getMetricsSummary();

    const getMemoryUsage = () => perfMonitor.getMemoryUsage();

    return {
        trackRender,
        trackInteraction,
        getMetrics,
        getMemoryUsage
    };
};

// Performance reporting
export const logPerformanceReport = () => {
    const summary = perfMonitor.getMetricsSummary();
    const memory = perfMonitor.getMemoryUsage();

    console.group('🚀 Performance Report');
    console.log('📊 Metrics Summary:', summary);
    if (memory) {
        console.log('💾 Memory Usage:', memory);
    }
    console.groupEnd();
};

// Auto-report performance every 5 minutes
setInterval(logPerformanceReport, 5 * 60 * 1000);
