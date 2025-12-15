'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SearchableUserSelect from '../../components/SearchableUserSelect';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function VehicleManagement() {
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        userId: '',
        vehicleType: '2-wheel',
        make: '',
        model: '',
        year: '',
        color: '',
        plateNumber: '',
        registrationDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [rejectModal, setRejectModal] = useState({ open: false, vehicleId: null, vehicleInfo: '' });
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [renewalRejectModal, setRenewalRejectModal] = useState({ open: false, vehicleId: null, vehicleInfo: '' });
    const [renewalRejectionReason, setRenewalRejectionReason] = useState('');
    const [processingRenewal, setProcessingRenewal] = useState(null);
    const router = useRouter();

    const fetchVehicles = useCallback(async () => {
        try {
            const response = await fetch('/api/vehicles');
            const data = await response.json();
            if (data.success) {
                setVehicles(data.vehicles);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        }
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
                await fetchVehicles();
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    }, [router, fetchVehicles]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Client-side validation for year
        const yearValue = parseInt(formData.year, 10);
        const currentYear = new Date().getFullYear();

        if (isNaN(yearValue) || yearValue < 1900 || yearValue > currentYear + 1) {
            setError(`Invalid year. Must be a 4-digit year between 1900 and ${currentYear + 1}`);
            return;
        }

        try {
            const response = await fetch('/api/vehicles/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Vehicle registered successfully!');
                setFormData({
                    userId: '',
                    vehicleType: '2-wheel',
                    make: '',
                    model: '',
                    year: '',
                    color: '',
                    plateNumber: '',
                    registrationDate: new Date().toISOString().split('T')[0]
                });
                setShowAddForm(false);
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to register vehicle');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const handleApproval = async (vehicleId, status) => {
        try {
            const response = await fetch('/api/vehicles/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ vehicleId, status }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`Vehicle ${status} successfully!`);
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to update vehicle status');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const openRejectModal = (vehicle) => {
        setRejectModal({
            open: true,
            vehicleId: vehicle.vehicle_id,
            vehicleInfo: `${vehicle.make} ${vehicle.model} - ${vehicle.plate_number}`
        });
        setRejectionReason('');
    };

    const closeRejectModal = () => {
        setRejectModal({ open: false, vehicleId: null, vehicleInfo: '' });
        setRejectionReason('');
    };

    const handleRejectWithReason = async () => {
        setRejecting(true);
        try {
            const response = await fetch('/api/vehicles/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vehicleId: rejectModal.vehicleId,
                    status: 'rejected',
                    rejectionReason: rejectionReason.trim() || null
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Vehicle rejected successfully!');
                closeRejectModal();
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to reject vehicle');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setRejecting(false);
        }
    };

    // Sticker Renewal Handlers
    const handleApproveRenewal = async (vehicleId) => {
        setProcessingRenewal(vehicleId);
        setError('');
        try {
            const response = await fetch('/api/vehicles/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicleId,
                    stickerStatus: 'renewed',
                    stickerRejectionReason: null // Clear any previous rejection reason
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Sticker renewal approved successfully!');
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to approve renewal');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setProcessingRenewal(null);
        }
    };

    const openRenewalRejectModal = (vehicle) => {
        setRenewalRejectModal({
            open: true,
            vehicleId: vehicle.vehicle_id,
            vehicleInfo: `${vehicle.make} ${vehicle.model} - ${vehicle.plate_number}`
        });
        setRenewalRejectionReason('');
    };

    const closeRenewalRejectModal = () => {
        setRenewalRejectModal({ open: false, vehicleId: null, vehicleInfo: '' });
        setRenewalRejectionReason('');
    };

    const handleRejectRenewal = async () => {
        setProcessingRenewal(renewalRejectModal.vehicleId);
        try {
            const response = await fetch('/api/vehicles/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicleId: renewalRejectModal.vehicleId,
                    stickerStatus: 'expired',
                    stickerRejectionReason: renewalRejectionReason.trim() || null
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Renewal request rejected.');
                closeRenewalRejectModal();
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to reject renewal');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setProcessingRenewal(null);
        }
    };

    // Get vehicles with renewal requests
    const renewalRequestedVehicles = vehicles.filter(v => v.sticker_status === 'renewal_requested');

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const getFilteredApprovedVehicles = () => {
        return vehicles.filter(v => {
            const isApproved = v.approval_status === 'approved';
            const matchesSearch = !searchFilter ||
                v.owner_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                v.owner_email?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                v.make?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                v.model?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                v.plate_number?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                v.color?.toLowerCase().includes(searchFilter.toLowerCase());
            return isApproved && matchesSearch;
        });
    };

    const getPaginatedVehicles = () => {
        const allVehicles = getFilteredApprovedVehicles();
        const itemsPerPage = 10;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return allVehicles.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        const itemsPerPage = 10;
        return Math.ceil(getFilteredApprovedVehicles().length / itemsPerPage);
    };

    const getPageNumbers = (currentPage, totalPages) => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    // Reset to page 1 when search filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilter]);

    if (loading) {
        return <LoadingSpinner message="Loading vehicles" />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Admin Dashboard" fallbackPath="/admin" />
                </div>

                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">Vehicle Management</h2>
                                <p className="text-gray-200">Manage vehicle registrations and approvals</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg hover:cursor-pointer"
                            style={{ backgroundColor: '#FFD700', color: '#355E3B' }}
                        >
                            {showAddForm ? 'Cancel' : '+ Add Vehicle'}
                        </button>
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

                {/* Add Vehicle Form */}
                {showAddForm && (
                    <div className="mb-8 bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Register New Vehicle</h3>
                            <p className="text-sm" style={{ color: '#FFD700' }}>Fill in the vehicle details</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Owner *
                                    </label>
                                    <SearchableUserSelect
                                        value={formData.userId}
                                        onChange={(userId) => setFormData(prev => ({ ...prev, userId }))}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Type *
                                    </label>
                                    <select
                                        id="vehicleType"
                                        name="vehicleType"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 hover:cursor-pointer rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        value={formData.vehicleType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="2-wheel">2-wheel (Motorcycle/Scooter)</option>
                                        <option value="4-wheel">4-wheel (Car/SUV)</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Make *
                                    </label>
                                    <input
                                        type="text"
                                        id="make"
                                        name="make"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="e.g., Toyota, Honda, Yamaha"
                                        value={formData.make}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Model *
                                    </label>
                                    <input
                                        type="text"
                                        id="model"
                                        name="model"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="e.g., Vios, Civic, Mio"
                                        value={formData.model}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                                        Model Year *
                                    </label>
                                    <input
                                        type="number"
                                        id="year"
                                        name="year"
                                        required
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="e.g., 2023"
                                        value={formData.year}
                                        onChange={handleInputChange}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Year must be between 1900 and {new Date().getFullYear() + 1}
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                                        Color *
                                    </label>
                                    <input
                                        type="text"
                                        id="color"
                                        name="color"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="e.g., Red, Blue, Black"
                                        value={formData.color}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                        Plate Number *
                                    </label>
                                    <input
                                        type="text"
                                        id="plateNumber"
                                        name="plateNumber"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="e.g., ABC-1234"
                                        value={formData.plateNumber}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg hover:cursor-pointer"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    Register Vehicle
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Pending Vehicle Approvals Section */}
                {vehicles.filter(v => v.approval_status === 'pending').length > 0 && (
                    <div className="mb-8 bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ backgroundColor: '#d97706' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <svg className="h-6 w-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Pending Approvals</h3>
                                        <p className="text-sm text-amber-100">Vehicles awaiting your review</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">{vehicles.filter(v => v.approval_status === 'pending').length}</p>
                                    <p className="text-xs text-amber-100">Pending</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vehicles.filter(v => v.approval_status === 'pending').map((vehicle) => (
                                    <div key={vehicle.vehicle_id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d97706' }}>
                                                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-semibold text-gray-900">{vehicle.make} {vehicle.model}</p>
                                                    <p className="text-xs text-gray-500">{vehicle.plate_number}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                                Pending
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center text-sm">
                                                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span className="text-gray-600">{vehicle.owner_name}</span>
                                            </div>
                                            <div className="flex items-center text-sm">
                                                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-gray-600 truncate">{vehicle.owner_email}</span>
                                            </div>
                                            <div className="flex items-center text-sm">
                                                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                </svg>
                                                <span className="text-gray-600">{vehicle.color} • {vehicle.type}</span>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleApproval(vehicle.vehicle_id, 'approved')}
                                                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 hover:cursor-pointer"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(vehicle)}
                                                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 hover:cursor-pointer"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => router.push(`/admin/vehicles/${vehicle.vehicle_id}/edit`)}
                                                className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Sticker Renewals Section */}
                {renewalRequestedVehicles.length > 0 && (
                    <div className="mb-8 bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ backgroundColor: '#2563eb' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <svg className="h-6 w-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Pending Sticker Renewals</h3>
                                        <p className="text-sm text-blue-100">Renewal requests awaiting your review</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">{renewalRequestedVehicles.length}</p>
                                    <p className="text-xs text-blue-100">Pending</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {renewalRequestedVehicles.map((vehicle) => (
                                    <div key={vehicle.vehicle_id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-600">
                                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-semibold text-gray-900">{vehicle.make} {vehicle.model}</p>
                                                    <p className="text-xs text-gray-500">{vehicle.plate_number}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                Renewal Requested
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center text-sm">
                                                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span className="text-gray-600">{vehicle.owner_name}</span>
                                            </div>
                                            <div className="flex items-center text-sm">
                                                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-gray-600 truncate">{vehicle.owner_email}</span>
                                            </div>
                                            <div className="flex items-center text-sm">
                                                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                </svg>
                                                <span className="text-gray-600">{vehicle.color} • {vehicle.type}</span>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleApproveRenewal(vehicle.vehicle_id)}
                                                disabled={processingRenewal === vehicle.vehicle_id}
                                                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 hover:cursor-pointer disabled:opacity-50"
                                            >
                                                {processingRenewal === vehicle.vehicle_id ? 'Processing...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => openRenewalRejectModal(vehicle)}
                                                disabled={processingRenewal === vehicle.vehicle_id}
                                                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 hover:cursor-pointer disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => router.push(`/admin/vehicles/${vehicle.vehicle_id}/edit`)}
                                                className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Vehicles List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="h-6 w-6 text-white mr-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z" />
                                </svg>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Registered Vehicles</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Approved vehicle registrations</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-white">{getFilteredApprovedVehicles().length}</p>
                                <p className="text-xs" style={{ color: '#FFD700' }}>Total</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="relative max-w-md">
                            <input
                                type="text"
                                placeholder="Search by owner, vehicle, plate number..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                                style={{ '--tw-ring-color': '#355E3B' }}
                            />
                            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sticker Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {getPaginatedVehicles().length > 0 ? (
                                    getPaginatedVehicles().map((vehicle) => (
                                        <tr key={vehicle.vehicle_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{vehicle.owner_name}</div>
                                                    <div className="text-sm text-gray-500">{vehicle.owner_email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{vehicle.make} {vehicle.model}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {vehicle.year ? vehicle.year : 'N/A'} • {vehicle.type} • {vehicle.color}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {vehicle.plate_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    vehicle.sticker_status === 'renewed' ? 'bg-green-100 text-green-800' :
                                                    vehicle.sticker_status === 'expired' ? 'bg-red-100 text-red-800' :
                                                    vehicle.sticker_status === 'renewal_requested' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {vehicle.sticker_status === 'renewal_requested' ? 'Renewal Requested' : (vehicle.sticker_status || 'pending')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    {vehicle.approval_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => router.push(`/admin/vehicles/${vehicle.vehicle_id}/edit`)}
                                                    className="text-blue-600 hover:text-blue-900 hover:cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="text-gray-500">
                                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z" />
                                                </svg>
                                                <p className="text-lg font-medium text-gray-900 mb-2">
                                                    {searchFilter ? 'No vehicles match your search' : 'No registered vehicles yet'}
                                                </p>
                                                <p className="text-gray-500">
                                                    {searchFilter ? 'Try adjusting your search terms' : 'Approved vehicles will appear here'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {getTotalPages() > 1 && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-gray-700">
                                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * 10 + 1}</span> to{' '}
                                    <span className="font-semibold text-gray-900">
                                        {Math.min(currentPage * 10, getFilteredApprovedVehicles().length)}
                                    </span>{' '}
                                    of <span className="font-semibold text-gray-900">{getFilteredApprovedVehicles().length}</span> vehicles
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="First page"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {getPageNumbers(currentPage, getTotalPages()).map((pageNum, idx) => (
                                            pageNum === '...' ? (
                                                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
                                            ) : (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                        pageNum === currentPage
                                                            ? 'text-white shadow-sm'
                                                            : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                    style={pageNum === currentPage ? { backgroundColor: '#355E3B' } : {}}
                                                >
                                                    {pageNum}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
                                        disabled={currentPage === getTotalPages()}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(getTotalPages())}
                                        disabled={currentPage === getTotalPages()}
                                        className="p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Last page"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Rejection Reason Modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto p-4">
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Reject Vehicle</h3>
                                        <p className="text-sm text-red-100">Provide a reason (optional)</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeRejectModal}
                                    className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors duration-200 hover:cursor-pointer"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Vehicle Info */}
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-600">Vehicle:</p>
                                <p className="text-base font-medium text-gray-900">{rejectModal.vehicleInfo}</p>
                            </div>

                            {/* Rejection Reason Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason <span className="text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
                                    style={{ '--tw-ring-color': '#dc2626' }}
                                    rows={3}
                                    placeholder="e.g., Invalid documents, duplicate registration, incomplete information..."
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    This reason will be shown to the vehicle owner.
                                </p>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={closeRejectModal}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                    disabled={rejecting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectWithReason}
                                    disabled={rejecting}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {rejecting ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Rejecting...
                                        </span>
                                    ) : (
                                        'Reject Vehicle'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Renewal Rejection Reason Modal */}
            {renewalRejectModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto p-4">
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Reject Renewal Request</h3>
                                        <p className="text-sm text-red-100">Provide a reason for rejection</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeRenewalRejectModal}
                                    className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors duration-200 hover:cursor-pointer"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Vehicle Info */}
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-600">Vehicle:</p>
                                <p className="text-base font-medium text-gray-900">{renewalRejectModal.vehicleInfo}</p>
                            </div>

                            {/* Rejection Reason Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={renewalRejectionReason}
                                    onChange={(e) => setRenewalRejectionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
                                    style={{ '--tw-ring-color': '#dc2626' }}
                                    rows={3}
                                    placeholder="e.g., Sticker is still valid, payment not received, documents need updating..."
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    This reason will be shown to the vehicle owner.
                                </p>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={closeRenewalRejectModal}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                    disabled={processingRenewal}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectRenewal}
                                    disabled={processingRenewal || !renewalRejectionReason.trim()}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processingRenewal ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Rejecting...
                                        </span>
                                    ) : (
                                        'Reject Renewal'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}