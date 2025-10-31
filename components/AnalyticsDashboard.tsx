import React, { useState, useEffect, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import type { Bookmark, Folder, AnalyticsData } from '@/types';
import * as db from '@/db';
import { ChartIcon } from './Icons';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface AnalyticsDashboardProps {
    bookmarks: Bookmark[];
    folders: (Folder | Bookmark)[];
    onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    bookmarks,
    folders,
    onClose
}) => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        calculateAnalytics();
    }, [bookmarks, folders]);

    const calculateAnalytics = async () => {
        setIsLoading(true);

        // Calculate basic stats
        const totalBookmarks = bookmarks.length;
        const totalFolders = folders.filter(item => 'children' in item).length;
        const avgBookmarksPerFolder = totalFolders > 0 ? totalBookmarks / totalFolders : 0;

        // Calculate top domains
        const domainMap = new Map<string, number>();
        bookmarks.forEach(bookmark => {
            try {
                const url = new URL(bookmark.url);
                const domain = url.hostname;
                domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
            } catch (e) {
                // Invalid URL, skip
            }
        });
        const topDomains = Array.from(domainMap.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([domain, count]) => ({ domain, count }));

        // Calculate folder distribution
        const folderDistribution = folders
            .filter(item => 'children' in item)
            .map(folder => {
                const bookmarkCount = getBookmarksInFolder(folder as Folder).length;
                return { folder: (folder as Folder).name, count: bookmarkCount };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate tag usage
        const tagMap = new Map<string, number>();
        bookmarks.forEach(bookmark => {
            if (bookmark.tags) {
                bookmark.tags.forEach(tag => {
                    tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
                });
            }
        });
        const tagUsage = Array.from(tagMap.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));

        // Get AI performance data from logs
        const logs = await db.getLogs();
        const aiRequests = logs.filter(log => log.type === 'request' && log.title.includes('Request'));
        const aiResponses = logs.filter(log => log.type === 'response' && log.title.includes('Response'));

        const totalRequests = aiRequests.length;
        const successRate = totalRequests > 0 ? (aiResponses.length / totalRequests) * 100 : 0;

        // Calculate average tokens per request
        const tokenUsages = logs
            .filter(log => log.usage)
            .map(log => log.usage!.totalTokens);
        const avgTokensPerRequest = tokenUsages.length > 0
            ? tokenUsages.reduce((sum, tokens) => sum + tokens, 0) / tokenUsages.length
            : 0;

        // Get user corrections for accuracy score
        const corrections = await db.getUserCorrections();
        const accuracyScore = totalRequests > 0
            ? ((totalRequests - corrections.length) / totalRequests) * 100
            : 100;

        // Mock usage stats (in a real app, these would be tracked)
        const usageStats = {
            totalSessions: 1, // Would be tracked
            avgSessionDuration: 0, // Would be tracked
            mostUsedFeatures: ['Import', 'Restructure', 'Export'], // Would be tracked
            importCount: logs.filter(log => log.title.includes('Import')).length,
            exportCount: logs.filter(log => log.title.includes('Export')).length,
        };

        // Mock growth trends (in a real app, historical data would be stored)
        const growthTrends = [
            { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 10), folders: Math.max(0, totalFolders - 2) },
            { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 8), folders: Math.max(0, totalFolders - 1) },
            { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 6), folders: totalFolders },
            { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 4), folders: totalFolders },
            { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: Math.max(0, totalBookmarks - 2), folders: totalFolders },
            { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], bookmarks: totalBookmarks, folders: totalFolders },
            { date: new Date().toISOString().split('T')[0], bookmarks: totalBookmarks, folders: totalFolders },
        ];

        const analytics: AnalyticsData = {
            totalBookmarks,
            totalFolders,
            avgBookmarksPerFolder,
            topDomains,
            folderDistribution,
            tagUsage,
            aiPerformance: {
                totalRequests,
                successRate,
                avgTokensPerRequest,
                accuracyScore,
            },
            usageStats,
            growthTrends,
        };

        setAnalyticsData(analytics);
        await db.saveAnalyticsData(analytics);
        setIsLoading(false);
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
    };

    const domainChartData = useMemo(() => ({
        labels: analyticsData?.topDomains.map(d => d.domain) || [],
        datasets: [{
            label: 'Bookmarks per Domain',
            data: analyticsData?.topDomains.map(d => d.count) || [],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
        }],
    }), [analyticsData]);

    const folderChartData = useMemo(() => ({
        labels: analyticsData?.folderDistribution.map(f => f.folder) || [],
        datasets: [{
            label: 'Bookmarks per Folder',
            data: analyticsData?.folderDistribution.map(f => f.count) || [],
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
        }],
    }), [analyticsData]);

    const growthChartData = useMemo(() => ({
        labels: analyticsData?.growthTrends.map(t => t.date) || [],
        datasets: [
            {
                label: 'Bookmarks',
                data: analyticsData?.growthTrends.map(t => t.bookmarks) || [],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
            },
            {
                label: 'Folders',
                data: analyticsData?.growthTrends.map(t => t.folders) || [],
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                tension: 0.1,
            },
        ],
    }), [analyticsData]);

    const tagChartData = useMemo(() => ({
        labels: analyticsData?.tagUsage.map(t => t.tag) || [],
        datasets: [{
            label: 'Tag Usage',
            data: analyticsData?.tagUsage.map(t => t.count) || [],
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 205, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)',
                'rgba(255, 159, 64, 0.5)',
                'rgba(201, 203, 207, 0.5)',
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 205, 86, 0.5)',
            ],
            borderWidth: 1,
        }],
    }), [analyticsData]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-[#282C34] p-6 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="text-center text-white">Đang tính toán phân tích...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#282C34] p-6 rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <ChartIcon className="w-6 h-6 mr-2" />
                        Phân tích dữ liệu
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white">Tổng Bookmark</h3>
                        <p className="text-2xl font-bold text-emerald-400">{analyticsData?.totalBookmarks}</p>
                    </div>
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white">Tổng Thư mục</h3>
                        <p className="text-2xl font-bold text-blue-400">{analyticsData?.totalFolders}</p>
                    </div>
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white">TB Bookmark/Thư mục</h3>
                        <p className="text-2xl font-bold text-purple-400">{analyticsData?.avgBookmarksPerFolder.toFixed(1)}</p>
                    </div>
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white">Độ chính xác AI</h3>
                        <p className="text-2xl font-bold text-yellow-400">{analyticsData?.aiPerformance.accuracyScore.toFixed(1)}%</p>
                    </div>
                </div>

                {/* AI Performance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white">Tổng yêu cầu AI</h3>
                        <p className="text-xl font-bold text-cyan-400">{analyticsData?.aiPerformance.totalRequests}</p>
                    </div>
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white">Tỷ lệ thành công</h3>
                        <p className="text-xl font-bold text-green-400">{analyticsData?.aiPerformance.successRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white">TB Token/yêu cầu</h3>
                        <p className="text-xl font-bold text-orange-400">{analyticsData?.aiPerformance.avgTokensPerRequest.toFixed(0)}</p>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Domain Distribution */}
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Top 10 Domain</h3>
                        <Bar data={domainChartData} options={chartOptions} />
                    </div>

                    {/* Folder Distribution */}
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Phân bố Bookmark theo Thư mục</h3>
                        <Bar data={folderChartData} options={chartOptions} />
                    </div>

                    {/* Growth Trends */}
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Xu hướng tăng trưởng</h3>
                        <Line data={growthChartData} options={chartOptions} />
                    </div>

                    {/* Tag Usage */}
                    <div className="bg-[#1E2127] p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Sử dụng Tag</h3>
                        <Doughnut data={tagChartData} options={chartOptions} />
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-[#1E2127] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Thống kê sử dụng</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-gray-400">Số lần Import</p>
                            <p className="text-xl font-bold text-white">{analyticsData?.usageStats.importCount}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Số lần Export</p>
                            <p className="text-xl font-bold text-white">{analyticsData?.usageStats.exportCount}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Tính năng phổ biến</p>
                            <p className="text-sm text-white">{analyticsData?.usageStats.mostUsedFeatures.join(', ')}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Tổng phiên</p>
                            <p className="text-xl font-bold text-white">{analyticsData?.usageStats.totalSessions}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to count bookmarks in a folder recursively
function getBookmarksInFolder(folder: Folder): Bookmark[] {
    let bookmarks: Bookmark[] = [];

    function recurse(current: Folder | Bookmark) {
        if ('url' in current) {
            bookmarks.push(current);
        } else if (current.children) {
            current.children.forEach(recurse);
        }
    }

    if (folder.children) {
        folder.children.forEach(recurse);
    }

    return bookmarks;
}

export default AnalyticsDashboard;
