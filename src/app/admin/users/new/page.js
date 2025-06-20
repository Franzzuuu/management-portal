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
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validate passwords match
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
            } else {
                setError(data.error || 'Failed to create user');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }

        setLoading(false);
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

    if (!user) {
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
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center">
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                            <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h2 className="text-2xl font-bold text-white">Add New User</h2>
                            <p className="text-gray-200">Create new user accounts for the RFID system</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">User Information</h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Fill in the details to create a new user account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-medium" style={{ color: '#355E3B' }}>Personal Information</h4>

                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        name="fullName"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
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
                            </div>

                            {/* Account Information */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-medium" style={{ color: '#355E3B' }}>Account Information</h4>

                                <div>
                                    <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
                                        Designation *
                                    </label>
                                    <select
                                        id="designation"
                                        name="designation"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
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

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                        placeholder="Confirm password"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                    />
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
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                                style={{ backgroundColor: '#355E3B' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2d4f32'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#355E3B'}
                            >
                                {loading ? 'Creating User...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}