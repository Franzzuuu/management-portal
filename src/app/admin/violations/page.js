'use client';

import { useState, useEffect } from 'react';

export default function ViolationsManagement() {
    const [violations, setViolations] = useState([]);
    const [violationHistory, setViolationHistory] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        resolved: 0,
        contested: 0,
        thisMonth: 0,
        thisWeek: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('violations');
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Show notification
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
        }, 3000);
    };

    // Load violations data
    const loadViolations = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                search,
                status: statusFilter
            });

            const response = await fetch(`/api/admin/violations?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                setViolations(data.data);
                setTotalPages(data.pagination?.totalPages || 1);
            } else {
                console.error('API returned error:', data);
                setViolations([]);
                showNotification('Failed to load violations: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error loading violations:', error);
            setViolations([]); // Ensure violations is always an array
            showNotification('Error loading violations: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Load violation history
    const loadViolationHistory = async () => {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '15'
            });

            const response = await fetch(`/api/admin/violation-history?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                setViolationHistory(data.data);
            } else {
                console.error('Violation history API returned error:', data);
                setViolationHistory([]);
            }
        } catch (error) {
            console.error('Error loading violation history:', error);
            setViolationHistory([]); // Ensure violationHistory is always an array
        }
    };

    // Load statistics
    const loadStats = async () => {
        try {
            const response = await fetch('/api/admin/violation-stats');
            const data = await response.json();

            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    // Update violation status
    const updateViolationStatus = async (violationId, newStatus) => {
        try {
            const response = await fetch('/api/admin/violations', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: violationId,
                    status: newStatus
                }),
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Violation status updated successfully');
                loadViolations();
                loadStats();
            } else {
                showNotification('Failed to update violation status', 'error');
            }
        } catch (error) {
            console.error('Error updating violation:', error);
            showNotification('Error updating violation status', 'error');
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'resolved':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'contested':
                return 'bg-red-100 text-red-800 border border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    useEffect(() => {
        loadViolations();
        loadStats();
        if (activeTab === 'history') {
            loadViolationHistory();
        }
    }, [page, search, statusFilter, activeTab]);

    useEffect(() => {
        setPage(1); // Reset to first page when filters change
    }, [search, statusFilter]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Notification */}
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${notification.type === 'error'
                    ? 'bg-red-100 border border-red-400 text-red-700'
                    : 'bg-green-100 border border-green-400 text-green-700'
                    }`}>
                    <div className="flex items-center">
                        <span className="mr-2">
                            {notification.type === 'error' ? '❌' : '✅'}
                        </span>
                        {notification.message}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-green-800 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">🚨 Violations Management</h1>
                            <p className="text-green-100 mt-1">Monitor and manage campus parking violations</p>
                        </div>
                        <div className="text-right">
                            <div className="text-yellow-400 text-sm font-medium">USC RFID System</div>
                            <div className="text-green-100 text-xs">Admin Panel</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-800">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">📊</div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Violations</p>
                                <p className="text-2xl font-bold text-green-800">{stats.total}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">⏳</div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">✅</div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Resolved</p>
                                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">⚠️</div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Contested</p>
                                <p className="text-2xl font-bold text-red-600">{stats.contested}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-md mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex">
                            <button
                                onClick={() => setActiveTab('violations')}
                                className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'violations'
                                    ? 'border-green-800 text-green-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                🚨 Active Violations
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'history'
                                    ? 'border-green-800 text-green-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                📊 Violation History
                            </button>
                        </nav>
                    </div>

                    {/* Active Violations Tab */}
                    {activeTab === 'violations' && (
                        <div className="p-6">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="🔍 Search violations..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="contested">Contested</option>
                                </select>
                            </div>

                            {/* Violations Table */}
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-800"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-green-800">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Vehicle</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Owner</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Violation</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {!violations || violations.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                                        {loading ? 'Loading violations...' : 'No violations found'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                violations.map((violation) => (
                                                    <tr key={violation.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {violation.plate_number}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {violation.make} {violation.model} - {violation.color}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {violation.owner_name}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {violation.owner_designation} • {violation.owner_email}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {violation.violation_type_name}
                                                            </div>
                                                            <div className="text-sm text-gray-500 max-w-xs truncate">
                                                                {violation.description}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                Reported by: {violation.reported_by_name}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                                                                {violation.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDate(violation.created_at)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex space-x-2">
                                                                {violation.status === 'pending' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => updateViolationStatus(violation.id, 'resolved')}
                                                                            className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md border border-green-200 hover:bg-green-50"
                                                                        >
                                                                            ✅ Resolve
                                                                        </button>
                                                                        <button
                                                                            onClick={() => updateViolationStatus(violation.id, 'contested')}
                                                                            className="text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-200 hover:bg-red-50"
                                                                        >
                                                                            ⚠️ Contest
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {violation.status === 'contested' && (
                                                                    <button
                                                                        onClick={() => updateViolationStatus(violation.id, 'resolved')}
                                                                        className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md border border-green-200 hover:bg-green-50"
                                                                    >
                                                                        ✅ Resolve
                                                                    </button>
                                                                )}
                                                                {violation.status === 'resolved' && (
                                                                    <span className="text-gray-400 px-3 py-1">
                                                                        Completed
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={page === totalPages}
                                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Page <span className="font-medium">{page}</span> of{' '}
                                                <span className="font-medium">{totalPages}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                                                <button
                                                    onClick={() => setPage(Math.max(1, page - 1))}
                                                    disabled={page === 1}
                                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    ←
                                                </button>
                                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                    const pageNum = i + 1;
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => setPage(pageNum)}
                                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${page === pageNum
                                                                ? 'bg-green-800 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                                }`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                                    disabled={page === totalPages}
                                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    →
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Violation History Tab */}
                    {activeTab === 'history' && (
                        <div className="p-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900">📊 User Violation History</h3>
                                <p className="text-sm text-gray-500">Users with recorded violations</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-green-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Pending</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Resolved</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Contested</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Latest</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {!violationHistory || violationHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                                    {loading ? 'Loading violation history...' : 'No violation history found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            violationHistory.map((user) => (
                                                <tr key={user.user_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.full_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {user.designation} • {user.email}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                                            {user.total_violations}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                                            {user.pending_violations}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                            {user.resolved_violations}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                                            {user.contested_violations}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {user.latest_violation_date ? formatDate(user.latest_violation_date) : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}