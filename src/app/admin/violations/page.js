import ViolationsPage from './ViolationsPage';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ViolationsManagement() {
    const [user, setUser] = useState(null);
    const [violations, setViolations] = useState([]);
    const [filteredViolations, setFilteredViolations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [violationTypes, setViolationTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [formData, setFormData] = useState({
        vehicleId: '',
        violationTypeId: '',
        description: '',
        imageFile: null
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        filterViolations();
    }, [searchTerm, statusFilter, typeFilter, violations]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
                await Promise.all([
                    fetchViolations(),
                    fetchVehicles(),
                    fetchViolationTypes()
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

    const filterViolations = () => {
        let filtered = [...violations];

        if (searchTerm) {
            filtered = filtered.filter(violation =>
                violation.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.violation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                violation.reported_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(violation => violation.status === statusFilter);
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(violation => violation.violation_type_id === parseInt(typeFilter));
        }

        setFilteredViolations(filtered);
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
                body: submitData,
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Violation reported successfully!');
                setFormData({ vehicleId: '', violationTypeId: '', description: '', imageFile: null });
                setShowAddForm(false);
                await fetchViolations();
            } else {
                setError(data.error || 'Failed to report violation');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const handleStatusUpdate = async (violationId, newStatus) => {
        try {
            const response = await fetch('/api/violations/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ violationId, status: newStatus }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`Violation ${newStatus} successfully!`);
                await fetchViolations();
            } else {
                setError(data.error || 'Failed to update violation status');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const handleDeleteViolation = async (violationId) => {
        if (!confirm('Are you sure you want to delete this violation?')) return;

        try {
            const response = await fetch('/api/violations/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ violationId }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Violation deleted successfully!');
                await fetchViolations();
            } else {
                setError(data.error || 'Failed to delete violation');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'imageFile') {
            setFormData({ ...formData, [name]: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
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

    const formatDateTime = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-US', {
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#355E3B' }}></div>
                    <span className="text-gray-600">Loading violations...</span>
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
                            <div>
                                <img src="/images/usclogo.png" alt="Logo" className="mx-auto h-32 w-auto" />
                            </div>
                            <div className="ml-3">
                                <h1 className="text-xl font-bold text-white">
                                    RFID Vehicle Management Portal
                                </h1>
                                <p className="text-sm" style={{ color: '#FFD700' }}>
                                    University of San Carlos - Talamban Campus
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/admin')}
                                className="text-white hover:text-yellow-300 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
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
                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">Violations Management</h2>
                                <p className="text-gray-200">Monitor and manage parking violations campus-wide</p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg"
                                style={{ backgroundColor: '#FFD700', color: '#355E3B' }}
                            >
                                {showAddForm ? 'Cancel' : '+ Report Violation'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Success/Error Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-600">{success}</p>
                    </div>
                )}

                {/* Quick Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#355E3B' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Total Violations</h3>
                                <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>{filteredViolations.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-yellow-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Pending</h3>
                                <p className="text-3xl font-bold text-yellow-500">
                                    {filteredViolations.filter(v => v.status === 'pending').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-green-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Resolved</h3>
                                <p className="text-3xl font-bold text-green-500">
                                    {filteredViolations.filter(v => v.status === 'resolved').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-red-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-red-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Contested</h3>
                                <p className="text-3xl font-bold text-red-500">
                                    {filteredViolations.filter(v => v.status === 'contested').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Violation Form */}
                {showAddForm && (
                    <div className="mb-8 bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Report New Violation</h3>
                            <p className="text-sm" style={{ color: '#FFD700' }}>Document parking violations with photographic evidence</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle *
                                    </label>
                                    <select
                                        id="vehicleId"
                                        name="vehicleId"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        value={formData.vehicleId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select vehicle</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.plate_number} - {vehicle.make} {vehicle.model} ({vehicle.owner_name})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="violationTypeId" className="block text-sm font-medium text-gray-700 mb-1">
                                        Violation Type *
                                    </label>
                                    <select
                                        id="violationTypeId"
                                        name="violationTypeId"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        value={formData.violationTypeId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select violation type</option>
                                        {violationTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                        Description/Details
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="Additional details about the violation..."
                                        value={formData.description}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-1">
                                        Evidence Photo
                                    </label>
                                    <input
                                        type="file"
                                        id="imageFile"
                                        name="imageFile"
                                        accept="image/*"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        onChange={handleInputChange}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Upload photo evidence of the violation (optional)
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    Report Violation
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Quick Filters */}
                <div className="bg-white rounded-xl shadow-lg mb-8">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl font-semibold text-white">Filter Violations</h2>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Search and filter violation records</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                <input
                                    type="text"
                                    placeholder="Search by plate, owner, or reporter"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="contested">Contested</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Violation Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="all">All Types</option>
                                    {violationTypes.map((type) => (
                                        <option key={type.id} value={type.id.toString()}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={fetchViolations}
                                    className="w-full px-4 py-2 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Refresh</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Violations Table */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">Violation Records</h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Manage parking violations and enforcement actions</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date & Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehicle
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Owner
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Violation Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reported By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Evidence
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredViolations.length > 0 ? (
                                    filteredViolations.map((violation) => (
                                        <tr key={violation.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDateTime(violation.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {violation.plate_number}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {violation.vehicle_make} {violation.vehicle_model}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {violation.owner_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {violation.owner_designation}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {violation.violation_type}
                                                </div>
                                                {violation.description && (
                                                    <div className="text-sm text-gray-500 max-w-xs truncate">
                                                        {violation.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {violation.reported_by_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                                                    {violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {violation.has_image ? (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedImage(`/api/violations/image/${violation.id}`);
                                                            setShowImageModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                                    >
                                                        View Photo
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400">No photo</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    {violation.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(violation.id, 'resolved')}
                                                                className="text-green-600 hover:text-green-900"
                                                            >
                                                                Resolve
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(violation.id, 'contested')}
                                                                className="text-yellow-600 hover:text-yellow-900"
                                                            >
                                                                Contest
                                                            </button>
                                                        </>
                                                    )}
                                                    {violation.status === 'contested' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(violation.id, 'resolved')}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            Resolve
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteViolation(violation.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                </svg>
                                                <p className="text-lg font-medium">No violations found</p>
                                                <p className="text-sm">Try adjusting your filters or report a new violation</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Image Modal */}
                {showImageModal && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowImageModal(false)}>
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Violation Evidence</h3>
                                    <button
                                        onClick={() => setShowImageModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <img
                                    src={selectedImage}
                                    alt="Violation Evidence"
                                    className="w-full h-auto rounded-lg"
                                    onError={(e) => {
                                        e.target.src = '/images/no-image-placeholder.png';
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}