'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    DocumentTextIcon,
    ChartBarIcon,
    UserGroupIcon,
    TruckIcon,
    CalendarIcon,
    BellIcon,
    CameraIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

export default function SecurityViolationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // State Management
    const [violations, setViolations] = useState([]);
    const [filteredViolations, setFilteredViolations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [violationTypes, setViolationTypes] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Active Tab State
    const [activeTab, setActiveTab] = useState('manage');

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [designationFilter, setDesignationFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Statistics State
    const [statistics, setStatistics] = useState({});
    const [statsDateRange, setStatsDateRange] = useState('last_30_days');

    // Modal States
    const [showFilters, setShowFilters] = useState(false);
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [showViolationModal, setShowViolationModal] = useState(false);
    const [showNewViolationModal, setShowNewViolationModal] = useState(false);

    // Form States
    const [newViolation, setNewViolation] = useState({
        vehicle_id: '',
        violation_type_id: '',
        location: '',
        description: '',
        evidence_image: null
    });

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

            if (data.success && data.user.designation === 'Security') {
                setUser(data.user);
                await Promise.all([
                    fetchSecurityViolations(),
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

    const fetchSecurityViolations = async () => {
        try {
            const response = await fetch('/api/violations?security=true');
            const data = await response.json();
            if (data.success) {
                setViolations(data.violations);
                setFilteredViolations(data.violations);
            }
        } catch (error) {
            console.error('Failed to fetch security violations:', error);
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
                violation.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.violation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.location?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(violation => violation.status === statusFilter);
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(violation => violation.violation_type_id === parseInt(typeFilter));
        }

        // Designation filter
        if (designationFilter !== 'all') {
            filtered = filtered.filter(violation => violation.owner_designation === designationFilter);
        }

        // Vehicle type filter
        if (vehicleTypeFilter !== 'all') {
            filtered = filtered.filter(violation => violation.vehicle_type === vehicleTypeFilter);
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
                        const start = new Date(customDateRange.start);
                        const end = new Date(customDateRange.end);
                        end.setHours(23, 59, 59, 999);
                        filtered = filtered.filter(violation => {
                            const violationDate = new Date(violation.created_at);
                            return violationDate >= start && violationDate <= end;
                        });
                    }
                    break;
                default:
                    break;
            }

            if (dateFilter !== 'custom' && startDate) {
                filtered = filtered.filter(violation => new Date(violation.created_at) >= startDate);
            }
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortBy === 'created_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (sortOrder === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });

        setFilteredViolations(filtered);
    };

    const generateStatistics = () => {
        if (!violations.length) return;

        const now = new Date();
        let dateRange;

        switch (statsDateRange) {
            case 'last_7_days':
                dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'last_30_days':
                dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'last_3_months':
                dateRange = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case 'last_year':
                dateRange = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const rangeViolations = violations.filter(v => new Date(v.created_at) >= dateRange);

        // Basic stats
        const totalViolations = rangeViolations.length;
        const pendingViolations = rangeViolations.filter(v => v.status === 'pending').length;
        const resolvedViolations = rangeViolations.filter(v => v.status === 'resolved').length;
        const contestedViolations = rangeViolations.filter(v => v.status === 'contested').length;

        // Violation types breakdown
        const typeBreakdown = {};
        rangeViolations.forEach(v => {
            typeBreakdown[v.violation_type] = (typeBreakdown[v.violation_type] || 0) + 1;
        });

        // Monthly trend (last 6 months for the selected range)
        const monthlyData = {};
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = date.toISOString().slice(0, 7);
            monthlyData[monthKey] = 0;
        }

        rangeViolations.forEach(v => {
            const monthKey = v.created_at.slice(0, 7);
            if (monthlyData.hasOwnProperty(monthKey)) {
                monthlyData[monthKey]++;
            }
        });

        // User designation breakdown
        const designationBreakdown = {};
        rangeViolations.forEach(v => {
            designationBreakdown[v.owner_designation] = (designationBreakdown[v.owner_designation] || 0) + 1;
        });

        setStatistics({
            total: totalViolations,
            pending: pendingViolations,
            resolved: resolvedViolations,
            contested: contestedViolations,
            typeBreakdown,
            monthlyData,
            designationBreakdown
        });
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const handleStatusUpdate = async (violationId, newStatus) => {
        try {
            const response = await fetch('/api/violations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_status',
                    violationId,
                    status: newStatus
                })
            });

            const data = await response.json();
            if (data.success) {
                await fetchSecurityViolations();
                await fetchNotifications();
            }
        } catch (error) {
            console.error('Failed to update violation status:', error);
        }
    };

    const handleNewViolation = async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData();
            formData.append('vehicle_id', newViolation.vehicle_id);
            formData.append('violation_type_id', newViolation.violation_type_id);
            formData.append('location', newViolation.location);
            formData.append('description', newViolation.description);

            if (newViolation.evidence_image) {
                formData.append('evidence_image', newViolation.evidence_image);
            }

            const response = await fetch('/api/violations/create', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                setShowNewViolationModal(false);
                setNewViolation({
                    vehicle_id: '',
                    violation_type_id: '',
                    location: '',
                    description: '',
                    evidence_image: null
                });
                await fetchSecurityViolations();
            }
        } catch (error) {
            console.error('Failed to create violation:', error);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Pending' },
            resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Resolved' },
            contested: { color: 'bg-blue-100 text-blue-800', icon: ExclamationTriangleIcon, text: 'Contested' }
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.text}
            </span>
        );
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
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{ borderColor: '#355E3B' }}></div>
                    <h2 className="text-xl font-semibold" style={{ color: '#355E3B' }}>Loading Security Dashboard...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
            {/* Header */}
            <header className="shadow-lg border-b-4" style={{ backgroundColor: '#355E3B', borderColor: '#FFD700' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-white">Security Portal</h1>
                            <span className="ml-4 px-3 py-1 text-sm font-medium rounded-md" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                Violations Management
                            </span>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Notifications */}
                            <div className="relative">
                                <button className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors duration-200">
                                    <BellIcon className="w-6 h-6" />
                                    {notifications.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {notifications.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* User Info */}
                            <div className="flex items-center space-x-3">
                                <div className="text-right">
                                    <p className="text-white font-medium">{user?.fullName}</p>
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
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Page Header with Tabs */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="mb-4 lg:mb-0">
                            <h2 className="text-3xl font-bold text-white mb-2">My Violations</h2>
                            <p className="text-green-100">Manage violations you've issued and track their progress</p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-white bg-opacity-10 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('manage')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'manage'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'manage' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Manage Violations
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'history'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'history' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                History
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'stats'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'stats' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Statistics
                            </button>
                        </div>
                    </div>
                </div>

                {/* Manage Tab */}
                {activeTab === 'manage' && (
                    <div className="space-y-6">
                        {/* Quick Actions and Filters */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => setShowNewViolationModal(true)}
                                        className="text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                                        style={{ backgroundColor: '#355E3B' }}
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        <span>Issue New Violation</span>
                                    </button>

                                    <div className="flex items-center text-gray-600">
                                        <span className="text-sm font-medium">Total: {filteredViolations.length}</span>
                                        <span className="mx-2">|</span>
                                        <span className="text-sm">Pending: {filteredViolations.filter(v => v.status === 'pending').length}</span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search violations..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm w-64"
                                            style={{ focusRingColor: '#355E3B' }}
                                        />
                                    </div>

                                    {/* Filters Toggle */}
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        <FunnelIcon className="w-5 h-5" />
                                        <span>Filters</span>
                                        {showFilters ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Filters */}
                            {showFilters && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                        {/* Status Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent"
                                                style={{ focusRingColor: '#355E3B' }}
                                            >
                                                <option value="all">All Statuses</option>
                                                <option value="pending">Pending</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="contested">Contested</option>
                                            </select>
                                        </div>

                                        {/* Type Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Violation Type</label>
                                            <select
                                                value={typeFilter}
                                                onChange={(e) => setTypeFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent"
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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
                                            <select
                                                value={designationFilter}
                                                onChange={(e) => setDesignationFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent"
                                                style={{ focusRingColor: '#355E3B' }}
                                            >
                                                <option value="all">All Users</option>
                                                <option value="Student">Students</option>
                                                <option value="Faculty">Faculty</option>
                                                <option value="Staff">Staff</option>
                                            </select>
                                        </div>

                                        {/* Vehicle Type Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                                            <select
                                                value={vehicleTypeFilter}
                                                onChange={(e) => setVehicleTypeFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent"
                                                style={{ focusRingColor: '#355E3B' }}
                                            >
                                                <option value="all">All Vehicles</option>
                                                <option value="Car">Cars</option>
                                                <option value="Motorcycle">Motorcycles</option>
                                                <option value="SUV">SUVs</option>
                                                <option value="Truck">Trucks</option>
                                            </select>
                                        </div>

                                        {/* Date Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                                            <select
                                                value={dateFilter}
                                                onChange={(e) => setDateFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent"
                                                style={{ focusRingColor: '#355E3B' }}
                                            >
                                                <option value="all">All Time</option>
                                                <option value="today">Today</option>
                                                <option value="week">This Week</option>
                                                <option value="month">This Month</option>
                                                <option value="custom">Custom Range</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Custom Date Range */}
                                    {dateFilter === 'custom' && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={customDateRange.start}
                                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent"
                                                    style={{ focusRingColor: '#355E3B' }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                                <input
                                                    type="date"
                                                    value={customDateRange.end}
                                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent"