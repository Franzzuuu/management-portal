'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

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
    const [dateRange, setDateRange] = useState({
        startDate: '', // Empty for all-time
        endDate: '' // Empty for all-time
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        entriesPerPage: 20,
        totalEntries: 0
    });
    const router = useRouter();

    const fetchReportData = useCallback(async () => {
        try {
            const queryParams = new URLSearchParams({
                page: pagination.currentPage.toString(),
                limit: pagination.entriesPerPage.toString(),
                ...(dateRange.startDate && { startDate: dateRange.startDate }),
                ...(dateRange.endDate && { endDate: dateRange.endDate })
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
            }
        } catch (error) {
            console.error('Failed to fetch report data:', error);
        }
    }, [dateRange, pagination.currentPage, pagination.entriesPerPage]);

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

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const exportReport = async (type) => {
        try {
            const response = await fetch(`/api/reports/export?type=${type}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${type}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Optional)</label>
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, startDate: e.target.value });
                                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-400"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, endDate: e.target.value });
                                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-400"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => exportReport('csv')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 hover:cursor-pointer"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Report Content */}
                {selectedReport === 'overview' && (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#355E3B' }}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                            <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
                                        <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>{reportData.userStats.total || 0}</p>
                                        <p className="text-sm text-gray-500">+{reportData.userStats.newThisMonth || 0} this month</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#FFD700' }}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                            <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
                                        <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>{reportData.vehicleStats.total || 0}</p>
                                        <p className="text-sm text-gray-500">{reportData.vehicleStats.approved || 0} approved</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-blue-500">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Access Logs</h3>
                                        <p className="text-3xl font-bold text-blue-500">{reportData.accessStats.total || 0}</p>
                                        <p className="text-sm text-gray-500">Last 30 days</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-red-500">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 bg-red-500 rounded-lg flex items-center justify-center">
                                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Violations</h3>
                                        <p className="text-3xl font-bold text-red-500">{reportData.violationStats.total || 0}</p>
                                        <p className="text-sm text-gray-500">{reportData.violationStats.pending || 0} pending</p>
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

                        {/* Pagination Controls */}
                        <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl shadow-lg">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                                    disabled={pagination.currentPage === 1}
                                    className="relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
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
                                <div>
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
                                        {/* Page numbers */}
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
                        <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl shadow-lg">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                                    disabled={pagination.currentPage === 1}
                                    className="relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
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
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        {/* Same pagination controls as in the overview section */}
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

                        {/* Same pagination controls as above */}
                        <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl shadow-lg">
                            {/* ... (copy the same pagination controls from above) ... */}
                        </div>
                    </div>
                )}

                {/* More report types can be added here */}
            </main>
        </div>
    );
}