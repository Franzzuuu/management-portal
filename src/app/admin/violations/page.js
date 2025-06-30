'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ViolationManagement() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('violations');
    const [violations, setViolations] = useState([]);
    const [violationHistory, setViolationHistory] = useState([]);
    const [userStats, setUserStats] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // All users for dropdown
    const [violationStats, setViolationStats] = useState({
        topViolators: [],
        violationTrends: [],
        violationTypeStats: []
    });
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

    // Load data based on active tab
    useEffect(() => {
        loadData();
    }, [activeTab, pagination.page, searchTerm, statusFilter, selectedUser]);

    // Load all users when component mounts
    useEffect(() => {
        loadAllUsers();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'violations') {
                await loadViolations();
            } else if (activeTab === 'history') {
                await loadViolationHistory();
            } else if (activeTab === 'statistics') {
                await loadViolationStats();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            if (data.success) {
                setAllUsers(data.users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const loadViolations = async () => {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                search: searchTerm,
                status: statusFilter
            });

            const response = await fetch(`/api/admin/violations?${params}`);
            const data = await response.json();

            if (data.success) {
                setViolations(data.violations);
                setPagination(prev => ({ ...prev, totalPages: data.pagination.totalPages }));
            }
        } catch (error) {
            console.error('Error loading violations:', error);
            setViolations([]);
        }
    };

    const loadViolationHistory = async () => {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: 15
            });

            if (selectedUser) {
                params.append('userId', selectedUser);
            }

            const response = await fetch(`/api/admin/violation-history?${params}`);
            const data = await response.json();

            if (selectedUser) {
                setViolationHistory(data.history || []);
                setPagination(prev => ({ ...prev, totalPages: data.pagination?.totalPages || 1 }));
            } else {
                setUserStats(data.users || []);
                setPagination(prev => ({ ...prev, totalPages: data.pagination?.totalPages || 1 }));
            }
        } catch (error) {
            console.error('Error loading violation history:', error);
            setViolationHistory([]);
            setUserStats([]);
        }
    };

    const loadViolationStats = async () => {
        try {
            const response = await fetch('/api/admin/violation-stats');
            const data = await response.json();
            setViolationStats(data);
        } catch (error) {
            console.error('Error loading violation stats:', error);
            setViolationStats({
                topViolators: [],
                violationTrends: [],
                violationTypeStats: []
            });
        }
    };

    const updateViolationStatus = async (violationId, newStatus, notes = '') => {
        try {
            const response = await fetch(`/api/admin/violations/${violationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, notes })
            });

            if (response.ok) {
                loadData();
            }
        } catch (error) {
            console.error('Error updating violation:', error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const statusStyles = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            resolved: 'bg-green-100 text-green-800 border-green-200',
            contested: 'bg-red-100 text-red-800 border-red-200'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const TabButton = ({ tabKey, label, count = null }) => (
        <button
            onClick={() => {
                setActiveTab(tabKey);
                setPagination({ page: 1, totalPages: 1 });
                setSelectedUser('');
            }}
            className={`px-6 py-3 font-medium rounded-lg transition-all duration-200 ${activeTab === tabKey
                ? 'text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
            style={{
                backgroundColor: activeTab === tabKey ? '#355E3B' : 'transparent'
            }}
        >
            {label}
            {count !== null && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${activeTab === tabKey ? 'bg-white text-gray-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {count}
                </span>
            )}
        </button>
    );

    // Filter users based on search term
    const filteredUsers = allUsers.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" style={{ color: '#355E3B' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Loading violation data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="shadow-lg border-b-2" style={{ backgroundColor: '#355E3B', borderBottomColor: '#FFD700' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <img src="/images/usclogo.png" alt="USC Logo" className="h-12 w-auto mr-3" />
                            <div>
                                <h1 className="text-xl font-bold text-white">Violation Management</h1>
                                <p className="text-sm" style={{ color: '#FFD700' }}>
                                    University of San Carlos - Talamban Campus
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/admin')}
                            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                            style={{ backgroundColor: '#FFD700', color: '#355E3B' }}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tab Navigation */}
                <div className="bg-white rounded-xl shadow-lg mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex space-x-4">
                            <TabButton
                                tabKey="violations"
                                label="Active Violations"
                                count={violations.length}
                            />
                            <TabButton
                                tabKey="history"
                                label="Violation History"
                            />
                            <TabButton
                                tabKey="statistics"
                                label="Statistics & Analytics"
                            />
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search Input */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder={
                                        activeTab === 'violations' ? "Search violations by user name, plate number..." :
                                            activeTab === 'history' ? "Search users by name or email..." :
                                                "Search..."
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                    style={{ focusRingColor: '#355E3B' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* User Dropdown for History Tab */}
                            {activeTab === 'history' && (
                                <div className="flex-1 lg:flex-none lg:w-80">
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                    >
                                        <option value="">View All Users</option>
                                        {filteredUsers.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name} ({user.designation}) - {user.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Status Filter for Violations Tab */}
                            {activeTab === 'violations' && (
                                <div className="flex-none">
                                    <select
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="contested">Contested</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Selected User Info */}
                        {activeTab === 'history' && selectedUser && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-semibold text-blue-800">
                                            Viewing history for: {allUsers.find(u => u.id == selectedUser)?.full_name}
                                        </h3>
                                        <p className="text-blue-600">
                                            {allUsers.find(u => u.id == selectedUser)?.email} • {allUsers.find(u => u.id == selectedUser)?.designation}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser('')}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        View All Users
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="p-6">
                        {/* Active Violations Tab */}
                        {activeTab === 'violations' && (
                            <div className="space-y-4">
                                {violations.length > 0 ? (
                                    violations.map((violation) => (
                                        <div key={violation.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            {violation.violation_type_name}
                                                        </h3>
                                                        {getStatusBadge(violation.status)}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                                        <div>
                                                            <span className="font-medium">Vehicle:</span> {violation.plate_number} ({violation.make} {violation.model})
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Owner:</span> {violation.owner_name}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Date:</span> {formatDate(violation.created_at)}
                                                        </div>
                                                    </div>

                                                    {violation.description && (
                                                        <p className="mt-2 text-gray-700">{violation.description}</p>
                                                    )}
                                                </div>

                                                {violation.status === 'pending' && (
                                                    <div className="flex space-x-2 ml-4">
                                                        <button
                                                            onClick={() => updateViolationStatus(violation.id, 'resolved')}
                                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                                                        >
                                                            Resolve
                                                        </button>
                                                        <button
                                                            onClick={() => updateViolationStatus(violation.id, 'contested')}
                                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                                        >
                                                            Contest
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No violations found</h3>
                                        <p className="mt-1 text-sm text-gray-500">No violations match your current filters.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Violation History Tab */}
                        {activeTab === 'history' && (
                            <div>
                                {selectedUser ? (
                                    // Individual User History View
                                    <div className="space-y-4">
                                        {violationHistory.length > 0 ? (
                                            <div className="space-y-4">
                                                {violationHistory.map((violation) => (
                                                    <div key={violation.id} className="bg-white border border-gray-200 rounded-lg p-6">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-3 mb-2">
                                                                    <h4 className="text-lg font-semibold text-gray-900">
                                                                        {violation.violation_type_name}
                                                                    </h4>
                                                                    {getStatusBadge(violation.status)}
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                                                    <div>
                                                                        <span className="font-medium">Vehicle:</span> {violation.plate_number} ({violation.make} {violation.model})
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Date:</span> {formatDate(violation.created_at)}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Reported By:</span> {violation.reported_by_name}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Updated:</span> {formatDate(violation.updated_at)}
                                                                    </div>
                                                                </div>

                                                                {violation.description && (
                                                                    <div className="text-sm text-gray-700 mb-2">
                                                                        <span className="font-medium">Description:</span> {violation.description}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {violation.image_data && (
                                                                <div className="ml-4">
                                                                    <img
                                                                        src={`data:${violation.image_mime_type};base64,${violation.image_data}`}
                                                                        alt="Violation evidence"
                                                                        className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">No violations found</h3>
                                                <p className="mt-1 text-sm text-gray-500">This user has no violation history.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // User Statistics View
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                <h3 className="text-lg font-semibold text-red-800 mb-2">High Risk Users</h3>
                                                <p className="text-3xl font-bold text-red-600">
                                                    {userStats.filter(user => user.violation_count >= 5).length}
                                                </p>
                                                <p className="text-sm text-red-600">5+ violations</p>
                                            </div>

                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Moderate Risk</h3>
                                                <p className="text-3xl font-bold text-yellow-600">
                                                    {userStats.filter(user => user.violation_count >= 2 && user.violation_count < 5).length}
                                                </p>
                                                <p className="text-sm text-yellow-600">2-4 violations</p>
                                            </div>

                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <h3 className="text-lg font-semibold text-green-800 mb-2">Total Users Tracked</h3>
                                                <p className="text-3xl font-bold text-green-600">{userStats.length}</p>
                                                <p className="text-sm text-green-600">with violation history</p>
                                            </div>
                                        </div>

                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#355E3B' }}>
                                                <h3 className="text-lg font-semibold text-white">User Violation Statistics</h3>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Violations</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Breakdown</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Violation</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {userStats.map((user) => (
                                                            <tr key={user.user_id} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                            {user.designation}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center">
                                                                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${user.violation_count >= 5 ? 'bg-red-100 text-red-800' :
                                                                            user.violation_count >= 2 ? 'bg-yellow-100 text-yellow-800' :
                                                                                'bg-green-100 text-green-800'
                                                                            }`}>
                                                                            {user.violation_count}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between">
                                                                            <span>Pending:</span>
                                                                            <span className="font-medium text-yellow-600">{user.pending_violations}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Resolved:</span>
                                                                            <span className="font-medium text-green-600">{user.resolved_violations}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Contested:</span>
                                                                            <span className="font-medium text-red-600">{user.contested_violations}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {user.latest_violation_date ? formatDate(user.latest_violation_date) : 'No violations'}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                    <button
                                                                        onClick={() => setSelectedUser(user.user_id)}
                                                                        className="text-white px-3 py-1 rounded hover:opacity-80 transition-opacity"
                                                                        style={{ backgroundColor: '#355E3B' }}
                                                                    >
                                                                        View History
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Statistics Tab */}
                        {activeTab === 'statistics' && violationStats && (
                            <div className="space-y-6">
                                {/* Top Violators */}
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#355E3B' }}>
                                        <h3 className="text-lg font-semibold text-white">Top Violators</h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {violationStats.topViolators?.map((violator, index) => (
                                                <div key={violator.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' :
                                                            index === 1 ? 'bg-gray-400' :
                                                                index === 2 ? 'bg-yellow-600' : 'bg-gray-500'
                                                            }`}>
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{violator.full_name}</div>
                                                            <div className="text-sm text-gray-500">{violator.designation}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-red-600">{violator.violation_count}</div>
                                                        <div className="text-xs text-gray-500">total violations</div>
                                                        {violator.active_violations > 0 && (
                                                            <div className="text-xs text-yellow-600">{violator.active_violations} active</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Violation Types Statistics */}
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#355E3B' }}>
                                        <h3 className="text-lg font-semibold text-white">Violation Types Breakdown</h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            {violationStats.violationTypeStats?.map((type) => (
                                                <div key={type.name} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{type.name}</h4>
                                                            <p className="text-sm text-gray-600">{type.description}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-2xl font-bold" style={{ color: '#355E3B' }}>{type.total_count}</div>
                                                            <div className="text-xs text-gray-500">total cases</div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-4 text-center">
                                                        <div className="bg-yellow-50 rounded p-2">
                                                            <div className="text-lg font-semibold text-yellow-600">{type.pending_count}</div>
                                                            <div className="text-xs text-yellow-600">Pending</div>
                                                        </div>
                                                        <div className="bg-green-50 rounded p-2">
                                                            <div className="text-lg font-semibold text-green-600">{type.resolved_count}</div>
                                                            <div className="text-xs text-green-600">Resolved</div>
                                                        </div>
                                                        <div className="bg-red-50 rounded p-2">
                                                            <div className="text-lg font-semibold text-red-600">{type.contested_count}</div>
                                                            <div className="text-xs text-red-600">Contested</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Monthly Trends */}
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#355E3B' }}>
                                        <h3 className="text-lg font-semibold text-white">Violation Trends (Last 12 Months)</h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-3">
                                            {violationStats.violationTrends?.map((trend) => (
                                                <div key={trend.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="font-medium text-gray-900">
                                                        {new Date(trend.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                                                    </div>
                                                    <div className="flex space-x-6 text-sm">
                                                        <span className="text-gray-600">
                                                            Total: <span className="font-semibold">{trend.violations_count}</span>
                                                        </span>
                                                        <span className="text-green-600">
                                                            Resolved: <span className="font-semibold">{trend.resolved_count}</span>
                                                        </span>
                                                        <span className="text-yellow-600">
                                                            Pending: <span className="font-semibold">{trend.pending_count}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex justify-center mt-6">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                        disabled={pagination.page === 1}
                                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>

                                    <span className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>

                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}