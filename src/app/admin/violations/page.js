'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

export default function ViolationsManagement() {
    const [user, setUser] = useState(null);
    const [violations, setViolations] = useState([]);
    const [filteredViolations, setFilteredViolations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [violationTypes, setViolationTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('manage'); // manage, contested, history, stats
    const [showAddForm, setShowAddForm] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');

    // Contested violations state
    const [contestedViolations, setContestedViolations] = useState([]);
    const [loadingContested, setLoadingContested] = useState(false);

    // Filtering and Sorting States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [designationFilter, setDesignationFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    
    // New sorting state for Owner and Date only
    const [sortConfig, setSortConfig] = useState({
        key: 'date',        // 'owner' | 'date'
        direction: 'desc',  // 'asc' | 'desc'
    });

    // Statistics States
    const [statsData, setStatsData] = useState({
        totalViolations: 0,
        monthlyTrends: [],
        violationTypeStats: [],
        userTypeStats: [],
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

    // Function definitions
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

    useEffect(() => {
        checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        filterViolations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, statusFilter, typeFilter, designationFilter, vehicleTypeFilter, dateFilter, customDateRange, violations, sortConfig]);

    useEffect(() => {
        if (activeTab === 'stats') {
            generateStatistics();
        } else if (activeTab === 'contested') {
            fetchContestedViolations();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, violations, statsDateRange]);

    const fetchContestedViolations = async () => {
        try {
            setLoadingContested(true);
            const response = await fetch('/api/admin/violation-contests');
            const data = await response.json();
            if (data.success) {
                setContestedViolations(data.contests);
            }
        } catch (error) {
            console.error('Failed to fetch contested violations:', error);
        } finally {
            setLoadingContested(false);
        }
    };

    const filterViolations = () => {
        let filtered = [...violations];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(violation => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    (violation.owner_name || '').toLowerCase().includes(searchLower) ||
                    (violation.vehicle_plate || '').toLowerCase().includes(searchLower) ||
                    (violation.violation_type || '').toLowerCase().includes(searchLower) ||
                    (violation.description || '').toLowerCase().includes(searchLower)
                );
            });
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

        // Sorting - only Owner and Date are sortable
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.key) {
                case 'owner':
                    // Extract first name from full name for sorting
                    const aFirstName = (a.owner_name || '').trim().split(' ')[0].toLowerCase();
                    const bFirstName = (b.owner_name || '').trim().split(' ')[0].toLowerCase();
                    aValue = aFirstName;
                    bValue = bFirstName;
                    break;
                case 'date':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                default:
                    // No sorting for other columns
                    return 0;
            }

            // String comparison for owner, date comparison for dates
            if (sortConfig.key === 'owner') {
                const comparison = aValue.localeCompare(bValue);
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            } else {
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            }
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

        // If no data, provide sample data structure for charts
        if (dataToAnalyze.length === 0) {
            setStatsData({
                totalViolations: 0,
                monthlyTrends: [
                    { month: 'Jan 2024', violations: 0 },
                    { month: 'Feb 2024', violations: 0 },
                    { month: 'Mar 2024', violations: 0 },
                    { month: 'Apr 2024', violations: 0 },
                    { month: 'May 2024', violations: 0 },
                    { month: 'Jun 2024', violations: 0 },
                ],
                violationTypeStats: [],
                userTypeStats: [
                    { user_type: 'Student', count: 0 },
                    { user_type: 'Faculty', count: 0 },
                    { user_type: 'Admin', count: 0 }
                ],
                statusStats: [
                    { status: 'pending', count: 0 },
                    { status: 'resolved', count: 0 },
                    { status: 'contested', count: 0 }
                ],
                topViolators: []
            });
            return;
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
            if (violation.owner_name && violation.vehicle_plate) {
                const key = `${violation.owner_name} • ${violation.vehicle_plate}`;
                violatorCounts[key] = (violatorCounts[key] || 0) + 1;
            }
        });

        const topViolators = Object.entries(violatorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        setStatsData({
            totalViolations: dataToAnalyze.length,
            monthlyTrends: Object.entries(monthlyStats).map(([month, violations]) => ({ month, violations })),
            violationTypeStats: Object.entries(typeStats).map(([name, count]) => ({ name, count })),
            userTypeStats: Object.entries(designationStats).map(([user_type, count]) => ({ user_type, count })),
            statusStats: Object.entries(statusStats).map(([status, count]) => ({ status, count })),
            topViolators
        });
    };

    const handleSort = (field) => {
        // Only allow sorting for Owner and Date columns
        if (field !== 'owner_name' && field !== 'created_at') {
            return;
        }
        
        const key = field === 'owner_name' ? 'owner' : 'date';
        
        if (sortConfig.key === key) {
            setSortConfig({
                key,
                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
            });
        } else {
            setSortConfig({
                key,
                direction: key === 'owner' ? 'asc' : 'desc'
            });
        }
    };

    const getSortIcon = (field) => {
        // Only show sort icons for Owner and Date columns
        if (field !== 'owner_name' && field !== 'created_at') {
            return null;
        }
        
        const key = field === 'owner_name' ? 'owner' : 'date';
        
        if (sortConfig.key !== key) {
            return (
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            // Convert form data to string values to prevent undefined
            const submitData = new FormData();
            submitData.append('vehicleId', formData.vehicleId || '');
            submitData.append('violationTypeId', formData.violationTypeId || '');
            submitData.append('description', formData.description || '');
            if (formData.imageFile) {
                submitData.append('image', formData.imageFile);
            }

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

    const handleViewImage = async (violationId) => {
        try {
            // Use the new direct blob-to-image endpoint
            const response = await fetch(`/api/violations/view-image/${violationId}`);

            if (response.ok) {
                // Get the image as a blob
                const blob = await response.blob();

                if (blob.size > 0) {
                    // Create object URL from blob
                    const imageUrl = URL.createObjectURL(blob);
                    setSelectedImage(imageUrl);
                    setShowImageModal(true);
                } else {
                    setError('No image data available');
                }
            } else {
                const errorText = await response.text();
                setError(`Failed to load image: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching violation image:', error);
            setError('Failed to load violation image');
        }
    };

    const handleCloseImageModal = () => {
        // Clean up blob URL to prevent memory leaks
        if (selectedImage && selectedImage.startsWith('blob:')) {
            URL.revokeObjectURL(selectedImage);
        }
        setSelectedImage('');
        setShowImageModal(false);
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
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Admin Dashboard" fallbackPath="/admin" />
                </div>

                {/* Page Header with Tabs */}
                <div className="mb-6 p-6 rounded-xl shadow-lg border border-gray-200" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="mb-4 lg:mb-0">
                            <h1 className="text-3xl font-bold text-white mb-2">Violations System</h1>
                            <p className="text-green-100 text-lg">Manage, track, and analyze traffic violations</p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-green-800 bg-opacity-30 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('manage')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'manage'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'manage' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Manage Violations
                            </button>
                            <button
                                onClick={() => setActiveTab('contested')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'contested'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'contested' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Contested Violations
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'history'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'history' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Violation History
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'stats'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
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
                    <div className="space-y-5">
                        {/* Action Buttons */}
                        <div className="max-w-6xl mx-auto px-4">
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="inline-flex items-center px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-medium shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Report New Violation</span>
                            </button>
                            <p className="text-sm text-gray-500 mt-2">Use this to manually file a new violation record.</p>
                        </div>

                        {/* Advanced Filters */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                Advanced Filters & Search
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
                                    <input
                                        type="text"
                                        placeholder="Name, plate, type, description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    />
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="contested">Contested</option>
                                    </select>
                                </div>

                                {/* Violation Type Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Violation Type</label>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    >
                                        <option value="all">All Types</option>
                                        {violationTypes.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* User Type Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">User Type</label>
                                    <select
                                        value={designationFilter}
                                        onChange={(e) => setDesignationFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    >
                                        <option value="all">All Users</option>
                                        <option value="Student">Students</option>
                                        <option value="Faculty">Faculty</option>
                                        <option value="Admin">Admins</option>
                                    </select>
                                </div>

                                {/* Vehicle Type Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Vehicle Type</label>
                                    <select
                                        value={vehicleTypeFilter}
                                        onChange={(e) => setVehicleTypeFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    >
                                        <option value="all">All Vehicles</option>
                                        <option value="2-wheel">2-Wheel</option>
                                        <option value="4-wheel">4-Wheel</option>
                                    </select>
                                </div>

                                {/* Date Range Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Date Range</label>
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                        style={{ '--tw-ring-color': '#355E3B' }}
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
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={customDateRange.start}
                                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                                style={{ '--tw-ring-color': '#355E3B' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={customDateRange.end}
                                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                                                style={{ '--tw-ring-color': '#355E3B' }}
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
                                        className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors duration-200 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
                                    >
                                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results Summary */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-1">
                            <span>Showing <strong className="text-gray-700">{filteredViolations.length}</strong> of <strong className="text-gray-700">{violations.length}</strong> violations</span>
                            <span>Sort by: <strong className="text-gray-700">
                                {sortConfig.key === 'owner' 
                                    ? `Owner (${sortConfig.direction === 'asc' ? 'A–Z' : 'Z–A'})` 
                                    : `Date (${sortConfig.direction === 'desc' ? 'Recent → Old' : 'Old → Recent'})`
                                }
                            </strong></span>
                        </div>

                        {/* Violations Table */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-green-800 border-b border-green-900">
                                        <tr>
                                            <th
                                                onClick={() => handleSort('owner_name')}
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase tracking-wide cursor-pointer hover:bg-green-700/70 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Owner</span>
                                                    {getSortIcon('owner_name')}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase tracking-wide">
                                                Vehicle
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase tracking-wide">
                                                Violation Type
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase tracking-wide">
                                                Description
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase tracking-wide">
                                                Status
                                            </th>
                                            <th
                                                onClick={() => handleSort('created_at')}
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase tracking-wide cursor-pointer hover:bg-green-700/70 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Date</span>
                                                    {getSortIcon('created_at')}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase tracking-wide">
                                                Supporting Image
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredViolations.map((violation) => (
                                            <tr key={violation.id} className="hover:bg-green-50 transition-colors duration-200 border-t border-gray-200">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900">
                                                            {violation.owner_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getDesignationColor(violation.owner_designation)}`}>
                                                                {violation.owner_designation}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-md inline-block">
                                                            {violation.vehicle_plate || 'No Plate'}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-1 font-medium flex items-center">
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                            {violation.brand} {violation.model}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{violation.violation_type}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                                        {violation.description || 'No description provided'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                                                        violation.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                        violation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        violation.status === 'contested' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {violation.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(violation.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {violation.has_image && (
                                                        <button
                                                            onClick={() => handleViewImage(violation.id)}
                                                            className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors duration-200 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                                        >
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            View
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredViolations.length === 0 && (
                                <div className="text-center py-16 bg-gray-50 rounded-lg mx-6 mb-6">
                                    <div className="text-6xl mb-4">🎉</div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No violations found</h3>
                                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                                        {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                                            ? 'Try changing your filters or date range to see more results.'
                                            : 'Great job! No violations have been reported yet.'
                                        }
                                    </p>
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
                                        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors duration-200 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Contested Violations Tab */}
                {activeTab === 'contested' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                            {/* Section Header & Appeals Count */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                                        <svg className="h-5 w-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            Contested Violations Appeals
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Review and manage violation appeals submitted by students and faculty
                                        </p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                                    {contestedViolations.length === 1 ? '1 Appeal' : `${contestedViolations.length} Appeals`}
                                </span>
                            </div>

                            {loadingContested ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#355E3B' }}></div>
                                    <span className="ml-3 text-gray-600">Loading contested violations...</span>
                                </div>
                            ) : contestedViolations.length === 0 ? (
                                <div className="py-10 text-center text-gray-600">
                                    <div className="text-4xl mb-3">🎉</div>
                                    <p className="text-base font-semibold">No contested violations</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        All appeals have been reviewed. You&apos;ll see new appeals here as they are filed.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-green-800 text-gray-100 text-xs font-semibold uppercase tracking-wide">
                                                <th className="px-6 py-3 text-left">Appeal Details</th>
                                                <th className="px-6 py-3 text-left">Violation Info</th>
                                                <th className="px-6 py-3 text-left">Appellant</th>
                                                <th className="px-6 py-3 text-left">Status</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {contestedViolations.map((contest) => (
                                                <tr key={contest.contest_id} className="border-b border-gray-100 hover:bg-green-50 transition-colors">
                                                    {/* Appeal Details Column */}
                                                    <td className="px-6 py-4">
                                                        <div className="border-l-2 border-green-600 pl-3">
                                                            <div className="text-sm font-bold text-gray-900">Appeal #{contest.contest_id}</div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Submitted: {new Date(contest.contest_created_at).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className="text-xs text-gray-600 mt-1 line-clamp-2" style={{ 
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}>
                                                                {contest.contest_notes && contest.contest_notes.length > 80 
                                                                    ? contest.contest_notes.substring(0, 80) + '...' 
                                                                    : contest.contest_notes || 'No message provided'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Violation Info Column */}
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-semibold text-gray-900">
                                                            Violation #{contest.violation_id}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            {contest.violation_type}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            {contest.vehicle_info || 'Vehicle info not available'}
                                                        </div>
                                                    </td>

                                                    {/* Appellant Column */}
                                                    <td className="px-6 py-4 whitespace-normal">
                                                        <div className="text-sm font-semibold text-gray-900">
                                                            {contest.user_name}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            {contest.email}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {contest.designation}
                                                        </div>
                                                    </td>

                                                    {/* Status Column */}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                                                            contest.contest_status === 'pending'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : contest.contest_status === 'approved'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : contest.contest_status === 'denied'
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {contest.contest_status.charAt(0).toUpperCase() + contest.contest_status.slice(1)}
                                                        </span>
                                                    </td>

                                                    {/* Actions Column */}
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => window.location.href = `/admin/appeals?appeal=${contest.contest_id}`}
                                                                className="text-sm font-medium text-blue-700 hover:text-blue-900 underline"
                                                            >
                                                                Review
                                                            </button>
                                                            {contest.violation_image && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedImage(`data:${contest.violation_image_mime};base64,${contest.violation_image}`);
                                                                        setShowImageModal(true);
                                                                    }}
                                                                    className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                                >
                                                                    View Evidence
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
                                <div className="bg-blue-600 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-white">{violations.length}</div>
                                    <div className="text-sm text-blue-100">Total Violations</div>
                                </div>
                                <div className="bg-yellow-600 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-white">{violations.filter(v => v.status === 'pending').length}</div>
                                    <div className="text-sm text-yellow-100">Pending</div>
                                </div>
                                <div className="bg-green-600 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-white">{violations.filter(v => v.status === 'resolved').length}</div>
                                    <div className="text-sm text-green-100">Resolved</div>
                                </div>
                                <div className="bg-red-600 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-white">{violations.filter(v => v.status === 'contested').length}</div>
                                    <div className="text-sm text-red-100">Contested</div>
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
                                                            {violation.vehicle_plate} • {violation.brand} {violation.model}
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
                                                    <div className="text-sm text-gray-900">
                                                        {violation.reporter_name || violation.reported_by || 'Unknown'}
                                                    </div>
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
                    <div className="space-y-8">
                        {/* Date Range Filter */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Analytics Date Range</h3>
                                    <p className="text-gray-600 text-sm">Filter violation statistics by date range</p>
                                </div>
                                <div className="flex flex-wrap items-end gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={statsDateRange.start}
                                            onChange={(e) => setStatsDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-700"
                                            style={{ '--tw-ring-color': '#355E3B' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={statsDateRange.end}
                                            onChange={(e) => setStatsDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-700"
                                            style={{ '--tw-ring-color': '#355E3B' }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setStatsDateRange({ start: '', end: '' })}
                                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* KPI Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow duration-200" 
                                 style={{ borderLeftColor: '#355E3B' }}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" 
                                             style={{ backgroundColor: '#355E3B' }}>
                                            <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">Total Violations</h3>
                                        <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>
                                            {statsData.totalViolations}
                                        </p>
                                        <p className="text-sm text-gray-500">All recorded violations</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow duration-200" 
                                 style={{ borderLeftColor: '#F59E0B' }}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" 
                                             style={{ backgroundColor: '#F59E0B' }}>
                                            <svg className="h-6 w-6" style={{ color: '#FFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">Pending Resolution</h3>
                                        <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>
                                            {statsData.statusStats.find(s => s.status === 'pending')?.count || 0}
                                        </p>
                                        <p className="text-sm text-gray-500">Awaiting action</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow duration-200" 
                                 style={{ borderLeftColor: '#10B981' }}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" 
                                             style={{ backgroundColor: '#10B981' }}>
                                            <svg className="h-6 w-6" style={{ color: '#FFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">Resolved Cases</h3>
                                        <p className="text-3xl font-bold" style={{ color: '#10B981' }}>
                                            {statsData.statusStats.find(s => s.status === 'resolved')?.count || 0}
                                        </p>
                                        <p className="text-sm text-gray-500">Successfully completed</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow duration-200" 
                                 style={{ borderLeftColor: '#DC2626' }}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" 
                                             style={{ backgroundColor: '#DC2626' }}>
                                            <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">Contested Appeals</h3>
                                        <p className="text-3xl font-bold" style={{ color: '#DC2626' }}>
                                            {statsData.statusStats.find(s => s.status === 'contested')?.count || 0}
                                        </p>
                                        <p className="text-sm text-gray-500">Under review</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 1 - Trends and Types */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" 
                                     style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Monthly Violation Trends</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Track violation patterns over time</p>
                                </div>
                                <div className="p-6">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={statsData.monthlyTrends}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                                <XAxis 
                                                    dataKey="month" 
                                                    stroke="#6b7280" 
                                                    fontSize={12}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    stroke="#6b7280" 
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip 
                                                    contentStyle={{
                                                        backgroundColor: '#355E3B',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="violations" 
                                                    stroke="#355E3B" 
                                                    strokeWidth={3}
                                                    dot={{ fill: '#FFD700', strokeWidth: 2, r: 6 }}
                                                    activeDot={{ r: 8, stroke: '#355E3B', fill: '#FFD700' }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" 
                                     style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Violations by Type</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Distribution of different violation categories</p>
                                </div>
                                <div className="p-6">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statsData.violationTypeStats}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="count"
                                                >
                                                    {statsData.violationTypeStats.map((entry, index) => {
                                                        const colors = ['#355E3B', '#FFD700', '#DC2626', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6', '#EC4899'];
                                                        return (
                                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                                        );
                                                    })}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={36}
                                                    iconType="circle"
                                                    wrapperStyle={{ fontSize: '12px', color: '#6b7280' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 2 - User Types and Top Violators */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" 
                                     style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Violations by User Type</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Breakdown by student, faculty, and staff</p>
                                </div>
                                <div className="p-6">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={statsData.userTypeStats}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                                <XAxis 
                                                    dataKey="user_type" 
                                                    stroke="#6b7280" 
                                                    fontSize={12}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    stroke="#6b7280" 
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip 
                                                    contentStyle={{
                                                        backgroundColor: '#355E3B',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="count" 
                                                    fill="#355E3B"
                                                    radius={[4, 4, 0, 0]}
                                                >
                                                    {statsData.userTypeStats.map((entry, index) => {
                                                        const colors = {
                                                            'Student': '#355E3B',
                                                            'Faculty': '#FFD700', 
                                                            'Admin': '#DC2626'
                                                        };
                                                        return (
                                                            <Cell key={`cell-${index}`} fill={colors[entry.user_type] || '#6b7280'} />
                                                        );
                                                    })}
                                                </Bar>
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={36}
                                                    iconType="rect"
                                                    wrapperStyle={{ fontSize: '12px', color: '#6b7280' }}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" 
                                     style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Top Violators Leaderboard</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Most frequent violation offenders</p>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3">
                                        {statsData.topViolators.slice(0, 8).map((violator, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 hover:shadow-sm transition-shadow duration-200"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        {index < 3 ? (
                                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
                                                                style={{
                                                                    backgroundColor: index === 0 ? '#FFD700' :
                                                                                   index === 1 ? '#C0C0C0' :
                                                                                   '#CD7F32'
                                                                }}>
                                                                <span style={{ color: index === 0 ? '#355E3B' : '#FFF' }}>
                                                                    {index + 1}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-200 text-gray-600 font-semibold">
                                                                {index + 1}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">
                                                            {violator.name || 'Unknown User'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {index < 3 ? 'Top Offender' : 'Frequent Violator'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${
                                                        index < 3 
                                                            ? 'bg-red-100 text-red-700' 
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {violator.count || 0} violations
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {statsData.topViolators.length === 0 && (
                                            <div className="text-center py-12">
                                                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                                <p className="text-gray-500 font-medium text-lg">No violations recorded yet!</p>
                                                <p className="text-sm text-gray-400 mt-2">Keep up the good work with traffic safety</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Violation Modal */}
                {showAddForm && (
                    <div
                        className="fixed inset-0 flex items-center justify-center p-4 z-50"
                        style={{
                            backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/images/ismisbg.jpg')",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
                            {/* Enhanced Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg"
                                            style={{ backgroundColor: '#355E3B' }}>
                                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900">Report New Violation</h3>
                                            <p className="text-sm text-gray-600 mt-1">Document traffic violation with comprehensive details</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:cursor-pointer p-2 rounded-full hover:bg-gray-100"
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                                     text-black placeholder:text-gray-400
                                                    focus:ring-2 focus:ring-green-800 focus:border-transparent focus:outline-none"
                                            style={{ focusRingColor: '#355E3B' }}
                                            required
                                        >
                                            <option value="">Choose a vehicle...</option>
                                            {vehicles.map(vehicle => (
                                                <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                                     text-black placeholder:text-gray-400
                                                       focus:ring-2 focus:ring-green-800 focus:border-transparent focus:outline-none"
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                                     text-black placeholder:text-gray-400
                                                     focus:ring-2 focus:ring-green-800 focus:border-transparent focus:outline-none"
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                                    text-black file:mr-4 file:py-2 file:px-4 
                                                      file:rounded-md file:border-0 
                                                      file:text-sm file:font-semibold 
                                                    file:bg-green-800 file:text-white 
                                                    hover:file:bg-green-700
                                                      focus:ring-2 focus:ring-green-800 focus:border-transparent focus:outline-none"
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
                                        className="flex-1 px-6 py-3 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 hover:cursor-pointer"
                                        style={{ backgroundColor: '#355E3B' }}
                                    >
                                        Report Violation
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200 hover:cursor-pointer"
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
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                        onClick={handleCloseImageModal}
                    >
                        <div
                            className="relative max-w-4xl max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={handleCloseImageModal}
                                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200 z-10 hover:cursor-pointer"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <Image
                                src={selectedImage}
                                alt="Violation Evidence"
                                width={800}
                                height={600}
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}