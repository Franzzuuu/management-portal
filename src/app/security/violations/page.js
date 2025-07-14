'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Calendar, AlertCircle, Plus, Eye, Edit, Trash2, FileText, TrendingUp, BarChart3, Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const SecurityViolationsPage = () => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('manage');

    // Data states
    const [violations, setViolations] = useState([]);
    const [filteredViolations, setFilteredViolations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [violationTypes, setViolationTypes] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [designationFilter, setDesignationFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

    // Statistics states
    const [statistics, setStatistics] = useState({
        totalViolations: 0,
        pendingViolations: 0,
        resolvedViolations: 0,
        contestedViolations: 0,
        monthlyData: [],
        typeDistribution: [],
        designationBreakdown: []
    });
    const [statsDateRange, setStatsDateRange] = useState('last30days');

    // Modal states
    const [showAddViolation, setShowAddViolation] = useState(false);
    const [showViewViolation, setShowViewViolation] = useState(false);
    const [showEditViolation, setShowEditViolation] = useState(false);
    const [selectedViolation, setSelectedViolation] = useState(null);

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
            const response = await fetch('/api/violations?securityFilter=true');
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
            filtered = filtered.filter(violation => violation.violation_type === typeFilter);
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
            const startDate = new Date();

            switch (dateFilter) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'quarter':
                    startDate.setMonth(now.getMonth() - 3);
                    break;
                case 'custom':
                    if (customDateRange.start && customDateRange.end) {
                        const customStart = new Date(customDateRange.start);
                        const customEnd = new Date(customDateRange.end);
                        filtered = filtered.filter(violation => {
                            const violationDate = new Date(violation.created_at);
                            return violationDate >= customStart && violationDate <= customEnd;
                        });
                    }
                    break;
            }

            if (dateFilter !== 'custom') {
                filtered = filtered.filter(violation => {
                    const violationDate = new Date(violation.created_at);
                    return violationDate >= startDate;
                });
            }
        }

        setFilteredViolations(filtered);
    };

    const generateStatistics = () => {
        const now = new Date();
        let startDate = new Date();

        switch (statsDateRange) {
            case 'last7days':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'last30days':
                startDate.setDate(now.getDate() - 30);
                break;
            case 'last90days':
                startDate.setDate(now.getDate() - 90);
                break;
            case 'last6months':
                startDate.setMonth(now.getMonth() - 6);
                break;
            case 'lastyear':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }

        const filteredData = violations.filter(violation => {
            const violationDate = new Date(violation.created_at);
            return violationDate >= startDate;
        });

        // Calculate basic statistics
        const totalViolations = filteredData.length;
        const pendingViolations = filteredData.filter(v => v.status === 'pending').length;
        const resolvedViolations = filteredData.filter(v => v.status === 'resolved').length;
        const contestedViolations = filteredData.filter(v => v.status === 'contested').length;

        // Monthly data for charts
        const monthlyData = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 0; i < 12; i++) {
            const month = new Date(now.getFullYear(), i, 1);
            const monthName = months[i];
            const monthViolations = filteredData.filter(violation => {
                const violationDate = new Date(violation.created_at);
                return violationDate.getMonth() === i && violationDate.getFullYear() === now.getFullYear();
            });

            monthlyData.push({
                month: monthName,
                violations: monthViolations.length,
                pending: monthViolations.filter(v => v.status === 'pending').length,
                resolved: monthViolations.filter(v => v.status === 'resolved').length,
                contested: monthViolations.filter(v => v.status === 'contested').length
            });
        }

        // Type distribution
        const typeDistribution = {};
        filteredData.forEach(violation => {
            const type = violation.violation_type || 'Unknown';
            typeDistribution[type] = (typeDistribution[type] || 0) + 1;
        });

        const typeDistributionArray = Object.entries(typeDistribution).map(([type, count]) => ({
            type,
            count,
            percentage: ((count / totalViolations) * 100).toFixed(1)
        }));

        // Designation breakdown
        const designationBreakdown = {};
        filteredData.forEach(violation => {
            const designation = violation.owner_designation || 'Unknown';
            designationBreakdown[designation] = (designationBreakdown[designation] || 0) + 1;
        });

        const designationBreakdownArray = Object.entries(designationBreakdown).map(([designation, count]) => ({
            designation,
            count,
            percentage: ((count / totalViolations) * 100).toFixed(1)
        }));

        setStatistics({
            totalViolations,
            pendingViolations,
            resolvedViolations,
            contestedViolations,
            monthlyData,
            typeDistribution: typeDistributionArray,
            designationBreakdown: designationBreakdownArray
        });
    };

    const handleUpdateStatus = async (violationId, newStatus) => {
        try {
            const response = await fetch('/api/violations/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    violationId,
                    status: newStatus
                })
            });

            if (response.ok) {
                await fetchViolations();
                alert('Violation status updated successfully');
            } else {
                alert('Failed to update violation status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error updating violation status');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'contested': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'resolved': return <CheckCircle className="w-4 h-4" />;
            case 'contested': return <XCircle className="w-4 h-4" />;
            default: return <AlertTriangle className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#355E3B' }}></div>
                    <p className="text-gray-600">Loading security violations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b-2" style={{ borderColor: '#355E3B' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#355E3B' }}>
                                    S
                                </div>
                            </div>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold" style={{ color: '#355E3B' }}>
                                    Security Portal
                                </h1>
                                <p className="text-sm text-gray-600">RFID Vehicle Access Management</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                    {user?.first_name} {user?.last_name}
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
                            <h2 className="text-3xl font-bold text-white mb-2">Security Violations</h2>
                            <p className="text-green-100">Monitor and manage violations youve reported</p>
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

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderColor: '#355E3B' }}>
                        <div className="flex items-center">
                            <div className="p-3 rounded-full" style={{ backgroundColor: '#355E3B' }}>
                                <FileText className="w-8 h-8 text-white" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Total Violations</h3>
                                <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>{violations.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-yellow-500">
                                <Clock className="w-8 h-8 text-white" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Pending</h3>
                                <p className="text-3xl font-bold text-yellow-600">
                                    {violations.filter(v => v.status === 'pending').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-green-500">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Resolved</h3>
                                <p className="text-3xl font-bold text-green-600">
                                    {violations.filter(v => v.status === 'resolved').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-red-500">
                                <AlertCircle className="w-8 h-8 text-white" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Contested</h3>
                                <p className="text-3xl font-bold text-red-600">
                                    {violations.filter(v => v.status === 'contested').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Manage Tab */}
                {activeTab === 'manage' && (
                    <div className="space-y-6">
                        {/* Filters and Search */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                                <h3 className="text-lg font-semibold mb-4 lg:mb-0" style={{ color: '#355E3B' }}>
                                    Filter and Search Violations
                                </h3>
                                <button
                                    onClick={() => setShowAddViolation(true)}
                                    className="inline-flex items-center px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Report New Violation
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="mb-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, plate number, violation type, or location..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Filter Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
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

                                {/* Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Violation Type</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                    >
                                        <option value="all">All Types</option>
                                        {violationTypes.map(type => (
                                            <option key={type.id} value={type.name}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Designation Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={designationFilter}
                                        onChange={(e) => setDesignationFilter(e.target.value)}
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={vehicleTypeFilter}
                                        onChange={(e) => setVehicleTypeFilter(e.target.value)}
                                    >
                                        <option value="all">All Vehicles</option>
                                        <option value="Car">Car</option>
                                        <option value="Motorcycle">Motorcycle</option>
                                        <option value="Truck">Truck</option>
                                        <option value="Van">Van</option>
                                    </select>
                                </div>

                                {/* Date Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">Last Week</option>
                                        <option value="month">Last Month</option>
                                        <option value="quarter">Last Quarter</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>

                                {/* Clear Filters Button */}
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
                                        className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>

                            {/* Custom Date Range */}
                            {dateFilter === 'custom' && (
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                            style={{ focusRingColor: '#355E3B' }}
                                            value={customDateRange.start}
                                            onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                            style={{ focusRingColor: '#355E3B' }}
                                            value={customDateRange.end}
                                            onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Violations Table */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>
                                    Violations Ive Reported ({filteredViolations.length})
                                </h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Violation Details
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vehicle & Owner
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date Reported
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredViolations.map((violation) => (
                                            <tr key={violation.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {violation.violation_type}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Location: {violation.location}
                                                    </div>
                                                    {violation.description && (
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            {violation.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {violation.owner_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {violation.vehicle_plate} • {violation.vehicle_type}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {violation.owner_designation}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                                                        {getStatusIcon(violation.status)}
                                                        <span className="ml-1 capitalize">{violation.status}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(violation.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedViolation(violation);
                                                                setShowViewViolation(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedViolation(violation);
                                                                setShowEditViolation(true);
                                                            }}
                                                            className="text-green-600 hover:text-green-900 transition-colors duration-200"
                                                            title="Edit Violation"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        {violation.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(violation.id, 'resolved')}
                                                                className="text-green-600 hover:text-green-900 transition-colors duration-200"
                                                                title="Mark as Resolved"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredViolations.length === 0 && (
                                <div className="text-center py-12">
                                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No violations found</h3>
                                    <p className="text-gray-500">
                                        {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || designationFilter !== 'all' || vehicleTypeFilter !== 'all' || dateFilter !== 'all'
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
                                My Violation History
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Complete history of all violations youve reported with audit trail and status changes.
                            </p>

                            {/* History Timeline */}
                            <div className="space-y-4">
                                {violations.map((violation) => (
                                    <div key={violation.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{violation.violation_type}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {violation.owner_name} • {violation.vehicle_plate} • {violation.location}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                                                {getStatusIcon(violation.status)}
                                                <span className="ml-1 capitalize">{violation.status}</span>
                                            </span>
                                        </div>

                                        <div className="text-xs text-gray-500">
                                            Reported on {formatDate(violation.created_at)}
                                        </div>

                                        {violation.description && (
                                            <div className="mt-2 text-sm text-gray-600">
                                                {violation.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {violations.length === 0 && (
                                <div className="text-center py-8">
                                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No violation history found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Statistics Tab */}
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        {/* Statistics Header */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#355E3B' }}>
                                        My Violation Statistics
                                    </h3>
                                    <p className="text-gray-600">
                                        Analytics and insights for violations youve reported
                                    </p>
                                </div>
                                <div className="mt-4 lg:mt-0">
                                    <select
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ focusRingColor: '#355E3B' }}
                                        value={statsDateRange}
                                        onChange={(e) => setStatsDateRange(e.target.value)}
                                    >
                                        <option value="last7days">Last 7 Days</option>
                                        <option value="last30days">Last 30 Days</option>
                                        <option value="last90days">Last 90 Days</option>
                                        <option value="last6months">Last 6 Months</option>
                                        <option value="lastyear">Last Year</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-600">Total Violations</h4>
                                    <FileText className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-2xl font-bold" style={{ color: '#355E3B' }}>
                                    {statistics.totalViolations}
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-600">Pending</h4>
                                    <Clock className="w-5 h-5 text-yellow-500" />
                                </div>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {statistics.pendingViolations}
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-600">Resolved</h4>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                                <p className="text-2xl font-bold text-green-600">
                                    {statistics.resolvedViolations}
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-600">Contested</h4>
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <p className="text-2xl font-bold text-red-600">
                                    {statistics.contestedViolations}
                                </p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Monthly Trend Chart */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h4 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                    Monthly Violation Trend
                                </h4>
                                <div className="h-64 flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p>Monthly trend visualization</p>
                                        <p className="text-sm">(Chart implementation needed)</p>
                                    </div>
                                </div>
                            </div>

                            {/* Violation Type Distribution */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h4 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                    Violation Type Distribution
                                </h4>
                                <div className="space-y-3">
                                    {statistics.typeDistribution.map((type, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-700 truncate">
                                                        {type.type}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {type.count} ({type.percentage}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${type.percentage}%`,
                                                            backgroundColor: '#355E3B'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* User Type Breakdown */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h4 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                                Violations by User Type
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {statistics.designationBreakdown.map((designation, index) => (
                                    <div key={index} className="text-center p-4 border border-gray-200 rounded-lg">
                                        <div className="text-2xl font-bold mb-1" style={{ color: '#355E3B' }}>
                                            {designation.count}
                                        </div>
                                        <div className="text-sm text-gray-600">{designation.designation}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {designation.percentage}% of total
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SecurityViolationsPage;