'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import useSocketChannel from '@/hooks/useSocketChannel';

export default function CarolinianVehicles() {
    const [user, setUser] = useState(null);
    const [registeredVehicles, setRegisteredVehicles] = useState([]);
    const [pendingVehicles, setPendingVehicles] = useState([]);
    const [rejectedVehicles, setRejectedVehicles] = useState([]);
    const [activeTab, setActiveTab] = useState('vehicles');
    const [loading, setLoading] = useState(true);
    const [accessLogs, setAccessLogs] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [acknowledging, setAcknowledging] = useState(null);
    const [formData, setFormData] = useState({
        vehicleType: '',
        make: '',
        model: '',
        year: '',
        color: '',
        plateNumber: ''
    });
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [renewalLoading, setRenewalLoading] = useState(false);
    const [selectedRenewalVehicle, setSelectedRenewalVehicle] = useState(null);
    const router = useRouter();

    // Form state helpers
    const isFormDirty = Object.values(formData).some(v => !!v);
    const hasPendingVehicleOrSticker = (pendingVehicles.length > 0) ||
        registeredVehicles.some(v => v.sticker_status === 'pending');

    const shouldSubscribeVehicles = Boolean(user && hasPendingVehicleOrSticker && !showForm && !isFormDirty);

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
            setLoading(true);
            const response = await fetch('/api/vehicles?mine=1');
            if (response.ok) {
                const data = await response.json();
                setRegisteredVehicles(data.registered || []);
                setPendingVehicles(data.pending || []);
                setRejectedVehicles(data.rejected || []);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAcknowledgeRejection = async (vehicleId) => {
        setAcknowledging(vehicleId);
        try {
            const response = await fetch('/api/vehicles/acknowledge-rejection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId })
            });

            const data = await response.json();

            if (data.success) {
                // Remove the vehicle from the rejected list
                setRejectedVehicles(prev => prev.filter(v => v.vehicle_id !== vehicleId));
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to acknowledge rejection' });
            }
        } catch (error) {
            console.error('Error acknowledging rejection:', error);
            setMessage({ type: 'error', text: 'Failed to acknowledge rejection. Please try again.' });
        } finally {
            setAcknowledging(null);
        }
    };

    const fetchAccessLogs = useCallback(async () => {
        try {
            setLoading(true);
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
    }, []);

    // Auto-clear message after 3 seconds
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message.text]);





    useEffect(() => {
        fetchUserData();
        fetchVehicles();
        if (activeTab === 'logs') {
            fetchAccessLogs();
        }
    }, [activeTab, fetchVehicles, fetchAccessLogs]); // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time vehicle updates for this user (gated by form state)
    const { connected } = useSocketChannel('vehicles', {
        // Handle vehicle approval/status changes
        pending_update: (payload) => {
            if (!shouldSubscribeVehicles) return; // ignore when not subscribed
            console.log('Vehicles page received vehicles:pending_update:', payload);
            if (payload.owner_id === user?.uscId) {
                // avoid full fetch if user is filling form
                if (showForm || isFormDirty) {
                    // update only minimal state to avoid losing form progress
                    setPendingVehicles(prev => {
                        return prev.map(p => p.vehicle_id === payload.vehicle_id ? { ...p, ...payload } : p);
                    });
                    return;
                }
                console.log('Vehicle update for current user - refreshing data');
                fetchVehicles(); // safe to refresh when not editing
            }
        },

        // Handle RFID/sticker assignments
        rfid_update: (payload) => {
            if (!shouldSubscribeVehicles) return;
            console.log('Vehicles page received vehicles:rfid_update:', payload);
            if (payload.owner_id === user?.uscId) {
                console.log('RFID update for current user - updating vehicle sticker status');
                // update only sticker fields to avoid full page re-render
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
        autoSubscribe: shouldSubscribeVehicles,
        enablePollingFallback: shouldSubscribeVehicles,
        pollFn: () => {
            if (!shouldSubscribeVehicles) return;
            console.log('Vehicles page polling fallback');
            fetchVehicles();
        },
        // reduce motion and frequency
        pollIntervalMs: shouldSubscribeVehicles ? 20000 : 0
    });

    // Subscribe to access logs when viewing the logs tab (gated by form state)
    const accessLogsAuto = activeTab === 'logs' && !showForm && !isFormDirty;
    const { connected: accessLogsConnected } = useSocketChannel('access_logs', {
        update: (record) => {
            if (accessLogsAuto && record.user_id === user?.uscId) {
                fetchAccessLogs();
            }
        }
    }, {
        autoSubscribe: accessLogsAuto,
        enablePollingFallback: false
    });

    // Debug: Log when user changes
    useEffect(() => {
        if (user) {
            console.log('User loaded in vehicles page:', user);
            console.log('User uscId:', user.uscId);
        }
    }, [user]);

    // Add auto-refresh when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchVehicles();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchVehicles]);

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
                // Refresh vehicle list
                fetchVehicles();
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

    const handleRenewalRequest = async () => {
        if (!selectedRenewalVehicle) return;
        
        setRenewalLoading(true);
        try {
            const response = await fetch('/api/carolinian/request-renewal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId: selectedRenewalVehicle.vehicle_id })
            });

            const result = await response.json();

            if (result.success) {
                setMessage({ type: 'success', text: 'Renewal request submitted successfully! Admin will review your request.' });
                setShowRenewalModal(false);
                setSelectedRenewalVehicle(null);
                await fetchVehicles();
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to submit renewal request' });
            }
        } catch (error) {
            console.error('Error submitting renewal request:', error);
            setMessage({ type: 'error', text: 'Failed to submit renewal request. Please try again.' });
        } finally {
            setRenewalLoading(false);
        }
    };

    // Get vehicles eligible for renewal (expired status only)
    const expiredVehicles = registeredVehicles.filter(v => v.sticker_status === 'expired');

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
            case 'renewal_requested': return 'bg-blue-100 text-blue-800';
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
                {isRegistered && vehicle.sticker_rejection_reason && vehicle.sticker_status === 'expired' && (
                    <div className="col-span-full mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700">
                            <span className="font-medium">Renewal Rejected:</span> {vehicle.sticker_rejection_reason}
                        </p>
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
        return <LoadingSpinner message="Loading vehicles" />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Toast Message */}
            {message.text && (
                <div className="fixed top-4 right-4 z-50">
                    <div className={`px-6 py-3 rounded-lg shadow-lg border-l-4 max-w-sm transform transition-all duration-300 ${
                        message.type === 'success' 
                            ? 'bg-green-50 border-green-400 text-green-700' 
                            : 'bg-red-50 border-red-400 text-red-700'
                    }`}>
                        <div className="flex items-center">
                            {message.type === 'success' ? (
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            )}
                            <span className="font-medium">{message.text}</span>
                            <button
                                onClick={() => setMessage({ type: '', text: '' })}
                                className="ml-3 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <div className="mb-6">
                    <BackButton text="Back to Dashboard" fallbackPath="/carolinian" />
                </div>


                {/* Page Header with Tabs */}
                <div className="mb-8 p-4 sm:p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col space-y-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Vehicle Management</h2>
                            <p className="text-sm sm:text-base text-green-100">Manage your registered vehicles and view access history</p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                {/* Register Vehicle Button */}
                                <button
                                    onClick={() => setShowForm(!showForm)}
                                    className="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg hover:cursor-pointer"
                                    style={{ backgroundColor: '#FFD700', color: '#355E3B' }}
                                >
                                    {showForm ? 'Cancel' : '+ Register Vehicle'}
                                </button>

                                {/* Apply for Renewal Button */}
                                {expiredVehicles.length > 0 && (
                                    <button
                                        onClick={() => setShowRenewalModal(true)}
                                        className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Apply for Renewal ({expiredVehicles.length})
                                    </button>
                                )}
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex space-x-2 bg-green-950 bg-opacity-30 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveTab('vehicles')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 hover:cursor-pointer whitespace-nowrap ${activeTab === 'vehicles'
                                        ? 'shadow-lg'
                                        : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                        }`}
                                    style={activeTab === 'vehicles' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                                >
                                    My Vehicles
                                </button>
                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 hover:cursor-pointer whitespace-nowrap ${activeTab === 'logs'
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

                        {/* Rejected Vehicles */}
                        {rejectedVehicles.length > 0 && (
                            <div className="bg-white rounded-xl shadow-lg">
                                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)' }}>
                                    <h3 className="text-lg font-semibold text-white">Rejected Vehicles</h3>
                                    <p className="text-sm text-red-100">Please acknowledge to remove from list</p>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {rejectedVehicles.map((vehicle) => (
                                            <div key={vehicle.vehicle_id} className="border-2 border-red-200 rounded-xl p-6 bg-red-50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center">
                                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-red-600">
                                                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3">
                                                            <h4 className="text-lg font-semibold text-gray-900">{vehicle.plate_number}</h4>
                                                            <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                                                        </div>
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
                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800">
                                                            Rejected
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Rejection Reason */}
                                                <div className="mt-4 p-3 bg-white border border-red-200 rounded-lg">
                                                    <div className="flex items-start">
                                                        <svg className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                        <div>
                                                            <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                                            <p className="text-sm text-red-700 mt-1">
                                                                {vehicle.rejection_reason || 'No reason provided. Please contact the admin office for more information.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Acknowledge Button */}
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => handleAcknowledgeRejection(vehicle.vehicle_id)}
                                                        disabled={acknowledging === vehicle.vehicle_id}
                                                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {acknowledging === vehicle.vehicle_id ? (
                                                            <span className="flex items-center justify-center">
                                                                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Processing...
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center justify-center">
                                                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                Acknowledge &amp; Remove
                                                            </span>
                                                        )}
                                                    </button>
                                                    <p className="text-xs text-gray-500 text-center mt-2">
                                                        This will permanently remove this rejected vehicle from your list.
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No Vehicles Message */}
                        {registeredVehicles.length === 0 && pendingVehicles.length === 0 && rejectedVehicles.length === 0 && !showForm && (
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
                        <div 
                            className="px-4 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl flex items-center justify-between"
                            style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}
                        >
                            <div className="min-w-0 flex-1 mr-3">
                                <h3 className="text-base sm:text-lg font-semibold text-white truncate">Vehicle Access Logs</h3>
                                <p className="text-xs sm:text-sm" style={{ color: '#FFD700' }}>Track your vehicle entry and exit history</p>
                            </div>
                            
                            {/* Download button */}
                            <button
                                onClick={() => router.push('/carolinian/vehicles/download')}
                                className="flex-shrink-0 text-white hover:text-yellow-300 transition-colors duration-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-10 hover:cursor-pointer"
                                title="Download Access Logs"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            {accessLogs.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vehicle
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                                Location
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {accessLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                                                        {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                                                        {log.plate_number}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">
                                                        {log.vehicle_make} {log.vehicle_model}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {log.access_type === 'entry' ? (
                                                            <>
                                                                <div className="h-2 w-2 bg-green-500 rounded-full mr-1 sm:mr-2"></div>
                                                                <span className="text-xs sm:text-sm text-green-700 font-medium">Entry</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="h-2 w-2 bg-blue-500 rounded-full mr-1 sm:mr-2"></div>
                                                                <span className="text-xs sm:text-sm text-blue-700 font-medium">Exit</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                                                    <div className="text-xs sm:text-sm text-gray-900">
                                                        {log.gate_location || 'Main Gate'}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
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

            {/* Renewal Request Modal */}
            {showRenewalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto p-4">
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Apply for Sticker Renewal</h3>
                                        <p className="text-sm" style={{ color: '#FFD700' }}>Select a vehicle to renew</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowRenewalModal(false);
                                        setSelectedRenewalVehicle(null);
                                    }}
                                    className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors duration-200 hover:cursor-pointer"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Vehicle Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Select Vehicle with Expired Sticker
                                </label>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {expiredVehicles.map((vehicle) => (
                                        <div
                                            key={vehicle.vehicle_id}
                                            onClick={() => setSelectedRenewalVehicle(vehicle)}
                                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                                selectedRenewalVehicle?.vehicle_id === vehicle.vehicle_id
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{vehicle.make} {vehicle.model}</p>
                                                    <p className="text-sm text-gray-500">{vehicle.plate_number}</p>
                                                </div>
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                                    Expired
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                    <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-blue-700">
                                        Your renewal request will be reviewed by an administrator. You will be notified once your request is processed.
                                    </p>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowRenewalModal(false);
                                        setSelectedRenewalVehicle(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                    disabled={renewalLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRenewalRequest}
                                    disabled={!selectedRenewalVehicle || renewalLoading}
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    {renewalLoading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting...
                                        </span>
                                    ) : (
                                        'Submit Renewal Request'
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