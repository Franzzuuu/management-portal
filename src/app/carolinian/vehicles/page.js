'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import useSocketChannel from '@/hooks/useSocketChannel';

export default function CarolinianVehicles() {
    const [user, setUser] = useState(null);
    const [registeredVehicles, setRegisteredVehicles] = useState([]);
    const [pendingVehicles, setPendingVehicles] = useState([]);
    const [activeTab, setActiveTab] = useState('vehicles');
    const [loading, setLoading] = useState(true);
    const [accessLogs, setAccessLogs] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        vehicleType: '',
        make: '',
        model: '',
        year: '',
        color: '',
        plateNumber: ''
    });
    const router = useRouter();

    const fetchUserData = async () => {
        try {
            const response = await fetch('/api/auth/me'); // Changed from /api/auth/session to /api/auth/me
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUser(data.user);
                    console.log('User data loaded:', data.user); // Debug log
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            router.push('/login');
        }
    };

    const fetchVehicles = useCallback(async () => {
        try {
            // Only show loading if we don't have any data yet
            if (registeredVehicles.length === 0 && pendingVehicles.length === 0) {
                setLoading(true);
            }
            const response = await fetch('/api/vehicles?mine=1');
            if (response.ok) {
                const data = await response.json();
                setRegisteredVehicles(data.registered || []);
                setPendingVehicles(data.pending || []);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        } finally {
            setLoading(false);
        }
    }, [registeredVehicles.length, pendingVehicles.length]);

    const fetchAccessLogs = useCallback(async () => {
        try {
            // Only show loading if we don't have any access logs yet
            if (accessLogs.length === 0) {
                setLoading(true);
            }
            const response = await fetch('/api/carolinian/access-logs');
            if (response.ok) {
                const data = await response.json();
                setAccessLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch access logs:', error);
        } finally {
            setLoading(false);
        }
    }, [accessLogs.length]);

    useEffect(() => {
        fetchUserData();
        fetchVehicles();
        if (activeTab === 'logs') {
            fetchAccessLogs();
        }
    }, [activeTab, fetchVehicles, fetchAccessLogs]); // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time vehicle updates for this user
    const { connected } = useSocketChannel('vehicles', {
        // Handle vehicle approval/status changes
        pending_update: (payload) => {
            console.log('Vehicles page received vehicles:pending_update:', payload);
            if (payload.owner_id === user?.uscId) {
                console.log('Vehicle update for current user - updating state directly');

                // Update registered vehicles if this vehicle was approved
                if (payload.approval_status === 'approved') {
                    // Move from pending to registered
                    setPendingVehicles(prev => prev.filter(v => v.vehicle_id !== payload.vehicle_id));
                    setRegisteredVehicles(prev => {
                        const exists = prev.find(v => v.vehicle_id === payload.vehicle_id);
                        if (!exists) {
                            return [...prev, payload];
                        }
                        return prev.map(v => v.vehicle_id === payload.vehicle_id ? payload : v);
                    });
                } else if (payload.approval_status === 'rejected') {
                    // Update the vehicle in pending list
                    setPendingVehicles(prev =>
                        prev.map(v => v.vehicle_id === payload.vehicle_id ? payload : v)
                    );
                } else {
                    // Update pending vehicles
                    setPendingVehicles(prev =>
                        prev.map(v => v.vehicle_id === payload.vehicle_id ? payload : v)
                    );
                }
            }
        },

        // Handle RFID/sticker assignments
        rfid_update: (payload) => {
            console.log('Vehicles page received vehicles:rfid_update:', payload);
            if (payload.owner_id === user?.uscId) {
                console.log('RFID update for current user - updating vehicle sticker status');
                setRegisteredVehicles(prevVehicles =>
                    prevVehicles.map(vehicle =>
                        vehicle.vehicle_id === payload.vehicle_id
                            ? { ...vehicle, sticker_status: payload.sticker_status, rfid_tag_uid: payload.rfid_tag_uid }
                            : vehicle
                    )
                );
            }
        }
    }, {
        enablePollingFallback: true,
        pollFn: () => {
            console.log('Vehicles page polling fallback');
            fetchVehicles();
        },
        pollIntervalMs: 30000 // Reduced frequency for polling fallback
    });

    // Also subscribe to access logs if user is viewing the logs tab
    const { connected: accessLogsConnected } = useSocketChannel('access_logs', {
        // Handle new access log entries
        update: (record) => {
            console.log('Vehicles page received access_logs:update:', record);
            if (record.user_id === user?.uscId && activeTab === 'logs') {
                console.log('Access log update for current user - adding to state');
                setAccessLogs(prevLogs => {
                    // Check if this log already exists to prevent duplicates
                    const exists = prevLogs.find(log => log.id === record.id);
                    if (!exists) {
                        // Add new log at the beginning of the array (most recent first)
                        return [record, ...prevLogs];
                    }
                    return prevLogs;
                });
            }
        }
    }, {
        enablePollingFallback: false,
        autoSubscribe: activeTab === 'logs' // Only subscribe when viewing logs tab
    });

    // Debug: Log when user changes
    useEffect(() => {
        if (user) {
            console.log('User loaded in vehicles page:', user);
            console.log('User uscId:', user.uscId);
        }
    }, [user]);

    // Add auto-refresh when page becomes visible (but without loading state)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // Silently refresh data without showing loading
                fetch('/api/vehicles?mine=1')
                    .then(response => response.json())
                    .then(data => {
                        if (data.registered || data.pending) {
                            setRegisteredVehicles(data.registered || []);
                            setPendingVehicles(data.pending || []);
                        }
                    })
                    .catch(error => console.error('Failed to refresh vehicles:', error));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            const response = await fetch('/api/vehicles/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                // Show success message
                alert('Vehicle submitted for approval. You will be notified once reviewed.');
                setShowForm(false);
                setFormData({
                    vehicleType: '',
                    make: '',
                    model: '',
                    year: '',
                    color: '',
                    plateNumber: ''
                });
                // Refresh vehicle list silently
                fetch('/api/vehicles?mine=1')
                    .then(response => response.json())
                    .then(data => {
                        if (data.registered || data.pending) {
                            setRegisteredVehicles(data.registered || []);
                            setPendingVehicles(data.pending || []);
                        }
                    })
                    .catch(error => console.error('Failed to refresh vehicles:', error));
            } else {
                alert(result.error || 'Failed to submit vehicle registration');
            }
        } catch (error) {
            console.error('Error submitting vehicle:', error);
            alert('Failed to submit vehicle registration. Please try again.');
        } finally {
            setFormLoading(false);
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

    const getApprovalStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStickerStatusColor = (status) => {
        switch (status) {
            case 'renewed': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getApprovalStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'rejected':
                return (
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'pending':
                return (
                    <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };


    const renderVehicleCard = (vehicle, isRegistered = true) => (
        <div key={vehicle.vehicle_id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                        <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h4 className="text-lg font-semibold text-gray-900">{vehicle.plate_number}</h4>
                        <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                    </div>
                </div>
                <div className="flex items-center">
                    {getApprovalStatusIcon(vehicle.approval_status)}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Color:</span>
                    <span className="text-sm font-medium text-gray-900">{vehicle.color}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Year:</span>
                    <span className="text-sm font-medium text-gray-900">{vehicle.year}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type:</span>
                    <span className="text-sm font-medium text-gray-900">{vehicle.vehicle_type}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getApprovalStatusColor(vehicle.approval_status)}`}>
                        {vehicle.approval_status}
                    </span>
                </div>
                {isRegistered && (
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Sticker:</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStickerStatusColor(vehicle.sticker_status)}`}>
                            {vehicle.sticker_status || 'pending'}
                        </span>
                    </div>
                )}
                {vehicle.rfid_tag_uid && (
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-500">RFID Tag:</span>
                        <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {vehicle.rfid_tag_uid.slice(-8)}...
                        </span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Submitted:</span>
                    <span className="text-sm text-gray-700">
                        {new Date(vehicle.created_at).toLocaleDateString()}
                    </span>
                </div>
                {isRegistered && vehicle.registration_date && (
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Registered:</span>
                        <span className="text-sm text-gray-700">
                            {new Date(vehicle.registration_date).toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>

            {vehicle.approval_status === 'rejected' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-sm text-red-700">Vehicle registration was rejected. Please contact the admin office.</p>
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#355E3B' }}></div>
                    <p className="mt-4 text-gray-600">Loading vehicles...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Page Header with Tabs */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="mb-4 lg:mb-0">
                            <h2 className="text-3xl font-bold text-white mb-2">Vehicle Management</h2>
                            <p className="text-green-100">Manage your registered vehicles and view access history</p>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Register Vehicle Button */}
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg hover:cursor-pointer"
                                style={{ backgroundColor: '#FFD700', color: '#355E3B' }}
                            >
                                {showForm ? 'Cancel' : '+ Register Vehicle'}
                            </button>

                            {/* Tab Navigation */}
                            <div className="flex space-x-1 bg-green-950 bg-opacity-30 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveTab('vehicles')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'vehicles'
                                        ? 'shadow-lg'
                                        : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                        }`}
                                    style={activeTab === 'vehicles' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                                >
                                    My Vehicles
                                </button>
                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'logs'
                                        ? 'shadow-lg'
                                        : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                        }`}
                                    style={activeTab === 'logs' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                                >
                                    Access Logs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Based on Active Tab */}
                {activeTab === 'vehicles' ? (
                    <div className="space-y-6">
                        {/* Add Vehicle Form */}
                        {showForm && (
                            <div className="mb-8 bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Register New Vehicle</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Fill in the vehicle details</p>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                            >
                                                <option value="">Select Type</option>
                                                <option value="2-wheel">2-wheel (Motorcycle/Scooter)</option>
                                                <option value="4-wheel">4-wheel (Car/SUV)</option>
                                            </select>
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
                                                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                                            />
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
                                                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
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
                                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
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
                                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
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
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowForm(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formLoading}
                                            className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg hover:cursor-pointer disabled:opacity-50"
                                            style={{ backgroundColor: '#355E3B' }}
                                        >
                                            {formLoading ? 'Submitting...' : 'Register Vehicle'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Registered Vehicles */}
                        {registeredVehicles.length > 0 && (
                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Registered Vehicles</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Your approved vehicles with campus access</p>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {registeredVehicles.map((vehicle) => renderVehicleCard(vehicle, true))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pending Registration */}
                        {pendingVehicles.length > 0 && (
                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #d4a574 0%, #b8935f 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Pending Registration</h3>
                                    <p className="text-sm text-yellow-100">Waiting for admin approval</p>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {pendingVehicles.map((vehicle) => renderVehicleCard(vehicle, false))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No Vehicles Message */}
                        {registeredVehicles.length === 0 && pendingVehicles.length === 0 && !showForm && (
                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="text-center py-12">
                                    <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                    <p className="text-gray-500 text-lg mb-2">No vehicles registered</p>
                                    <p className="text-gray-400 text-sm">Click &quot;Register Vehicle&quot; above to register your vehicle for campus access.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Access Logs */
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Vehicle Access Logs</h3>
                            <p className="text-sm" style={{ color: '#FFD700' }}>Track your vehicle entry and exit history</p>
                        </div>

                        <div className="overflow-x-auto">
                            {accessLogs.length > 0 ? (
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
                                                Access Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Location
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {accessLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {new Date(log.timestamp).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(log.timestamp).toLocaleTimeString()}
                                                    </div>
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
                                                    <div className="flex items-center">
                                                        {log.access_type === 'entry' ? (
                                                            <>
                                                                <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                                                                <span className="text-sm text-green-700 font-medium">Entry</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                                                                <span className="text-sm text-blue-700 font-medium">Exit</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {log.location || 'Main Gate'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                        Successful
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-12">
                                    <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-gray-500 text-lg mb-2">No access logs found</p>
                                    <p className="text-gray-400 text-sm">Your vehicle access history will appear here once you start using the system.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}