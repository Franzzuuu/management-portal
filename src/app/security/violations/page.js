'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import SearchableVehicleSelectForViolations from '../../components/SearchableVehicleSelectForViolations';

export default function SecurityViolationsManagement() {
    const [user, setUser] = useState(null);
    const [violations, setViolations] = useState([]);
    const [filteredViolations, setFilteredViolations] = useState([]);
    const [violationTypes, setViolationTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');

    // Filtering and Sorting States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [designationFilter, setDesignationFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    
    // Sorting state for Owner and Date only
    const [sortConfig, setSortConfig] = useState({
        key: 'date',        // 'owner' | 'date'
        direction: 'desc',  // 'asc' | 'desc'
    });

    // Form and UI States
    const [formData, setFormData] = useState({
        vehicleId: '',
        violationTypeId: '',
        description: '',
        imageFile: null
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const router = useRouter();

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Security') {
                setUser(data.user);
                await Promise.all([
                    fetchViolationTypes()
                ]);
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

    const fetchViolations = useCallback(async () => {
        try {
            if (!user) return;
            
            // Fetch only violations issued by this security user
            const response = await fetch(`/api/violations?securityFilter=true`, {
                headers: {
                    'X-User-Role': 'Security',
                    'X-User-Id': user?.uscId?.toString() || ''
                }
            });
            const data = await response.json();

            if (data.success) {
                setViolations(data.violations);
                setFilteredViolations(data.violations);
            } else {
                setError(data.error || 'Failed to fetch violations');
            }
        } catch (error) {
            console.error('Failed to fetch violations:', error);
            setError('Failed to fetch violations: ' + error.message);
        }
    }, [user]);

    useEffect(() => {
        if (user?.uscId) {
            fetchViolations();
        }
    }, [user?.uscId, fetchViolations]);

    useEffect(() => {
        filterViolations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, statusFilter, typeFilter, designationFilter, vehicleTypeFilter, dateFilter, customDateRange, violations, sortConfig]);

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
                    return 0;
            }

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

    const handleSort = (field) => {
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
            const response = await fetch(`/api/violations/view-image/${violationId}`);

            if (response.ok) {
                const blob = await response.blob();

                if (blob.size > 0) {
                    const imageUrl = URL.createObjectURL(blob);
                    setSelectedImage(imageUrl);
                    setShowImageModal(true);
                } else {
                    setError('No image data available');
                }
            } else {
                setError(`Failed to load image: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching violation image:', error);
            setError('Failed to load violation image');
        }
    };

    const handleCloseImageModal = () => {
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
                    <BackButton text="Back to Security Dashboard" fallbackPath="/security" />
                </div>

                {/* Page Header */}
                <div className="mb-6 p-6 rounded-xl shadow-lg border border-gray-200" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Violations Management</h1>
                            <p className="text-green-100 text-lg">Report and manage traffic violations</p>
                        </div>
                    </div>
                </div>

                {/* Manage Violations Content */}
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
                                    <option value="all">All Vehicle Types</option>
                                    <option value="Car">Car</option>
                                    <option value="Motorcycle">Motorcycle</option>
                                    <option value="SUV">SUV</option>
                                    <option value="Truck">Truck</option>
                                    <option value="Van">Van</option>
                                </select>
                            </div>

                            {/* Date Filter */}
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
                            {/* Header */}
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
                                        <SearchableVehicleSelectForViolations
                                            value={formData.vehicleId}
                                            onChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}
                                            required={true}
                                        />
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
