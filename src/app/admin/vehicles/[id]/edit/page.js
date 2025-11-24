'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SearchableUserSelect from '../../../../components/SearchableUserSelect';
import Header from '../../../../components/Header';
import BackButton from '../../../../components/BackButton';

export default function EditVehicle({ params }) {
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        vehicleType: '',
        make: '',
        model: '',
        year: '',
        color: '',
        plateNumber: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const fetchVehicleDetails = useCallback(async () => {
        try {
            const response = await fetch(`/api/vehicles/${id}`);
            const data = await response.json();
            if (data.success) {
                setVehicle(data.vehicle);
                setFormData({
                    vehicleType: data.vehicle.vehicle_type || '',
                    make: data.vehicle.make || '',
                    model: data.vehicle.model || '',
                    year: data.vehicle.year || '',
                    color: data.vehicle.color || '',
                    plateNumber: data.vehicle.plate_number || '',
                    userId: data.vehicle.user_id || '',
                });
            } else {
                setError('Failed to fetch vehicle details');
            }
        } catch (error) {
            console.error('Failed to fetch vehicle details:', error);
            setError('Network error while fetching vehicle details');
        }
    }, [id, setVehicle, setFormData, setError]);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
                await fetchVehicleDetails();
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    }, [fetchVehicleDetails, router, setUser, setLoading]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        // Client-side validation for year if provided
        if (formData.year) {
            const yearValue = parseInt(formData.year, 10);
            const currentYear = new Date().getFullYear();

            if (isNaN(yearValue) || yearValue < 1900 || yearValue > currentYear + 1) {
                setError(`Invalid year. Must be a 4-digit year between 1900 and ${currentYear + 1}`);
                setSaving(false);
                return;
            }
        }

        try {
            const response = await fetch('/api/vehicles/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vehicleId: id,
                    vehicleType: formData.vehicleType,
                    make: formData.make,
                    model: formData.model,
                    year: formData.year ? parseInt(formData.year, 10) : formData.year,
                    color: formData.color,
                    plateNumber: formData.plateNumber,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Vehicle updated successfully!');
                await fetchVehicleDetails(); // Refresh data after update
            } else {
                setError(data.error || 'Failed to update vehicle');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [formData, id, setError, setSuccess, setSaving, fetchVehicleDetails]);

    const handleInputChange = useCallback((e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, [router]);

    const handleDeleteConfirm = useCallback(async () => {
        setDeleting(true);
        setError('');

        try {
            const response = await fetch(`/api/vehicles/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Vehicle deleted successfully');
                // Redirect after a short delay to show the success message
                setTimeout(() => {
                    router.push('/admin/vehicles');
                }, 1500);
            } else {
                setError(data.error || 'Failed to delete vehicle');
                setShowDeleteModal(false);
            }
        } catch (error) {
            setError('Network error while deleting vehicle');
            setShowDeleteModal(false);
        } finally {
            setDeleting(false);
        }
    }, [id, router]);

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
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Vehicles" fallbackPath="/admin/vehicles" />
                </div>

                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">Edit Vehicle</h2>
                                <p className="text-gray-200">
                                    {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.plate_number})` : 'Loading vehicle details...'}
                                </p>
                            </div>
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

                {/* Edit Vehicle Form */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">Vehicle Details</h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Update vehicle information</p>
                    </div>

                    {vehicle ? (
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="mb-6">
                                <h4 className="text-md font-medium text-gray-700 mb-2">Owner Information</h4>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-sm font-medium text-gray-900">{vehicle.owner_name}</div>
                                    <div className="text-sm text-gray-500">{vehicle.owner_email}</div>
                                    {vehicle.owner_designation && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {vehicle.owner_designation} • {vehicle.owner_department || 'N/A'}
                                        </div>
                                    )}
                                </div>
                            </div>

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
                                        onChange={handleInputChange}
                                    >
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
                                        onChange={handleInputChange}
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
                                        Model Year
                                    </label>
                                    <input
                                        type="number"
                                        id="year"
                                        name="year"
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
                            </div>

                            <div className="mt-6 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={deleting}
                                    className={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${deleting ? 'opacity-70 bg-red-400' : 'bg-red-600 hover:bg-red-700 hover:shadow-lg hover:cursor-pointer'}`}
                                >
                                    {deleting ? 'Deleting...' : 'Delete Vehicle'}
                                </button>

                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/admin/vehicles')}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${saving ? 'opacity-70' : 'hover:shadow-lg hover:cursor-pointer'}`}
                                        style={{ backgroundColor: '#355E3B' }}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            Loading vehicle details...
                        </div>
                    )}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 mx-4 animate-fade-in-up">
                        <div className="flex items-center justify-center mb-4 text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                            Confirm Deletion
                        </h3>
                        <p className="text-center text-gray-700 mb-6">
                            Are you sure you want to delete this vehicle?<br />
                            <span className="font-medium">
                                {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.plate_number})` : ''}
                            </span>
                            <br />
                            <span className="text-sm text-red-600">
                                This action cannot be undone.
                            </span>
                        </p>
                        <div className="flex justify-center space-x-4">
                            <button
                                type="button"
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 hover:cursor-pointer"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={`px-4 py-2 bg-red-600 rounded-lg text-white font-medium transition-colors duration-200 ${deleting ? 'opacity-70' : 'hover:bg-red-700 hover:shadow-lg hover:cursor-pointer'}`}
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}