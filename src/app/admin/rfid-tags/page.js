'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import SearchableVehicleSelect from '../../components/SearchableVehicleSelect';

export default function RFIDTagManagement() {
    const [user, setUser] = useState(null);
    const [rfidTags, setRfidTags] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    const [formData, setFormData] = useState({
        tagUid: '',
        description: ''
    });
    const [assignData, setAssignData] = useState({
        tagId: '',
        vehicleId: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
                await fetchRFIDTags();
                await fetchVehicles();
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    };

    const fetchRFIDTags = async () => {
        try {
            const response = await fetch('/api/rfid-tags');
            const data = await response.json();
            if (data.success) {
                setRfidTags(data.tags);
            }
        } catch (error) {
            console.error('Failed to fetch RFID tags:', error);
        }
    };

    const fetchVehicles = async () => {
        try {
            const response = await fetch('/api/vehicles');
            const data = await response.json();
            if (data.success) {
                // Only show approved vehicles without tags
                const untaggedVehicles = data.vehicles.filter(v =>
                    v.approval_status === 'approved' && !v.rfid_tag_id
                );
                setVehicles(untaggedVehicles);
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
            const response = await fetch('/api/rfid-tags/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('RFID tag created successfully!');
                setFormData({ tagUid: '', description: '' });
                setShowAddForm(false);
                await fetchRFIDTags();
            } else {
                setError(data.error || 'Failed to create RFID tag');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/rfid-tags/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(assignData),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('RFID tag assigned successfully!');
                setAssignData({ tagId: '', vehicleId: '' });
                setShowAssignForm(false);
                await fetchRFIDTags();
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to assign RFID tag');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const handleUnassign = async (tagId) => {
        if (!confirm('Are you sure you want to unassign this RFID tag?')) return;

        try {
            const response = await fetch('/api/rfid-tags/unassign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tagId }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('RFID tag unassigned successfully!');
                await fetchRFIDTags();
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to unassign RFID tag');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
    };

    const generateRandomUID = () => {
        // Generate a random 12-character hexadecimal UID
        const chars = '0123456789ABCDEF';
        let uid = '';
        for (let i = 0; i < 12; i++) {
            uid += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, tagUid: uid });
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAssignInputChange = (e) => {
        setAssignData({
            ...assignData,
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
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Dashboard" fallbackPath="/admin" />
                </div>

                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">RFID Sticker Management</h2>
                                <p className="text-gray-200">Manage RFID stickers and vehicle assignments</p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg"
                                style={{ backgroundColor: '#FFD700', color: '#355E3B' }}
                            >
                                {showAddForm ? 'Cancel' : '+ Register Sticker'}
                            </button>
                            <button
                                onClick={() => setShowAssignForm(!showAssignForm)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:bg-blue-700"
                            >
                                {showAssignForm ? 'Cancel' : 'Assign Sticker'}
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

                {/* Add RFID Tag Form */}
                {showAddForm && (
                    <div className="mb-8 bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Register RFID Sticker</h3>
                            <p className="text-sm" style={{ color: '#FFD700' }}>Add a physical RFID sticker to the system inventory</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="tagUid" className="block text-sm font-medium text-gray-700 mb-1">
                                        Tag UID *
                                    </label>
                                    <input
                                        type="text"
                                        id="tagUid"
                                        name="tagUid"
                                        required
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="Enter manufacturer UID (e.g., E200001C02701234)"
                                        value={formData.tagUid}
                                        onChange={handleInputChange}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter the unique ID printed on the RFID sticker
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                        Description/Notes
                                    </label>
                                    <input
                                        type="text"
                                        id="description"
                                        name="description"
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="Optional notes (e.g., Batch #, Location found)"
                                        value={formData.description}
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
                                    Register Sticker
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Assign Tag Form */}
                {showAssignForm && (
                    <div className="mb-8 bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl bg-blue-600">
                            <h3 className="text-lg font-semibold text-white">Assign RFID Sticker to Vehicle</h3>
                            <p className="text-sm text-blue-100">Link an RFID sticker to an approved vehicle</p>
                        </div>

                        <form onSubmit={handleAssign} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="tagId" className="block text-sm font-medium text-gray-700 mb-1">
                                        Available RFID Sticker *
                                    </label>
                                    <select
                                        id="tagId"
                                        name="tagId"
                                        required
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        value={assignData.tagId}
                                        onChange={handleAssignInputChange}
                                    >
                                        <option value="">Select RFID sticker</option>
                                        {rfidTags.filter(tag => tag.status === 'unassigned').map((tag) => (
                                            <option key={tag.id} value={tag.id}>
                                                {tag.tag_uid} {tag.description && `- ${tag.description}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle *
                                    </label>
                                    <SearchableVehicleSelect
                                        value={assignData.vehicleId}
                                        onChange={(value) => setAssignData({ ...assignData, vehicleId: value })}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:bg-blue-700"
                                >
                                    Assign Sticker
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* RFID Tags List */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">RFID Stickers Inventory</h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Manage all RFID stickers and vehicle assignments</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sticker UID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Vehicle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rfidTags.length > 0 ? (
                                    rfidTags.map((tag) => (
                                        <tr key={tag.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-2 w-2 rounded-full mr-3" style={{ backgroundColor: tag.status === 'active' ? '#10B981' : tag.status === 'unassigned' ? '#F59E0B' : '#EF4444' }}></div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{tag.tag_uid}</div>
                                                        {tag.description && <div className="text-sm text-gray-500">{tag.description}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tag.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : tag.status === 'unassigned'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {tag.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {tag.vehicle_plate ? `${tag.vehicle_plate} (${tag.vehicle_make} ${tag.vehicle_model})` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {tag.owner_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(tag.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {tag.status === 'active' && (
                                                    <button
                                                        onClick={() => handleUnassign(tag.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Unassign
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                            No RFID stickers registered yet
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