'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import DeleteLogsModal from '../../components/DeleteLogsModal';
import Toast from '../../components/Toast';
import useSocketChannel from '../../../hooks/useSocketChannel';

export default function AccessLogsPage() {
    const [user, setUser] = useState(null);
    const [accessLogs, setAccessLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('today');
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage] = useState(10);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const router = useRouter();

    // Function definitions
    const fetchAccessLogs = useCallback(async () => {
        try {
            const response = await fetch('/api/access-logs');
            const data = await response.json();

            if (data.success) {
                setAccessLogs(data.logs);
                setFilteredLogs(data.logs);
            }
        } catch (error) {
            console.error('Failed to fetch access logs:', error);
        }
    }, []);

    // Real-time Socket.IO integration
    const { connected } = useSocketChannel('access_logs', {
        // Handle new log entries
        update: (record) => {
            console.log('Received access_logs:update:', record);
            setAccessLogs(prevLogs => {
                const existingIds = new Set(prevLogs.map(log => log.id));
                if (!existingIds.has(record.id)) {
                    return [record, ...prevLogs];
                }
                return prevLogs;
            });
        },

        // Handle refresh requests (after deletions)
        refresh: (data) => {
            console.log('Received access_logs:refresh:', data);
            fetchAccessLogs();

            // Show success toast for deletion
            if (data.action === 'bulk_delete') {
                setToast({
                    show: true,
                    message: `Successfully deleted ${data.deletedCount} access log${data.deletedCount !== 1 ? 's' : ''} using ${data.method}`,
                    type: 'success'
                });
            }
        }
    }, {
        enablePollingFallback: true,
        pollFn: () => {
            console.log('Polling fallback: fetching access logs');
            fetchAccessLogs();
        },
        pollIntervalMs: 5000
    });

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success) {
                if (data.user.designation !== 'Admin') {
                    router.push('/login');
                    return;
                }
                setUser(data.user);
                await fetchAccessLogs();
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    }, [router, fetchAccessLogs]);

    const filterLogs = useCallback(() => {
        let filtered = [...accessLogs];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.tag_uid?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Entry type filter
        if (selectedFilter !== 'all') {
            filtered = filtered.filter(log => log.entry_type === selectedFilter);
        }

        // Date filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        if (dateFilter === 'today') {
            filtered = filtered.filter(log => new Date(log.timestamp) >= today);
        } else if (dateFilter === 'yesterday') {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= yesterday && logDate < today;
            });
        } else if (dateFilter === 'week') {
            filtered = filtered.filter(log => new Date(log.timestamp) >= weekAgo);
        }

        setFilteredLogs(filtered);
        setCurrentPage(1);
    }, [accessLogs, searchTerm, selectedFilter, dateFilter]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleDeleteSuccess = (deleteResult) => {
        setToast({
            show: true,
            message: `Successfully deleted ${deleteResult.deleted} access log${deleteResult.deleted !== 1 ? 's' : ''} using ${deleteResult.method}`,
            type: 'success'
        });
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, show: false }));
    };

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (accessLogs.length > 0) {
            filterLogs();
        }
    }, [filterLogs, accessLogs]);

    const formatDateTime = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Pagination
    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#355E3B' }}></div>
                    <span className="text-gray-600">Loading access logs...</span>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">Access Logs Management</h2>
                                <p className="text-gray-200">Monitor and track vehicle entry and exit logs</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#355E3B' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Total Logs</h3>
                                <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>{filteredLogs.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-green-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Entries</h3>
                                <p className="text-3xl font-bold text-green-500">
                                    {filteredLogs.filter(log => log.entry_type === 'entry').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-orange-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Exits</h3>
                                <p className="text-3xl font-bold text-orange-500">
                                    {filteredLogs.filter(log => log.entry_type === 'exit').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#FFD700' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                    <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Unique Vehicles</h3>
                                <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                                    {new Set(filteredLogs.map(log => log.plate_number)).size}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions - Filters */}
                <div className="bg-white rounded-xl shadow-lg mb-8">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl font-semibold text-white">Quick Filters</h2>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Search and filter vehicle access records</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Search Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-900">
                                    Search Records
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search by plate, name, or tag UID"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#355E3B] focus:border-transparent hover:border-gray-400 transition-colors"

                                />
                            </div>

                            {/* Entry Type Filter */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-900">
                                    Entry Type
                                </label>
                                <select
                                    value={selectedFilter}
                                    onChange={(e) => setSelectedFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#355E3B] focus:border-transparent hover:border-gray-400 transition-colors text-gray-700"
                                >
                                    <option value="all">All Types</option>
                                    <option value="entry">Entry Only</option>
                                    <option value="exit">Exit Only</option>
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-900">
                                    Date Range
                                </label>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#355E3B] focus:border-transparent hover:border-gray-400 transition-colors text-gray-700"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="week">Last 7 Days</option>
                                </select>
                            </div>

                            {/* Refresh Button */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-900">
                                    Actions
                                </label>
                                <button
                                    onClick={fetchAccessLogs}
                                    title="Refresh data"
                                    className="w-full h-10 bg-[#355E3B] text-white rounded-lg transition-all duration-200 flex items-center justify-center hover:bg-[#2d4f32]"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Access Logs Table */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Vehicle Access Records</h3>
                                <p className="text-sm" style={{ color: '#FFD700' }}>Real-time entry and exit monitoring</p>
                            </div>

                            {/* Delete Logs Button - Admin Only */}
                            {user?.designation === 'Admin' && (
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    title="Delete access logs"
                                    className="p-2 text-white/80 hover:text-white hover:bg-red-600/20 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2 focus:ring-offset-[#355E3B]"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehicle Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Owner Information
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Access Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Gate Location
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        RFID Tag
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentLogs.length > 0 ? (
                                    currentLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDateTime(log.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {log.plate_number}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {log.vehicle_make} {log.vehicle_model}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {log.user_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {log.designation}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.entry_type === 'entry'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {log.entry_type === 'entry' ? '→ Entry' : '← Exit'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.gate_location || 'Main Gate'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                {log.tag_uid}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-lg font-medium">No access logs found</p>
                                                <p className="text-sm">Try adjusting your filters or refresh the page</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-white px-6 py-3 border-t border-gray-200 rounded-b-xl">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} results
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-2 text-sm font-medium rounded-lg ${currentPage === page
                                                ? 'text-white border-transparent'
                                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                                }`}
                                            style={currentPage === page ? { backgroundColor: '#355E3B' } : {}}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Delete Logs Modal */}
            <DeleteLogsModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteSuccess}
            />

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.show}
                onClose={hideToast}
                duration={4500}
            />
        </div>
    );
}