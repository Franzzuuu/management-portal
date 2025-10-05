'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthData } from '@/lib/client-auth';

export default function ChangePasswordPage() {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [passwordStrength, setPasswordStrength] = useState({
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false
    });
    const router = useRouter();

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        checkPasswordStrength(formData.newPassword);
    }, [formData.newPassword]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user) {
                setUser(data.user);

                // If user doesn't need to change password, redirect to dashboard
                if (!data.user.must_change_password) {
                    const role = data.user.designation;
                    if (role === 'Admin') {
                        router.push('/admin');
                    } else if (role === 'Security') {
                        router.push('/security');
                    } else {
                        router.push('/carolinian');
                    }
                }
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
    };

    const checkPasswordStrength = (password) => {
        setPasswordStrength({
            hasMinLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        });
    };

    const handleLogout = async () => {
        try {
            setUser(null);
            clearAuthData();
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            clearAuthData();
            router.push('/login');
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate passwords match
        if (formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match');
            setLoading(false);
            return;
        }

        // Check if password meets all requirements
        const allRequirementsMet = Object.values(passwordStrength).every(req => req);
        if (!allRequirementsMet) {
            setError('Password does not meet all requirements');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to appropriate dashboard
                const role = user.designation;
                if (role === 'Admin') {
                    router.push('/admin');
                } else if (role === 'Security') {
                    router.push('/security');
                } else {
                    router.push('/carolinian');
                }
            } else {
                setError(data.error || 'Failed to change password');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }

        setLoading(false);
    };

    const getStrengthIndicatorClass = (requirement) => {
        return requirement ? 'text-green-600' : 'text-red-500';
    };

    const getStrengthIcon = (requirement) => {
        return requirement ? '✓' : '✗';
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Change Password</h1>
                                <p className="text-sm text-gray-200">Required for first-time login</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
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
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md hover:shadow-lg hover:cursor-pointer"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center">
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                            <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h2 className="text-2xl font-bold text-white">Password Change Required</h2>
                            <p className="text-gray-200">You must change your password before continuing</p>
                        </div>
                    </div>
                </div>

                {/* Change Password Form */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                        <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>Create New Password</h3>
                        <p className="text-sm text-gray-600 mt-1">Your current password is temporary. Please create a secure new password.</p>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Current Password */}
                            <div>
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Password *
                                </label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                    placeholder="Enter your current password"
                                    value={formData.currentPassword}
                                    onChange={handleInputChange}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This is your temporary password in format: USC_ID + &quot;Usc$&quot;
                                </p>
                            </div>

                            {/* New Password */}
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password *
                                </label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                    placeholder="Enter your new password"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm New Password *
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                    placeholder="Confirm your new password"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                />
                                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Passwords do not match
                                    </p>
                                )}
                            </div>

                            {/* Password Requirements */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Password Requirements</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className={`flex items-center ${getStrengthIndicatorClass(passwordStrength.hasMinLength)}`}>
                                        <span className="mr-2">{getStrengthIcon(passwordStrength.hasMinLength)}</span>
                                        At least 8 characters
                                    </div>
                                    <div className={`flex items-center ${getStrengthIndicatorClass(passwordStrength.hasUpperCase)}`}>
                                        <span className="mr-2">{getStrengthIcon(passwordStrength.hasUpperCase)}</span>
                                        One uppercase letter
                                    </div>
                                    <div className={`flex items-center ${getStrengthIndicatorClass(passwordStrength.hasLowerCase)}`}>
                                        <span className="mr-2">{getStrengthIcon(passwordStrength.hasLowerCase)}</span>
                                        One lowercase letter
                                    </div>
                                    <div className={`flex items-center ${getStrengthIndicatorClass(passwordStrength.hasNumber)}`}>
                                        <span className="mr-2">{getStrengthIcon(passwordStrength.hasNumber)}</span>
                                        One number
                                    </div>
                                    <div className={`flex items-center ${getStrengthIndicatorClass(passwordStrength.hasSpecialChar)} sm:col-span-2`}>
                                        <span className="mr-2">{getStrengthIcon(passwordStrength.hasSpecialChar)}</span>
                                        One special character (!@#$%^&amp;*(),.?&quot;:{ }|&lt;&gt;)
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading || !Object.values(passwordStrength).every(req => req) || formData.newPassword !== formData.confirmPassword}
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:cursor-pointer"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    {loading ? 'Changing Password...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Information Panel */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="text-sm font-medium text-blue-900">Important Information</h4>
                            <div className="text-sm text-blue-700 mt-1">
                                <p>• After changing your password, you will not be able to change it again yourself.</p>
                                <p>• Contact an administrator if you need to change your password in the future.</p>
                                <p>• Choose a strong password that you will remember.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}