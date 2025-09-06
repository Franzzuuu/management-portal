'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CarolinianVehicles() {
    const [user, setUser] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [activeTab, setActiveTab] = useState('vehicles');
    const [loading, setLoading] = useState(true);
    const [accessLogs, setAccessLogs] = useState([]);
    const router = useRouter();

    useEffect(() => {
        fetchUserData();
        fetchVehicles();
        if (activeTab === 'logs') {
            fetchAccessLogs();
        }
    }, [activeTab]);

    const fetchUserData = async () => {
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const sessionData = await response.json();
                setUser(sessionData.user);
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            router.push('/login');
        }
    };

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/carolinian/vehicles');
            if (response.ok) {
                const data = await response.json();
                setVehicles(data.vehicles || []);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccessLogs = async () => {
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
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
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
            {/* Header */}
            <header className="shadow-lg" style={{ backgroundColor: '#355E3B' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center py-4 px-6">
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">My Vehicles</h1>
                                <div className="flex items-center space-x-2 text-sm" style={{ color: '#FFD700' }}>
                                    <span>Dashboard</span>
                                    <span>›</span>
                                    <span>Vehicles</span>
                                    {activeTab !== 'vehicles' && (
                                        <>
                                            <span>›</span>
                                            <span className="capitalize">{activeTab === 'logs' ? 'Access Logs' : activeTab}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/carolinian')}
                                className="text-white hover:text-yellow-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:cursor-pointer"
                            >
                                ← Back to Dashboard
                            </button>
                            <div className="text-right">
                                <div className="text-white font-medium">
                                    {user?.full_name || user?.username}
                                </div>
                                <div className="flex items-center justify-end mt-1">
                                    <span className="px-2 py-1 text-xs font-medium rounded-md" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                        {user?.designation}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md hover:shadow-lg hover:cursor-pointer"
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
                            <h2 className="text-3xl font-bold text-white mb-2">Vehicle Management</h2>
                            <p className="text-green-100">Manage your registered vehicles and view access history</p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-white bg-opacity-10 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('vehicles')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'vehicles'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'vehicles' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                My Vehicles
                            </button>
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'logs'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'logs' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Access Logs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Based on Active Tab */}
                {activeTab === 'vehicles' ? (
                    /* Vehicles List */
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Registered Vehicles</h3>
                            <p className="text-sm" style={{ color: '#FFD700' }}>View your vehicle registration details and RFID status</p>
                        </div>

                        <div className="p-6">
                            {vehicles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {vehicles.map((vehicle) => (
                                        <div key={vehicle.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
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
                                                    {getStatusIcon(vehicle.registration_status)}
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
                                                    <span className="text-sm text-gray-500">Registration:</span>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(vehicle.registration_status)}`}>
                                                        {vehicle.registration_status}
                                                    </span>
                                                </div>
                                                {vehicle.rfid_tag_uid && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-500">RFID Tag:</span>
                                                        <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                                            {vehicle.rfid_tag_uid.slice(-8)}...
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Registered:</span>
                                                    <span className="text-sm text-gray-700">
                                                        {new Date(vehicle.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {vehicle.registration_status === 'rejected' && (
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
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                    <p className="text-gray-500 text-lg mb-2">No vehicles registered</p>
                                    <p className="text-gray-400 text-sm">Contact the admin office to register your vehicle for campus access.</p>
                                </div>
                            )}
                        </div>
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