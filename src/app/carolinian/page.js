'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';

export default function CarolinianDashboard() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalViolations: 0,
        pendingAppeals: 0,
        registeredVehicles: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);
    const [profilePicture, setProfilePicture] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/me');
                const data = await response.json();

                if (data.success) {
                    if (data.user.must_change_password) {
                        router.push('/change-password');
                        return;
                    }

                    setUser(data.user);
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Failed to fetch user data:', error);
                router.push('/login');
            }
        };

        checkAuth();
        fetchPersonalStats();
        fetchProfilePicture();
    }, [router]);

    const fetchPersonalStats = async () => {
        try {
            const response = await fetch('/api/carolinian/dashboard');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch personal stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfilePicture = async () => {
        try {
            const response = await fetch('/api/carolinian/profile-picture');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setProfilePicture(`data:${data.image_type};base64,${data.image_data}`);
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile picture:', error);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#355E3B' }}></div>
                    <p className="mt-4 text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 sm:py-8 px-6 sm:px-6 lg:px-8">
                {/* Welcome Banner */}
                <div className="mb-8 sm:mb-8 p-6 sm:p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                        <div className="text-center sm:text-left w-full sm:w-auto">
                            <h2 className="text-2xl sm:text-2xl font-bold text-white mb-3 sm:mb-2">
                                Welcome, {user?.fullName || user?.email}
                            </h2>
                            <p className="text-base sm:text-base text-gray-200">
                                Integrated RFID Sticker System - Vehicle Management Portal
                            </p>
                        </div>
                        <div className="shrink-0">
                            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-lg">
                                {profilePicture ? (
                                    <Image
                                        src={profilePicture}
                                        alt="Profile"
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-cover"
                                        unoptimized={true}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                        <svg className="h-8 w-8 md:h-10 md:w-10" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personal Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-6 mb-8 sm:mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-6 border-l-4" style={{ borderLeftColor: '#355E3B' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                    <svg className="h-6 w-6 sm:h-6 sm:w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                <h3 className="text-lg sm:text-lg font-semibold text-gray-900 truncate">My Vehicles</h3>
                                <p className="text-3xl sm:text-3xl font-bold" style={{ color: '#355E3B' }}>{stats.registeredVehicles}</p>
                                <p className="text-sm sm:text-sm text-gray-500">Registered vehicles</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-6 border-l-4" style={{ borderLeftColor: '#FFD700' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                    <svg className="h-6 w-6 sm:h-6 sm:w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                <h3 className="text-lg sm:text-lg font-semibold text-gray-900 truncate">Total Violations</h3>
                                <p className="text-3xl sm:text-3xl font-bold" style={{ color: '#FFD700' }}>{stats.totalViolations}</p>
                                <p className="text-sm sm:text-sm text-gray-500">Issued violations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-6 border-l-4 border-orange-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center bg-orange-500">
                                    <svg className="h-6 w-6 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                <h3 className="text-lg sm:text-lg font-semibold text-gray-900 truncate">Pending Appeals</h3>
                                <p className="text-3xl sm:text-3xl font-bold text-orange-500">{stats.pendingAppeals}</p>
                                <p className="text-sm sm:text-sm text-gray-500">Under review</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-6 border-l-4 border-green-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center bg-green-500">
                                    <svg className="h-6 w-6 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                <h3 className="text-lg sm:text-lg font-semibold text-gray-900 truncate">Account Status</h3>
                                <p className="text-lg sm:text-lg font-bold text-green-500">Active</p>
                                <p className="text-sm sm:text-sm text-gray-500">Registration up to date</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8 sm:mb-8">
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h2 className="text-xl sm:text-xl font-semibold text-white">Quick Actions</h2>
                            <p className="text-sm sm:text-sm" style={{ color: '#FFD700' }}>Access your most used features</p>
                        </div>
                        <div className="p-6 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">

                                {/* My Vehicles */}
                                <button
                                    onClick={() => router.push('/carolinian/vehicles')}
                                    className="flex items-center p-6 sm:p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300 hover:cursor-pointer"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#355E3B' }}>
                                            <svg className="h-6 w-6 sm:h-6 sm:w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4 sm:ml-4 text-left min-w-0 flex-1">
                                        <p className="text-lg sm:text-lg font-semibold text-gray-900 truncate">My Vehicles</p>
                                        <p className="text-sm sm:text-sm text-gray-600">View and manage your registered vehicles</p>
                                    </div>
                                </button>

                                {/* My Violations */}
                                <button
                                    onClick={() => router.push('/carolinian/violations')}
                                    className="flex items-center p-6 sm:p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300 hover:cursor-pointer"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 sm:h-12 sm:w-12 bg-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                            <svg className="h-6 w-6 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4 sm:ml-4 text-left min-w-0 flex-1">
                                        <p className="text-lg sm:text-lg font-semibold text-gray-900 truncate">My Violations</p>
                                        <p className="text-sm sm:text-sm text-gray-600">View violations and submit appeals</p>
                                    </div>
                                </button>

                                {/* Profile Management */}
                                <button
                                    onClick={() => router.push('/carolinian/profile')}
                                    className="flex items-center p-6 sm:p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300 hover:cursor-pointer sm:col-span-2 lg:col-span-1"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#FFD700' }}>
                                            <svg className="h-6 w-6 sm:h-6 sm:w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4 sm:ml-4 text-left min-w-0 flex-1">
                                        <p className="text-lg sm:text-lg font-semibold text-gray-900 truncate">My Profile</p>
                                        <p className="text-sm sm:text-sm text-gray-600">Update personal information and settings</p>
                                    </div>
                                </button>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl sm:text-xl font-semibold text-white">Recent Activity</h2>
                        <p className="text-sm sm:text-sm" style={{ color: '#FFD700' }}>Your latest account activity</p>
                    </div>
                    <div className="p-6 sm:p-6">
                        {stats.recentActivity && stats.recentActivity.length > 0 ? (
                            <div className="space-y-4 sm:space-y-4">
                                {stats.recentActivity.map((activity, index) => (
                                    <div key={index} className="flex items-center p-4 sm:p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-shrink-0">
                                            <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                                <svg className="h-4 w-4 sm:h-4 sm:w-4" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                            <p className="text-sm sm:text-sm font-medium text-gray-900">{activity.description}</p>
                                            <p className="text-xs text-gray-500">{activity.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 sm:py-8">
                                <svg className="h-12 w-12 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-base sm:text-base text-gray-500">No recent activity</p>
                                <p className="text-sm sm:text-sm text-gray-400">Your vehicle access logs and activities will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}