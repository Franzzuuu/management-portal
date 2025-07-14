'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AddNewUser() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        designation: 'Student',
        fullName: '',
        phoneNumber: '',
        gender: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (activeTab === 'manage') {
            fetchUsers();
        }
    }, [activeTab]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users/all');
            const data = await response.json();
            if (data.success) {
                setUsers(data.users || []);
            }
        } catch (err) {
            setError('Failed to fetch users');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            router.push('/login');
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`User ${formData.fullName} created successfully!`);
                setFormData({
                    email: '',
                    password: '',
                    confirmPassword: '',
                    designation: 'Student',
                    fullName: '',
                    phoneNumber: '',
                    gender: ''
                });
                if (activeTab === 'manage') {
                    fetchUsers(); // Refresh user list if on manage tab
                }
            } else {
                setError(data.error || 'Failed to create user');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (userId, newStatus) => {
        setLoading(true);
        try {
            const response = await fetch('/api/users/update-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status: newStatus })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(`User status updated to ${newStatus}`);
                fetchUsers();
                setShowStatusModal(false);
            } else {
                setError(data.error || 'Failed to update status');
            }
        } catch (err) {
            setError('Network error');
        }
        setLoading(false);
    };

    const handleDeleteUser = async (userId) => {
        setLoading(true);
        try {
            const response = await fetch('/api/users/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('User deleted successfully');
                fetchUsers();
                setShowDeleteModal(false);
            } else {
                setError(data.error || 'Failed to delete user');
            }
        } catch (err) {
            setError('Network error');
        }
        setLoading(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
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

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#355E3B' }}></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">User Management</h1>
                                <p className="text-sm text-gray-200">Admin Control Panel</p>
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
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Page Header with Tabs */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">User Management</h2>
                                <p className="text-gray-200">Create and manage user accounts for the system</p>
                            </div>
                        </div>

                        {/* Tab Buttons */}
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    setActiveTab('create');
                                    setError('');
                                    setSuccess('');
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'create'
                                    ? 'text-white'
                                    : 'text-gray-300 hover:text-white'
                                    }`}
                                style={{
                                    backgroundColor: activeTab === 'create' ? '#FFD700' : 'transparent',
                                    color: activeTab === 'create' ? '#355E3B' : undefined
                                }}
                            >
                                Create User
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('manage');
                                    setError('');
                                    setSuccess('');
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'manage'
                                    ? 'text-white'
                                    : 'text-gray-300 hover:text-white'
                                    }`}
                                style={{
                                    backgroundColor: activeTab === 'manage' ? '#FFD700' : 'transparent',
                                    color: activeTab === 'manage' ? '#355E3B' : undefined
                                }}
                            >
                                Manage Users
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content based on active tab */}
                {activeTab === 'create' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>Create New User Account</h3>
                            <p className="text-sm text-gray-600 mt-1">Fill in the details below to create a new user account</p>
                        </div>

                        <div className="p-6">
                            {/* Existing form fields - keeping the same structure */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        name="fullName"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="Enter full name"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="Enter email address"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="Enter phone number"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
                                        Designation *
                                    </label>
                                    <select
                                        id="designation"
                                        name="designation"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-400"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        value={formData.designation}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Student">Student</option>
                                        <option value="Faculty">Faculty</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                                Password *
                                            </label>
                                            <input
                                                type="password"
                                                id="password"
                                                name="password"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                                                style={{ '--tw-ring-color': '#355E3B' }}
                                                placeholder="Enter password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Password must be at least 8 characters with uppercase, lowercase, number, and special character
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                                Confirm Password *
                                            </label>
                                            <input
                                                type="password"
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                                                style={{ '--tw-ring-color': '#355E3B' }}
                                                placeholder="Confirm password"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-600">{success}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => router.push('/admin')}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    {loading ? 'Creating User...' : 'Create User'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'manage' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>Manage Existing Users</h3>
                            <p className="text-sm text-gray-600 mt-1">View, update status, and manage user accounts ({users.length} users)</p>
                        </div>

                        {/* Error/Success Messages for Manage Tab */}
                        {error && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-600">{success}</p>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((userData) => (
                                        <tr key={userData.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{userData.full_name}</div>
                                                    <div className="text-sm text-gray-500">{userData.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDesignationColor(userData.designation)}`}>
                                                    {userData.designation}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(userData.status)}`}>
                                                    {userData.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {userData.phone_number || 'No phone'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(userData);
                                                            setShowStatusModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                                                    >
                                                        Update Status
                                                    </button>
                                                    {userData.designation !== 'Admin' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(userData);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            className="text-red-600 hover:text-red-900 px-3 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Status Update Modal */}
            {showStatusModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: '#355E3B' }}>
                            Update User Status
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Change status for <strong>{selectedUser.full_name}</strong>
                        </p>
                        <div className="flex space-x-3 mb-3">
                            <button
                                onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                                disabled={loading}
                                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                Activate
                            </button>
                            <button
                                onClick={() => handleUpdateStatus(selectedUser.id, 'inactive')}
                                disabled={loading}
                                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                Deactivate
                            </button>
                        </div>
                        <button
                            onClick={() => setShowStatusModal(false)}
                            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center mb-4">
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-red-600">Delete User</h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{selectedUser.full_name}</strong>?
                            This action cannot be undone and will also delete all associated vehicles and data.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleDeleteUser(selectedUser.id)}
                                disabled={loading}
                                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                {loading ? 'Deleting...' : 'Delete User'}
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}