'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import SearchableVehicleSelect from '../../components/SearchableVehicleSelect';

export default function RFIDTagManagement() {
    const [user, setUser] = useState(null);
    const [rfidTags, setRfidTags] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    const [formData, setFormData] = useState({
        tagUid: '',
        description: ''
    });
    const [assignData, setAssignData] = useState({
        tagId: '',
        vehicleId: ''
    });
    const [activeAssignTagId, setActiveAssignTagId] = useState(null);
    const [unassignedSearchFilter, setUnassignedSearchFilter] = useState('');
    const [unassignedCurrentPage, setUnassignedCurrentPage] = useState(1);
    const [assignedCurrentPage, setAssignedCurrentPage] = useState(1);
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [submitting, setSubmitting] = useState(false);
    const [assigning, setAssigning] = useState(false);
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
        setSubmitting(true);

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
                setSuccess('RFID sticker registered successfully!');
                setFormData({ tagUid: '', description: '' });
                setShowAddForm(false);
                await fetchRFIDTags();
            } else {
                setError(data.error || 'Failed to register RFID sticker');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
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

    const handleQuickAssign = (tagId) => {
        setActiveAssignTagId(tagId);
        setAssignData({ tagId: '', vehicleId: '' }); // Reset vehicle selection
    };

    const handleCancelAssign = () => {
        setActiveAssignTagId(null);
        setAssignData({ tagId: '', vehicleId: '' });
    };

    const handleQuickAssignSubmit = async (tagId, vehicleId) => {
        if (!vehicleId) {
            setError('Please select a vehicle');
            return;
        }

        setAssigning(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/rfid-tags/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    tagId: tagId.toString(), 
                    vehicleId 
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('RFID sticker assigned successfully!');
                setActiveAssignTagId(null);
                setAssignData({ tagId: '', vehicleId: '' });
                await fetchRFIDTags();
                await fetchVehicles();
            } else {
                setError(data.error || 'Failed to assign RFID sticker');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setAssigning(false);
        }
    };

    const getFilteredTags = () => {
        return rfidTags.filter(tag => {
            const matchesSearch = !searchFilter || 
                tag.tag_uid.toLowerCase().includes(searchFilter.toLowerCase()) ||
                (tag.vehicle_plate && tag.vehicle_plate.toLowerCase().includes(searchFilter.toLowerCase())) ||
                (tag.owner_name && tag.owner_name.toLowerCase().includes(searchFilter.toLowerCase()));
            
            const matchesStatus = statusFilter === 'all' || tag.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    };

    const getUnassignedTags = () => {
        return rfidTags
            .filter(tag => {
                const isUnassigned = tag.status === 'unassigned';
                const matchesSearch = !unassignedSearchFilter || 
                    tag.tag_uid.toLowerCase().includes(unassignedSearchFilter.toLowerCase());
                return isUnassigned && matchesSearch;
            })
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    };

    const getPaginatedUnassignedTags = () => {
        const allTags = getUnassignedTags();
        const itemsPerPage = 10;
        const startIndex = (unassignedCurrentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return allTags.slice(startIndex, endIndex);
    };

    const getTotalUnassignedPages = () => {
        const itemsPerPage = 10;
        return Math.ceil(getUnassignedTags().length / itemsPerPage);
    };

    const getAssignedTags = () => {
        return getFilteredTags()
            .filter(tag => tag.status === 'active' || tag.status === 'inactive')
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    };

    const getPaginatedAssignedTags = () => {
        const allTags = getAssignedTags();
        const itemsPerPage = 10;
        const startIndex = (assignedCurrentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return allTags.slice(startIndex, endIndex);
    };

    const getTotalAssignedPages = () => {
        const itemsPerPage = 10;
        return Math.ceil(getAssignedTags().length / itemsPerPage);
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

    const dismissAlert = (type) => {
        if (type === 'error') setError('');
        if (type === 'success') setSuccess('');
    };

    if (loading) {
        return <LoadingSpinner message="Loading RFID tags" />;
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
                <div className="mb-8 p-8 rounded-xl shadow-sm border border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <div className="ml-6">
                                <h2 className="text-3xl font-bold text-gray-900">RFID Sticker Management</h2>
                                <p className="text-gray-600 mt-1">Register stickers and assign them to approved vehicles</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                                showAddForm 
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                                    : 'text-white hover:shadow-lg'
                            }`}
                            style={!showAddForm ? { backgroundColor: '#355E3B' } : {}}
                        >
                            {showAddForm ? 'Cancel' : '+ Register Sticker'}
                        </button>
                    </div>
                </div>

                {/* Success/Error Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                            <button
                                onClick={() => dismissAlert('error')}
                                className="text-red-600 hover:text-red-800 transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm font-medium text-green-800">{success}</p>
                            </div>
                            <button
                                onClick={() => dismissAlert('success')}
                                className="text-green-600 hover:text-green-800 transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Add RFID Tag Form */}
                {showAddForm && (
                    <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#355E3B' }}>
                            <h3 className="text-lg font-semibold text-white">Register RFID Sticker</h3>
                            <p className="text-sm text-green-100 mt-1">Add a physical RFID sticker to the system inventory</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="tagUid" className="block text-sm font-medium text-gray-700 mb-2">
                                        Sticker UID *
                                    </label>
                                    <input
                                        type="text"
                                        id="tagUid"
                                        name="tagUid"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                        placeholder="Enter manufacturer UID (e.g., E200001C02701234)"
                                        value={formData.tagUid}
                                        onChange={handleInputChange}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter the unique ID printed on the RFID sticker
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                        Description/Notes
                                    </label>
                                    <input
                                        type="text"
                                        id="description"
                                        name="description"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                        placeholder="Optional notes (e.g., Batch #)"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Registering...
                                        </>
                                    ) : (
                                        'Register Sticker'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* RFID Tags List */}
                <div className="space-y-6">
                    {/* Unassigned Tags Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-yellow-600">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <svg className="h-6 w-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Unassigned Stickers</h3>
                                        <p className="text-sm text-yellow-100 mt-0.5">RFID stickers ready to be assigned (FIFO order)</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">{getUnassignedTags().length}</div>
                                        <div className="text-xs text-yellow-100">Available</div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by Sticker UID..."
                                    value={unassignedSearchFilter}
                                    onChange={(e) => setUnassignedSearchFilter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-yellow-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-transparent bg-white text-gray-900 placeholder:text-gray-500"
                                />
                                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-yellow-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Queue #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sticker UID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Added Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {getPaginatedUnassignedTags().length > 0 ? (
                                        getPaginatedUnassignedTags().map((tag, index) => {
                                            const globalIndex = (unassignedCurrentPage - 1) * 10 + index;
                                            return (
                                            <tr 
                                                key={tag.id} 
                                                className={`hover:bg-yellow-50 transition-colors ${globalIndex === 0 ? 'bg-yellow-50/50' : ''}`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {globalIndex === 0 ? (
                                                            <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                                                                NEXT
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">
                                                                #{globalIndex + 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-3 w-3 rounded-full bg-yellow-500 mr-3 animate-pulse"></div>
                                                        <div>
                                                            <div className="text-sm font-mono font-semibold text-gray-900">{tag.tag_uid}</div>
                                                            {tag.description && (
                                                                <div className="text-xs text-gray-500 mt-0.5">{tag.description}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div>{new Date(tag.created_at).toLocaleDateString()}</div>
                                                    <div className="text-xs text-gray-400">{new Date(tag.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    {activeAssignTagId === tag.id ? (
                                                        <div className="flex items-center gap-2 min-w-[400px]">
                                                            <div className="flex-1">
                                                                <SearchableVehicleSelect
                                                                    value={assignData.vehicleId}
                                                                    onChange={(value) => setAssignData({ ...assignData, vehicleId: value })}
                                                                    className="w-full"
                                                                    placeholder="Search vehicle..."
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => handleQuickAssignSubmit(tag.id, assignData.vehicleId)}
                                                                disabled={assigning || !assignData.vehicleId}
                                                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center whitespace-nowrap"
                                                                title="Confirm Assignment"
                                                            >
                                                                {assigning ? (
                                                                    <>
                                                                        <svg className="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        <span className="text-xs">Assigning...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                        <span className="text-xs">Confirm</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={handleCancelAssign}
                                                                disabled={assigning}
                                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Cancel"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleQuickAssign(tag.id)}
                                                            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-200 hover:shadow-md"
                                                        >
                                                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Assign
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center">
                                                <div className="text-gray-500">
                                                    <svg className="mx-auto h-12 w-12 text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                    <p className="text-lg font-medium text-gray-900 mb-2">No unassigned stickers in queue</p>
                                                    <p className="text-gray-500">Register new RFID stickers to add them to the queue</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {getTotalUnassignedPages() > 1 && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-gray-700">
                                        Showing <span className="font-semibold text-gray-900">{(unassignedCurrentPage - 1) * 10 + 1}</span> to{' '}
                                        <span className="font-semibold text-gray-900">
                                            {Math.min(unassignedCurrentPage * 10, getUnassignedTags().length)}
                                        </span>{' '}
                                        of <span className="font-semibold text-gray-900">{getUnassignedTags().length}</span> stickers
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setUnassignedCurrentPage(1)}
                                            disabled={unassignedCurrentPage === 1}
                                            className="p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="First page"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setUnassignedCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={unassignedCurrentPage === 1}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {getPageNumbers(unassignedCurrentPage, getTotalUnassignedPages()).map((pageNum, idx) => (
                                                pageNum === '...' ? (
                                                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
                                                ) : (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setUnassignedCurrentPage(pageNum)}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                            pageNum === unassignedCurrentPage
                                                                ? 'bg-yellow-600 text-white shadow-sm'
                                                                : 'text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setUnassignedCurrentPage(prev => Math.min(getTotalUnassignedPages(), prev + 1))}
                                            disabled={unassignedCurrentPage === getTotalUnassignedPages()}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next
                                        </button>
                                        <button
                                            onClick={() => setUnassignedCurrentPage(getTotalUnassignedPages())}
                                            disabled={unassignedCurrentPage === getTotalUnassignedPages()}
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

                    {/* Assigned Tags Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <svg className="h-6 w-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Assigned Stickers</h3>
                                        <p className="text-sm text-green-100 mt-0.5">RFID stickers linked to vehicles</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-6">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">
                                            {getAssignedTags().filter(t => t.status === 'active').length}
                                        </div>
                                        <div className="text-xs text-green-100">Active</div>
                                    </div>
                                    {getAssignedTags().filter(t => t.status === 'inactive').length > 0 && (
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-red-200">
                                                {getAssignedTags().filter(t => t.status === 'inactive').length}
                                            </div>
                                            <div className="text-xs text-red-100">Inactive</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="relative max-w-md">
                                <input
                                    type="text"
                                    placeholder="Search by UID, plate, or owner..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sticker UID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {getPaginatedAssignedTags().length > 0 ? (
                                        getPaginatedAssignedTags().map((tag) => (
                                            <tr key={tag.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div 
                                                            className="h-3 w-3 rounded-full mr-3" 
                                                            style={{ 
                                                                backgroundColor: tag.status === 'active' ? '#10B981' : '#EF4444' 
                                                            }}
                                                        ></div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 font-mono">{tag.tag_uid}</div>
                                                            {tag.description && <div className="text-xs text-gray-500 mt-0.5">{tag.description}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                                                        tag.status === 'active'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {tag.status.charAt(0).toUpperCase() + tag.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {tag.vehicle_plate ? (
                                                        <div>
                                                            <div className="font-medium">{tag.vehicle_plate}</div>
                                                            <div className="text-gray-500 text-xs">{tag.vehicle_make} {tag.vehicle_model}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No vehicle data</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {tag.owner_name || <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div>{new Date(tag.assigned_date || tag.created_at).toLocaleDateString()}</div>
                                                    <div className="text-xs text-gray-400">{new Date(tag.assigned_date || tag.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {tag.status === 'active' && (
                                                        <button
                                                            onClick={() => handleUnassign(tag.id)}
                                                            className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-all duration-200"
                                                        >
                                                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            Unassign
                                                        </button>
                                                    )}
                                                    {tag.status === 'inactive' && (
                                                        <span className="text-gray-400 italic text-xs">Inactive</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center">
                                                <div className="text-gray-500">
                                                    {statusFilter === 'all' ? (
                                                        <div>
                                                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                            </svg>
                                                            <p className="text-lg font-medium text-gray-900 mb-2">No assigned stickers yet</p>
                                                            <p className="text-gray-500">Assign RFID stickers from the queue above</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                            <p className="text-lg font-medium text-gray-900 mb-2">No stickers match your search</p>
                                                            <p className="text-gray-500">Try adjusting your search terms or filters</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {getTotalAssignedPages() > 1 && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-gray-700">
                                        Showing <span className="font-semibold text-gray-900">{(assignedCurrentPage - 1) * 10 + 1}</span> to{' '}
                                        <span className="font-semibold text-gray-900">
                                            {Math.min(assignedCurrentPage * 10, getAssignedTags().length)}
                                        </span>{' '}
                                        of <span className="font-semibold text-gray-900">{getAssignedTags().length}</span> stickers
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setAssignedCurrentPage(1)}
                                            disabled={assignedCurrentPage === 1}
                                            className="p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="First page"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setAssignedCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={assignedCurrentPage === 1}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {getPageNumbers(assignedCurrentPage, getTotalAssignedPages()).map((pageNum, idx) => (
                                                pageNum === '...' ? (
                                                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
                                                ) : (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setAssignedCurrentPage(pageNum)}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                            pageNum === assignedCurrentPage
                                                                ? 'bg-green-600 text-white shadow-sm'
                                                                : 'text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setAssignedCurrentPage(prev => Math.min(getTotalAssignedPages(), prev + 1))}
                                            disabled={assignedCurrentPage === getTotalAssignedPages()}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next
                                        </button>
                                        <button
                                            onClick={() => setAssignedCurrentPage(getTotalAssignedPages())}
                                            disabled={assignedCurrentPage === getTotalAssignedPages()}
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
                </div>
            </main>
        </div>
    );
}