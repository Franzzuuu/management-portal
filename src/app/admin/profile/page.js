'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminProfile() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        phone: '',
        department: '',
        employee_id: ''
    });
    const [originalProfile, setOriginalProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profilePicture, setProfilePicture] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const router = useRouter();

    // Auto-clear message after 5 seconds
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [message.text]);

    const fetchUserData = useCallback(async () => {
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
    }, [router]);

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data.profile);
                setOriginalProfile(data.profile);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile data' });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProfilePicture = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/profile-picture');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setProfilePicture(`data:${data.image_type};base64,${data.image_data}`);
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile picture:', error);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchUserData();
            await fetchProfile();
            await fetchProfilePicture();
        };
        init();
    }, [fetchUserData, fetchProfile, fetchProfilePicture]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/admin/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile)
            });

            if (response.ok) {
                setOriginalProfile(profile);
                setMessage({ type: 'success', text: 'Profile updated successfully!' });

                // Update user session data if full_name changed
                if (profile.full_name !== originalProfile.full_name) {
                    setUser(prev => ({ ...prev, full_name: profile.full_name }));
                }

                // Navigate to dashboard after 1.5 seconds
                setTimeout(() => {
                    router.push('/admin');
                }, 1500);
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setProfile(originalProfile);
        setMessage({ type: '', text: '' });
    };

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
            return;
        }

        try {
            setUploadingImage(true);
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
            });

            const response = await fetch('/api/admin/profile-picture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_data: base64,
                    image_type: file.type
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
                setProfilePicture(URL.createObjectURL(file));
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.message || 'Failed to update profile picture' });
            }
        } catch (error) {
            console.error('Profile picture update error:', error);
            setMessage({ type: 'error', text: 'Failed to update profile picture' });
        } finally {
            setUploadingImage(false);
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

    const hasChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile);

    if (loading) {
        return <LoadingSpinner message="Loading profile" />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Dashboard" fallbackPath="/admin" />
                </div>

                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center">
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                            <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h2 className="text-2xl font-bold text-white">Admin Profile Management</h2>
                            <p className="text-gray-200">Update your personal information and account settings</p>
                        </div>
                    </div>
                </div>

                {/* Profile Form */}
                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Keep your information up to date</p>
                    </div>

                    <form onSubmit={handleSave} className="p-6">
                        {/* Profile Picture Section */}
                        <div className="mb-8 flex flex-col items-center">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                                    {profilePicture ? (
                                        <Image
                                            src={profilePicture}
                                            alt="Profile"
                                            width={128}
                                            height={128}
                                            className="w-full h-full object-cover"
                                            unoptimized={true}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-green-600 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow-lg hover:bg-green-700 transition-colors duration-200">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfilePictureChange}
                                        className="hidden"
                                    />
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </label>
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-sm text-gray-600">Upload a profile picture</p>
                                <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                            </div>
                        </div>

                        {/* Message Display */}
                        {message.text && (
                            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <div className="flex items-center">
                                    {message.type === 'success' ? (
                                        <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    )}
                                    <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                                        {message.text}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Full Name */}
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={profile.full_name || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={profile.email || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={profile.phone || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
                                />
                            </div>

                            {/* Department */}
                            <div>
                                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                                    Department
                                </label>
                                <input
                                    type="text"
                                    id="department"
                                    name="department"
                                    value={profile.department || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
                                />
                            </div>

                            {/* Employee ID */}
                            <div>
                                <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-2">
                                    Employee ID
                                </label>
                                <input
                                    type="text"
                                    id="employee_id"
                                    name="employee_id"
                                    value={profile.employee_id || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
                                />
                            </div>

                            {/* Account Type (Read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Account Type
                                </label>
                                <input
                                    type="text"
                                    value={user?.designation || ''}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                    disabled
                                />
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={!hasChanges || saving}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reset Changes
                            </button>
                            <button
                                type="submit"
                                disabled={!hasChanges || saving}
                                className="px-6 py-2 text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105"
                                style={{ backgroundColor: saving ? '#6B7280' : '#355E3B' }}
                            >
                                {saving ? (
                                    <span className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Account Information */}
                <div className="mt-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">Account Information</h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Read-only account details</p>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                                    {user?.username}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Created</label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm text-blue-700 font-medium">Administrator Access</p>
                                    <p className="text-xs text-blue-600">You have full administrative privileges for system management.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
