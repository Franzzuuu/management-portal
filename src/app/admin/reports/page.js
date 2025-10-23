'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import DashboardAnalytics from '../../components/DashboardAnalytics';
import AdvancedFilters from '../../components/AdvancedFilters';
import SkeletonLoader from '../../components/SkeletonLoader';

export default function ReportsPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        userStats: {},
        vehicleStats: {},
        accessStats: {},
        violationStats: {},
        recentLogs: [],
        monthlyTrends: []
    });
    const [selectedReport, setSelectedReport] = useState('overview');
    const [showAnalytics, setShowAnalytics] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
    const [isExporting, setIsExporting] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({});
    const [lastUpdate, setLastUpdate] = useState(null);
    const [nextRefresh, setNextRefresh] = useState(null);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: '', // Empty for all-time
        endDate: '' // Empty for all-time
    });
    const [quickDateFilter, setQuickDateFilter] = useState('all-time');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        entriesPerPage: 20,
        totalEntries: 0
    });
    const router = useRouter();

    const fetchReportData = useCallback(async () => {
        setIsDataLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: pagination.currentPage.toString(),
                limit: pagination.entriesPerPage.toString(),
                ...(dateRange.startDate && { startDate: dateRange.startDate }),
                ...(dateRange.endDate && { endDate: dateRange.endDate }),
                ...(advancedFilters.searchTerm && { search: advancedFilters.searchTerm }),
                ...(advancedFilters.status && { status: advancedFilters.status }),
                ...(advancedFilters.designation && { designation: advancedFilters.designation }),
                ...(advancedFilters.vehicleType && { vehicleType: advancedFilters.vehicleType }),
                ...(advancedFilters.entryType && { entryType: advancedFilters.entryType }),
                ...(advancedFilters.location && { location: advancedFilters.location }),
                ...(advancedFilters.violationType && { violationType: advancedFilters.violationType }),
                ...(advancedFilters.sortBy && { sortBy: advancedFilters.sortBy }),
                ...(advancedFilters.sortDir && { sortDir: advancedFilters.sortDir }),
                reportType: selectedReport
            });

            const response = await fetch(`/api/reports?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setReportData(data.reportData);
                setPagination(prev => ({
                    ...prev,
                    totalPages: Math.max(1, Math.ceil(data.totalEntries / pagination.entriesPerPage)),
                    totalEntries: data.totalEntries || 0
                }));
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch report data:', error);
        } finally {
            setIsDataLoading(false);
        }
    }, [dateRange, pagination.currentPage, pagination.entriesPerPage, selectedReport, advancedFilters]);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    }, [router]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (user) {
            fetchReportData();
        }
    }, [user, fetchReportData]);

    // Auto-refresh functionality
    useEffect(() => {
        let interval;
        if (autoRefresh && user) {
            const scheduleNextRefresh = () => {
                setNextRefresh(new Date(Date.now() + refreshInterval));
            };

            scheduleNextRefresh();
            interval = setInterval(() => {
                fetchReportData();
                scheduleNextRefresh();
            }, refreshInterval);
        } else {
            setNextRefresh(null);
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [autoRefresh, refreshInterval, user, fetchReportData]);

    // Quick date filter handler
    const handleQuickDateFilter = (filter) => {
        setQuickDateFilter(filter);
        const now = new Date();
        let startDate = '';
        let endDate = now.toISOString().split('T')[0];

        switch (filter) {
            case 'today':
                startDate = endDate;
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = yesterday.toISOString().split('T')[0];
                endDate = startDate;
                break;
            case 'this-week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startDate = startOfWeek.toISOString().split('T')[0];
                break;
            case 'last-week':
                const lastWeekEnd = new Date(now);
                lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                startDate = lastWeekStart.toISOString().split('T')[0];
                endDate = lastWeekEnd.toISOString().split('T')[0];
                break;
            case 'this-month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                break;
            case 'last-month':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                startDate = lastMonth.toISOString().split('T')[0];
                endDate = lastMonthEnd.toISOString().split('T')[0];
                break;
            case 'last-30-days':
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 30);
                startDate = thirtyDaysAgo.toISOString().split('T')[0];
                break;
            case 'all-time':
            default:
                startDate = '';
                endDate = '';
                break;
        }

        setDateRange({ startDate, endDate });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const exportReport = async (type) => {
        setIsExporting(true);
        try {
            const response = await fetch(`/api/reports/export?type=${type}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&reportType=${selectedReport}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            const fileName = `${selectedReport}-report-${dateRange.startDate || 'all-time'}-to-${dateRange.endDate || 'now'}.${type}`;
            a.download = fileName;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log('Export completed successfully');
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" style={{ color: '#355E3B' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
                                <p className="text-gray-200">System insights and data analysis</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
                    <div className="space-y-4">
                        {/* First Row - Report Type and View Toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                                    <select
                                        value={selectedReport}
                                        onChange={(e) => setSelectedReport(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    >
                                        <option value="overview">System Overview</option>
                                        <option value="users">User Statistics</option>
                                        <option value="vehicles">Vehicle Reports</option>
                                        <option value="access">Access Logs</option>
                                        <option value="violations">Violations</option>
                                    </select>
                                </div>

                                {selectedReport === 'overview' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
                                        <div className="flex bg-gray-100 rounded-lg p-1">
                                            <button
                                                onClick={() => setShowAnalytics(true)}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${showAnalytics
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                Analytics
                                            </button>
                                            <button
                                                onClick={() => setShowAnalytics(false)}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!showAnalytics
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                Summary
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="autoRefresh"
                                        checked={autoRefresh}
                                        onChange={(e) => setAutoRefresh(e.target.checked)}
                                        className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                    />
                                    <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                                        Auto-refresh ({refreshInterval / 1000}s)
                                    </label>
                                </div>
                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 ${showAdvancedFilters
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                    </svg>
                                    <span>Filters</span>
                                    {Object.keys(advancedFilters).filter(key =>
                                        key !== 'sortBy' && key !== 'sortDir' && advancedFilters[key] && advancedFilters[key].trim() !== ''
                                    ).length > 0 && (
                                            <span className="bg-green-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                                {Object.keys(advancedFilters).filter(key =>
                                                    key !== 'sortBy' && key !== 'sortDir' && advancedFilters[key] && advancedFilters[key].trim() !== ''
                                                ).length}
                                            </span>
                                        )}
                                </button>
                                <button
                                    onClick={() => fetchReportData()}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {/* Second Row - Date Filters */}
                        <div className="border-t pt-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quick Filters</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { value: 'all-time', label: 'All Time' },
                                            { value: 'today', label: 'Today' },
                                            { value: 'yesterday', label: 'Yesterday' },
                                            { value: 'this-week', label: 'This Week' },
                                            { value: 'last-week', label: 'Last Week' },
                                            { value: 'this-month', label: 'This Month' },
                                            { value: 'last-month', label: 'Last Month' },
                                            { value: 'last-30-days', label: 'Last 30 Days' }
                                        ].map((filter) => (
                                            <button
                                                key={filter.value}
                                                onClick={() => handleQuickDateFilter(filter.value)}
                                                className={`px-3 py-1 text-xs rounded-full transition-colors ${quickDateFilter === filter.value
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-end gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => {
                                            setDateRange({ ...dateRange, startDate: e.target.value });
                                            setQuickDateFilter('custom');
                                            setPagination(prev => ({ ...prev, currentPage: 1 }));
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => {
                                            setDateRange({ ...dateRange, endDate: e.target.value });
                                            setQuickDateFilter('custom');
                                            setPagination(prev => ({ ...prev, currentPage: 1 }));
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    />
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => exportReport('csv')}
                                        disabled={isExporting}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                    >
                                        {isExporting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Exporting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Export CSV</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => exportReport('pdf')}
                                        disabled={isExporting}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                    >
                                        {isExporting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Exporting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Export PDF</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters */}
                <AdvancedFilters
                    selectedReport={selectedReport}
                    onFiltersChange={setAdvancedFilters}
                    initialFilters={advancedFilters}
                    isVisible={showAdvancedFilters}
                    onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
                />

                {/* Report Content */}
                {selectedReport === 'overview' && (
                    <div className="space-y-6">
                        {/* Analytics Dashboard */}
                        {isDataLoading ? (
                            showAnalytics ? (
                                <SkeletonLoader type="analytics" count={1} />
                            ) : (
                                <>
                                    <SkeletonLoader type="card" count={4} />
                                    <SkeletonLoader type="table" count={1} />
                                </>
                            )
                        ) : showAnalytics ? (
                            <DashboardAnalytics reportData={reportData} dateRange={dateRange} />
                        ) : (
                            <>
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#355E3B' }}>
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                                    <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-lg font-semibold text-gray-900">Peak Hour Activity</h3>
                                                <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>
                                                    {(() => {
                                                        // Calculate peak hour from recent logs
                                                        const hourCounts = {};
                                                        reportData.recentLogs.forEach(log => {
                                                            const hour = new Date(log.timestamp).getHours();
                                                            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                                                        });
                                                        const peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, '0');
                                                        return `${String(peakHour).padStart(2, '0')}:00`;
                                                    })()}
                                                </p>
                                                <p className="text-sm text-gray-500">Most active time</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#FFD700' }}>
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                                    <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
                                                <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>{reportData.userStats.total || 0}</p>
                                                <p className="text-sm text-gray-500">This month</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-blue-500">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-lg font-semibold text-gray-900">Resolution Rate</h3>
                                                <p className="text-3xl font-bold text-blue-500">
                                                    {reportData.violationStats.total > 0
                                                        ? Math.round(((reportData.violationStats.total - reportData.violationStats.pending) / reportData.violationStats.total) * 100)
                                                        : 100}%
                                                </p>
                                                <p className="text-sm text-gray-500">Violations resolved</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-red-500">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 bg-red-500 rounded-lg flex items-center justify-center">
                                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-lg font-semibold text-gray-900">Avg. Daily Access</h3>
                                                <p className="text-3xl font-bold text-red-500">
                                                    {(() => {
                                                        // Calculate average daily access from recent logs (last 30 days)
                                                        const thirtyDaysAgo = new Date();
                                                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                                        const recentLogs = reportData.recentLogs.filter(log =>
                                                            new Date(log.timestamp) >= thirtyDaysAgo
                                                        );
                                                        return Math.round(recentLogs.length / 30) || 0;
                                                    })()}
                                                </p>
                                                <p className="text-sm text-gray-500">Vehicles per day</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="bg-white rounded-xl shadow-lg">
                                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                        <h3 className="text-lg font-semibold text-white">Recent System Activity</h3>
                                        <p className="text-sm" style={{ color: '#FFD700' }}>Latest access logs and system events</p>
                                    </div>
                                    <div className="p-6">
                                        {reportData.recentLogs.length > 0 ? (
                                            <div className="space-y-3">
                                                {reportData.recentLogs.map((log, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`h-2 w-2 rounded-full ${log.entry_type === 'entry' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{log.plate_number}</p>
                                                                <p className="text-xs text-gray-500">{log.user_name} • {log.entry_type}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-4">No recent activity</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Pagination Controls */}
                        <div className="mt-6 bg-white rounded-xl shadow-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-6">
                                <div className="mb-4 sm:mb-0">
                                    <p className="text-sm text-gray-700">
                                        Showing{' '}
                                        <span className="font-medium">
                                            {((pagination.currentPage - 1) * pagination.entriesPerPage) + 1}
                                        </span>
                                        {' '}-{' '}
                                        <span className="font-medium">
                                            {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)}
                                        </span>
                                        {' '}of{' '}
                                        <span className="font-medium">{pagination.totalEntries}</span> entries
                                    </p>
                                </div>
                                <div className="flex flex-1 justify-between sm:justify-end">
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                                            disabled={pagination.currentPage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {(() => {
                                            const pageNumbers = [];
                                            const maxVisiblePages = 5;
                                            const totalPages = Math.max(1, pagination.totalPages || 1);

                                            let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
                                            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                            if (endPage - startPage + 1 < maxVisiblePages) {
                                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                            }

                                            for (let i = startPage; i <= endPage; i++) {
                                                pageNumbers.push(
                                                    <button
                                                        key={i}
                                                        onClick={() => setPagination(prev => ({ ...prev, currentPage: i }))}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pagination.currentPage === i
                                                            ? 'z-10 bg-green-600 text-white'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                            }`}
                                                    >
                                                        {i}
                                                    </button>
                                                );
                                            }
                                            return pageNumbers;
                                        })()}
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* User Statistics Report */}
                {selectedReport === 'users' && (
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">User Statistics</h3>
                            <p className="text-sm" style={{ color: '#FFD700' }}>Breakdown by designation and status</p>
                        </div>
                        <div className="p-6">
                            {isDataLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SkeletonLoader type="card" count={3} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-blue-800">Students</h4>
                                        <p className="text-3xl font-bold text-blue-600">{reportData.userStats.students || 0}</p>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-green-800">Faculty</h4>
                                        <p className="text-3xl font-bold text-green-600">{reportData.userStats.faculty || 0}</p>
                                    </div>
                                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-purple-800">Staff</h4>
                                        <p className="text-3xl font-bold text-purple-600">{reportData.userStats.staff || 0}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Vehicle Reports */}
                {selectedReport === 'vehicles' && (
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #FFD700 0%, #e6c200 100%)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>Vehicle Reports</h3>
                            <p className="text-sm" style={{ color: '#355E3B' }}>Vehicle registrations and status breakdown</p>
                        </div>
                        <div className="p-6">
                            {isDataLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SkeletonLoader type="card" count={2} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-green-800">2-Wheel Vehicles</h4>
                                        <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>{reportData.vehicleStats.twoWheel || 0}</p>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-blue-800">4-Wheel Vehicles</h4>
                                        <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>{reportData.vehicleStats.fourWheel || 0}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Access Logs Report */}
                {selectedReport === 'access' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-lg">
                            <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                <h3 className="text-lg font-semibold text-white">Access Logs</h3>
                                <p className="text-sm" style={{ color: '#FFD700' }}>Vehicle entry and exit records</p>
                            </div>
                            <div className="p-6">
                                {reportData.recentLogs.length > 0 ? (
                                    <div className="space-y-3">
                                        {reportData.recentLogs.map((log, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`h-2 w-2 rounded-full ${log.entry_type === 'entry' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{log.plate_number}</p>
                                                        <p className="text-xs text-gray-500">{log.user_name} • {log.entry_type}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No access logs found for the selected period</p>
                                )}
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="mt-6 bg-white rounded-xl shadow-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-6">
                                <div className="mb-4 sm:mb-0">
                                    <p className="text-sm text-gray-700">
                                        Showing{' '}
                                        <span className="font-medium">
                                            {((pagination.currentPage - 1) * pagination.entriesPerPage) + 1}
                                        </span>
                                        {' '}-{' '}
                                        <span className="font-medium">
                                            {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)}
                                        </span>
                                        {' '}of{' '}
                                        <span className="font-medium">{pagination.totalEntries}</span> entries
                                    </p>
                                </div>
                                <div className="flex flex-1 justify-between sm:justify-end">
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                                            disabled={pagination.currentPage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {(() => {
                                            const pageNumbers = [];
                                            const maxVisiblePages = 5;
                                            const totalPages = Math.max(1, pagination.totalPages || 1);

                                            let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
                                            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                            if (endPage - startPage + 1 < maxVisiblePages) {
                                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                            }

                                            for (let i = startPage; i <= endPage; i++) {
                                                pageNumbers.push(
                                                    <button
                                                        key={i}
                                                        onClick={() => setPagination(prev => ({ ...prev, currentPage: i }))}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pagination.currentPage === i
                                                            ? 'z-10 bg-green-600 text-white'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                            }`}
                                                    >
                                                        {i}
                                                    </button>
                                                );
                                            }
                                            return pageNumbers;
                                        })()}
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Violations Report */}
                {selectedReport === 'violations' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-lg">
                            <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                <h3 className="text-lg font-semibold text-white">Violations</h3>
                                <p className="text-sm" style={{ color: '#FFD700' }}>Vehicle and parking violations</p>
                            </div>
                            <div className="p-6">
                                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="text-center p-4 bg-red-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-red-800">Total Violations</h4>
                                        <p className="text-3xl font-bold text-red-600">{reportData.violationStats.total || 0}</p>
                                    </div>
                                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-yellow-800">Pending</h4>
                                        <p className="text-3xl font-bold text-yellow-600">{reportData.violationStats.pending || 0}</p>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <h4 className="text-lg font-semibold text-green-800">Resolved</h4>
                                        <p className="text-3xl font-bold text-green-600">
                                            {(reportData.violationStats.total || 0) - (reportData.violationStats.pending || 0)}
                                        </p>
                                    </div>
                                </div>

                                {reportData.recentLogs.length > 0 ? (
                                    <div className="space-y-3">
                                        {reportData.recentLogs.map((log, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{log.plate_number}</p>
                                                        <p className="text-xs text-gray-500">{log.user_name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(log.timestamp).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No violations found for the selected period</p>
                                )}
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="mt-6 bg-white rounded-xl shadow-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-6">
                                <div className="mb-4 sm:mb-0">
                                    <p className="text-sm text-gray-700">
                                        Showing{' '}
                                        <span className="font-medium">
                                            {((pagination.currentPage - 1) * pagination.entriesPerPage) + 1}
                                        </span>
                                        {' '}-{' '}
                                        <span className="font-medium">
                                            {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)}
                                        </span>
                                        {' '}of{' '}
                                        <span className="font-medium">{pagination.totalEntries}</span> entries
                                    </p>
                                </div>
                                <div className="flex flex-1 justify-between sm:justify-end">
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                                            disabled={pagination.currentPage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {(() => {
                                            const pageNumbers = [];
                                            const maxVisiblePages = 5;
                                            const totalPages = Math.max(1, pagination.totalPages || 1);

                                            let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
                                            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                            if (endPage - startPage + 1 < maxVisiblePages) {
                                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                            }

                                            for (let i = startPage; i <= endPage; i++) {
                                                pageNumbers.push(
                                                    <button
                                                        key={i}
                                                        onClick={() => setPagination(prev => ({ ...prev, currentPage: i }))}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pagination.currentPage === i
                                                            ? 'z-10 bg-green-600 text-white'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                            }`}
                                                    >
                                                        {i}
                                                    </button>
                                                );
                                            }
                                            return pageNumbers;
                                        })()}
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* More report types can be added here */}
            </main>
        </div>
    );
}