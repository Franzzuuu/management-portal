'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchableUserSelect from '../../components/SearchableUserSelect';

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
        color: '',
        plateNumber: '',
        registrationDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
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
    };

    const fetchVehicles = async () => {
        try {
            const response = await fetch('/api/vehicles');
            const data = await response.json();
            if (data.success) {
                setVehicles(data.vehicles);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" style={{ color: '#355E3B' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Loading...</span>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">Vehicle Management</h2>
                                <p className="text-gray-200">Manage vehicle registrations and approvals</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="e.g., Vios, Civic, Mio"
                                        value={formData.model}
                                        onChange={handleInputChange}
                                    />
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
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
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    Register Vehicle
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Vehicles List */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">Registered Vehicles</h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Manage vehicle registrations and approvals</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {vehicles.length > 0 ? (
                                    vehicles.map((vehicle) => (
                                        <tr key={vehicle.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{vehicle.owner_name}</div>
                                                    <div className="text-sm text-gray-500">{vehicle.owner_email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{vehicle.make} {vehicle.model}</div>
                                                    <div className="text-sm text-gray-500">{vehicle.vehicle_type} • {vehicle.color}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {vehicle.plate_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.approval_status === 'approved'
                                                    ? 'bg-green-100 text-green-800'
                                                    : vehicle.approval_status === 'rejected'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {vehicle.approval_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                {vehicle.approval_status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproval(vehicle.id, 'approved')}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproval(vehicle.id, 'rejected')}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                            No vehicles registered yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}