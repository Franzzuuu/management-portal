'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ViolationsManagement() {
    const [user, setUser] = useState(null);
    const [violations, setViolations] = useState([]);
    const [filteredViolations, setFilteredViolations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [violationTypes, setViolationTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('manage'); // manage, history, stats
    const [showAddForm, setShowAddForm] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');

    // Filtering and Sorting States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [designationFilter, setDesignationFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

    // Statistics States
    const [statsData, setStatsData] = useState({
        totalViolations: 0,
        monthlyStats: [],
        violationTypeStats: [],
        designationStats: [],
        statusStats: [],
        topViolators: []
    });
    const [statsDateRange, setStatsDateRange] = useState({ start: '', end: '' });

    // Form and UI States
    const [formData, setFormData] = useState({
        vehicleId: '',
        violationTypeId: '',
        description: '',
        imageFile: null
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [notifications, setNotifications] = useState([]);

    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        filterViolations();
    }, [searchTerm, statusFilter, typeFilter, designationFilter, vehicleTypeFilter, dateFilter, customDateRange, violations]);

    useEffect(() => {
        if (activeTab === 'stats') {
            generateStatistics();
        }
    }, [activeTab, violations, statsDateRange]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
                await Promise.all([
                    fetchViolations(),
                    fetchVehicles(),
                    fetchViolationTypes(),
                    fetchNotifications()
                ]);
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    };

    const fetchViolations = async () => {
        try {
            const response = await fetch('/api/violations');
            const data = await response.json();
            if (data.success) {
                setViolations(data.violations);
                setFilteredViolations(data.violations);
            }
        } catch (error) {
            console.error('Failed to fetch violations:', error);
        }
    };

    const fetchVehicles = async () => {
        try {
            const response = await fetch('/api/vehicles');
            const data = await response.json();
            if (data.success) {
                setVehicles(data.vehicles.filter(v => v.approval_status === 'approved'));
            }
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        }
    };

    const fetchViolationTypes = async () => {
        try {
            const response = await fetch('/api/violation-types');
            const data = await response.json();
            if (data.success) {
                setViolationTypes(data.types);
            }
        } catch (error) {
            console.error('Failed to fetch violation types:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/notifications/violations');
            const data = await response.json();
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const filterViolations = () => {
        let filtered = [...violations];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(violation =>
                violation.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.violation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(violation => violation.status === statusFilter);
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(violation => violation.violation_type_id.toString() === typeFilter);
        }

        // Designation filter
        if (designationFilter !== 'all') {
            filtered = filtered.filter(violation => violation.owner_designation === designationFilter);
        }

        // Vehicle type filter
        if (vehicleTypeFilter !== 'all') {
            filtered = filtered.filter(violation => {
                const vehicle = vehicles.find(v => v.plate_number === violation.plate_number);
                return vehicle && vehicle.vehicle_type === vehicleTypeFilter;
            });
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            let startDate;

            switch (dateFilter) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'custom':
                    if (customDateRange.start && customDateRange.end) {
                        filtered = filtered.filter(violation => {
                            const violationDate = new Date(violation.created_at);
                            return violationDate >= new Date(customDateRange.start) &&
                                violationDate <= new Date(customDateRange.end);
                        });
                    }
                    break;
            }

            if (dateFilter !== 'custom' && startDate) {
                filtered = filtered.filter(violation => new Date(violation.created_at) >= startDate);
            }
        }

        // Sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortField) {
                case 'created_at':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                case 'owner_name':
                    aValue = a.owner_name.toLowerCase();
                    bValue = b.owner_name.toLowerCase();
                    break;
                case 'violation_type':
                    aValue = a.violation_type.toLowerCase();
                    bValue = b.violation_type.toLowerCase();
                    break;
                case 'status':
                    aValue = a.status.toLowerCase();
                    bValue = b.status.toLowerCase();
                    break;
                case 'plate_number':
                    aValue = a.plate_number.toLowerCase();
                    bValue = b.plate_number.toLowerCase();
                    break;
                default:
                    aValue = a[sortField];
                    bValue = b[sortField];
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredViolations(filtered);
    };

    const generateStatistics = () => {
        let dataToAnalyze = violations;

        // Apply date filter for stats if set
        if (statsDateRange.start && statsDateRange.end) {
            dataToAnalyze = violations.filter(violation => {
                const violationDate = new Date(violation.created_at);
                return violationDate >= new Date(statsDateRange.start) &&
                    violationDate <= new Date(statsDateRange.end);
            });
        }

        // Monthly statistics
        const monthlyStats = {};
        dataToAnalyze.forEach(violation => {
            const month = new Date(violation.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
            });
            monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        });

        // Violation type statistics
        const typeStats = {};
        dataToAnalyze.forEach(violation => {
            typeStats[violation.violation_type] = (typeStats[violation.violation_type] || 0) + 1;
        });

        // Designation statistics
        const designationStats = {};
        dataToAnalyze.forEach(violation => {
            designationStats[violation.owner_designation] = (designationStats[violation.owner_designation] || 0) + 1;
        });

        // Status statistics
        const statusStats = {};
        dataToAnalyze.forEach(violation => {
            statusStats[violation.status] = (statusStats[violation.status] || 0) + 1;
        });

        // Top violators
        const violatorCounts = {};
        dataToAnalyze.forEach(violation => {
            const key = `${violation.owner_name} (${violation.plate_number})`;
            violatorCounts[key] = (violatorCounts[key] || 0) + 1;
        });

        const topViolators = Object.entries(violatorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        setStatsData({
            totalViolations: dataToAnalyze.length,
            monthlyStats: Object.entries(monthlyStats).map(([month, count]) => ({ month, count })),
            violationTypeStats: Object.entries(typeStats).map(([type, count]) => ({ type, count })),
            designationStats: Object.entries(designationStats).map(([designation, count]) => ({ designation, count })),
            statusStats: Object.entries(statusStats).map(([status, count]) => ({ status, count })),
            topViolators
        });
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) {
            return (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortDirection === 'asc' ? (
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4l6 6h4l6-6" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 20l-6-6H9l-6 6" />
            </svg>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const submitData = new FormData();
        submitData.append('vehicleId', formData.vehicleId);
        submitData.append('violationTypeId', formData.violationTypeId);
        submitData.append('description', formData.description);
        if (formData.imageFile) {
            submitData.append('image', formData.imageFile);
        }

        try {
            const response = await fetch('/api/violations/create', {
                method: 'POST',
                body: submitData
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Violation reported successfully!');
                setFormData({ vehicleId: '', violationTypeId: '', description: '', imageFile: null });
                setShowAddForm(false);
                fetchViolations();
            } else {
                setError(data.error || 'Failed to create violation');
            }
        } catch (error) {
            setError('Failed to create violation');
        }
    };

    const updateViolationStatus = async (violationId, newStatus) => {
        try {
            const response = await fetch('/api/violations/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ violationId, status: newStatus })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(`Violation status updated to ${newStatus}`);
                fetchViolations();
            } else {
                setError(data.error || 'Failed to update status');
            }
        } catch (error) {
            setError('Failed to update violation status');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'contested': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDesignationColor = (designation) => {
        switch (designation) {
            case 'Admin': return 'bg-purple-100 text-purple-800';
            case 'Staff': return 'bg-blue-100 text-blue-800';
            case 'Faculty': return 'bg-indigo-100 text-indigo-800';
            case 'Student': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#355E3B' }}></div>
                    <p className="mt-4 text-gray-600">Loading violations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="shadow-lg" style={{ backgroundColor: '#355E3B' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center py-4 px-6">
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Violations Management</h1>
                                <div className="flex items-center space-x-2 text-sm" style={{ color: '#FFD700' }}>
                                    <span>Dashboard</span>
                                    <span>›</span>
                                    <span>Violations</span>
                                    {activeTab !== 'manage' && (
                                        <>
                                            <span>›</span>
                                            <span className="capitalize">{activeTab}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {notifications.length > 0 && (
                                <div className="relative">
                                    <button className="relative p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors duration-200">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5H9l-5 5h5a3 3 0 003 3z" />
                                        </svg>
                                        <span className="absolute -top-1 -right-1 h-5 w-5 text-xs font-bold rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                            {notifications.length}
                                        </span>
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => router.push('/admin')}
                                className="text-white hover:bg-white hover:bg-opacity-10 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                                ← Back to Dashboard
                            </button>
                            <div className="text-sm text-right">
                                <div className="text-white">
                                    Welcome, <span className="font-semibold">{user?.fullName || user?.email}</span>
                                </div>
                                <div className="flex items-center justify-end mt-1">
                                    <span className="px-2 py-1 text-xs font-medium rounded-md" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                        {user?.designation}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Page Header with Tabs */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="mb-4 lg:mb-0">
                            <h2 className="text-3xl font-bold text-white mb-2">Violations System</h2>
                            <p className="text-green-100">Manage, track, and analyze traffic violations</p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-white bg-opacity-10 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('manage')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'manage'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-500 hover:text-green-900 hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'manage' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Manage Violations
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'history'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-500 hover:text-green-900 hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'history' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Violation History
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'stats'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-500 hover:text-green-900 hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'stats' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Statistics
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'manage' && (
                    <div className="space-y-6">
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="inline-flex items-center px-6 py-3 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                style={{ backgroundColor: '#355E3B' }}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Report New Violation
                            </button>
                        </div>

                        {/* Advanced Filters */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                Advanced Filters & Search
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <input
                                        type="text"
                                        placeholder="Name, plate, type, description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400"
                                        style={{ focusRingColor: '#355E3B' }}
                                    />
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
                                        style={{ focusRingColor: '#355E3B' }}
                                    >
                                        <option value="all" className="text-gray-400">All Statuses</option>
                                        <option value="pending" className="text-gray-400">Pending</option>
                                        <option value="resolved" className="text-gray-400">Resolved</option>
                                        <option value="contested" className="text-gray-400">Contested</option>
                                    </select>
                                </div>

                                {/* Violation Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
                                        style={{ focusRingColor: '#355E3B' }}
                                    >
                                        <option value="all">All Types</option>
                                        {violationTypes.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Designation Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                                    <select
                                        value={designationFilter}
                                        onChange={(e) => setDesignationFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
                                        style={{ focusRingColor: '#355E3B' }}
                                    >
                                        <option value="all">All Users</option>
                                        <option value="Student">Students</option>
                                        <option value="Faculty">Faculty</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Admin">Admins</option>
                                    </select>
                                </div>

                                {/* Vehicle Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                                    <select
                                        value={vehicleTypeFilter}
                                        onChange={(e) => setVehicleTypeFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
                                        style={{ focusRingColor: '#355E3B' }}
                                    >
                                        <option value="all">All Vehicles</option>
                                        <option value="2-wheel">2-Wheel</option>
                                        <option value="4-wheel">4-Wheel</option>
                                    </select>
                                </div>

                                {/* Date Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
                                        style={{ focusRingColor: '#355E3B' }}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">Last 7 Days</option>
                                        <option value="month">This Month</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>

                                {/* Custom Date Range */}
                                {dateFilter === 'custom' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={customDateRange.start}
                                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none"
                                                style={{ focusRingColor: '#355E3B' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={customDateRange.end}
                                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none"
                                                style={{ focusRingColor: '#355E3B' }}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Clear Filters */}
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setStatusFilter('all');
                                            setTypeFilter('all');
                                            setDesignationFilter('all');
                                            setVehicleTypeFilter('all');
                                            setDateFilter('all');
                                            setCustomDateRange({ start: '', end: '' });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results Summary */}
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-gray-600">
                                    Showing <span className="font-semibold">{filteredViolations.length}</span> of{' '}
                                    <span className="font-semibold">{violations.length}</span> violations
                                </p>
                                <div className="text-sm text-gray-500">
                                    Sort by: <span className="font-medium capitalize">{sortField.replace('_', ' ')}</span> ({sortDirection})
                                </div>
                            </div>
                        </div>

                        {/* Violations Table */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead style={{ backgroundColor: '#355E3B' }}>
                                        <tr>
                                            <th
                                                onClick={() => handleSort('owner_name')}
                                                className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Owner</span>
                                                    {getSortIcon('owner_name')}
                                                </div>
                                            </th>
                                            <th
                                                onClick={() => handleSort('plate_number')}
                                                className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Vehicle</span>
                                                    {getSortIcon('plate_number')}
                                                </div>
                                            </th>
                                            <th
                                                onClick={() => handleSort('violation_type')}
                                                className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Violation Type</span>
                                                    {getSortIcon('violation_type')}
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th
                                                onClick={() => handleSort('status')}
                                                className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Status</span>
                                                    {getSortIcon('status')}
                                                </div>
                                            </th>
                                            <th
                                                onClick={() => handleSort('created_at')}
                                                className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Date</span>
                                                    {getSortIcon('created_at')}
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredViolations.map((violation) => (
                                            <tr key={violation.id} className="hover:bg-gray-50 transition-colors duration-200">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {violation.owner_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDesignationColor(violation.owner_designation)}`}>
                                                                {violation.owner_designation}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {violation.plate_number}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {violation.vehicle_make} {violation.vehicle_model}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{violation.violation_type}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                                        {violation.description || 'No description provided'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(violation.status)}`}>
                                                        {violation.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(violation.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                    {violation.has_image && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedImage(`/api/violations/${violation.id}/image`);
                                                                setShowImageModal(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 font-medium"
                                                        >
                                                            View Image
                                                        </button>
                                                    )}
                                                    <select
                                                        value={violation.status}
                                                        onChange={(e) => updateViolationStatus(violation.id, e.target.value)}
                                                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:border-transparent focus:outline-none"
                                                        style={{ focusRingColor: '#355E3B' }}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="contested">Contested</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredViolations.length === 0 && (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No violations found</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                                            ? 'Try adjusting your filters or search criteria.'
                                            : 'Get started by reporting a new violation.'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                Complete Violation History
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Historical record of all violations across all time periods with complete audit trail.
                            </p>

                            {/* History Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                                    <div className="text-2xl font-bold">{violations.length}</div>
                                    <div className="text-sm opacity-90">Total Violations</div>
                                </div>
                                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                                    <div className="text-2xl font-bold">{violations.filter(v => v.status === 'pending').length}</div>
                                    <div className="text-sm opacity-90">Pending</div>
                                </div>
                                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                                    <div className="text-2xl font-bold">{violations.filter(v => v.status === 'resolved').length}</div>
                                    <div className="text-sm opacity-90">Resolved</div>
                                </div>
                                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
                                    <div className="text-2xl font-bold">{violations.filter(v => v.status === 'contested').length}</div>
                                    <div className="text-sm opacity-90">Contested</div>
                                </div>
                            </div>

                            {/* History Table - Reuse the same table structure but with different context */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead style={{ backgroundColor: '#355E3B' }}>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                                ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                                Owner & Vehicle
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                                Violation Details
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                                Reported By
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                                Status & Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredViolations.map((violation) => (
                                            <tr key={violation.id} className="hover:bg-gray-50 transition-colors duration-200">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-mono font-medium text-gray-900">
                                                        #{violation.id.toString().padStart(4, '0')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {violation.owner_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {violation.plate_number} • {violation.vehicle_make} {violation.vehicle_model}
                                                        </div>
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDesignationColor(violation.owner_designation)}`}>
                                                            {violation.owner_designation}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{violation.violation_type}</div>
                                                        <div className="text-sm text-gray-500 max-w-xs">
                                                            {violation.description || 'No additional details'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{violation.reported_by_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(violation.status)}`}>
                                                            {violation.status}
                                                        </span>
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            {new Date(violation.created_at).toLocaleDateString()} at{' '}
                                                            {new Date(violation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Statistics Tab */}
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        {/* Stats Date Range Filter */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>
                                    Violation Statistics & Analytics
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                                        <input
                                            type="date"
                                            value={statsDateRange.start}
                                            onChange={(e) => setStatsDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none"
                                            style={{ focusRingColor: '#355E3B' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                        <input
                                            type="date"
                                            value={statsDateRange.end}
                                            onChange={(e) => setStatsDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none"
                                            style={{ focusRingColor: '#355E3B' }}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => setStatsDateRange({ start: '', end: '' })}
                                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Overview Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">{statsData.totalViolations}</div>
                                        <div className="text-sm text-gray-500">Total Violations</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                            <svg className="w-6 h-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {statsData.statusStats.find(s => s.status === 'pending')?.count || 0}
                                        </div>
                                        <div className="text-sm text-gray-500">Pending Resolution</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {statsData.statusStats.find(s => s.status === 'resolved')?.count || 0}
                                        </div>
                                        <div className="text-sm text-gray-500">Resolved</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {statsData.statusStats.find(s => s.status === 'contested')?.count || 0}
                                        </div>
                                        <div className="text-sm text-gray-500">Contested</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Monthly Trends */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h4 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                    Monthly Violation Trends
                                </h4>
                                <div className="h-64">
                                    <BarChart data={statsData.monthlyStats} />
                                </div>
                            </div>

                            {/* Violation Types */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h4 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                    Violations by Type
                                </h4>
                                <div className="h-64">
                                    <BarChart data={statsData.violationTypeStats} />
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* User Designations */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h4 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                    Violations by User Type
                                </h4>
                                <div className="h-64">
                                    <BarChart data={statsData.designationStats} />
                                </div>
                            </div>

                            {/* Top Violators */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h4 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                    Top Violators
                                </h4>
                                <div className="space-y-3">
                                    {statsData.topViolators.slice(0, 8).map((violator, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                                        style={{ backgroundColor: index < 3 ? '#FFD700' : '#355E3B', color: index < 3 ? '#355E3B' : 'white' }}>
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {violator.name}
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold" style={{ color: '#355E3B' }}>
                                                {violator.count} violations
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Violation Modal */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>
                                        Report New Violation
                                    </h3>
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                {error && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-600 text-sm">{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-600 text-sm">{success}</p>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Vehicle *
                                        </label>
                                        <select
                                            value={formData.vehicleId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none"
                                            style={{ focusRingColor: '#355E3B' }}
                                            required
                                        >
                                            <option value="">Choose a vehicle...</option>
                                            {vehicles.map(vehicle => (
                                                <option key={vehicle.id} value={vehicle.id}>
                                                    {vehicle.plate_number} - {vehicle.make} {vehicle.model} ({vehicle.owner_name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Violation Type *
                                        </label>
                                        <select
                                            value={formData.violationTypeId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, violationTypeId: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none"
                                            style={{ focusRingColor: '#355E3B' }}
                                            required
                                        >
                                            <option value="">Select violation type...</option>
                                            {violationTypes.map(type => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Provide additional details about the violation..."
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none resize-none"
                                            style={{ focusRingColor: '#355E3B' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Evidence Photo
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setFormData(prev => ({ ...prev, imageFile: e.target.files[0] }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none"
                                            style={{ focusRingColor: '#355E3B' }}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Upload an image as evidence (optional, max 5MB)
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                        style={{ backgroundColor: '#355E3B' }}
                                    >
                                        Report Violation
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Image Modal */}
                {showImageModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                        <div className="relative max-w-4xl max-h-full">
                            <button
                                onClick={() => setShowImageModal(false)}
                                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200 z-10"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <img
                                src={selectedImage}
                                alt="Violation Evidence"
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Simple Bar Chart Component
function BarChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="mt-2 text-sm">No data available</p>
                </div>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(item => item.count));
    const keys = Object.keys(data[0]);
    const labelKey = keys.find(key => key !== 'count') || keys[0];

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 flex items-end justify-between space-x-2 px-2">
                {data.map((item, index) => {
                    const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
                    return (
                        <div key={index} className="flex flex-col items-center flex-1 h-full">
                            <div className="flex-1 flex items-end w-full">
                                <div
                                    className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80 relative group"
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: index % 2 === 0 ? '#355E3B' : '#FFD700',
                                        minHeight: item.count > 0 ? '10px' : '0px'
                                    }}
                                >
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {item.count}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-600 text-center truncate w-full" title={item[labelKey]}>
                                {item[labelKey]}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}