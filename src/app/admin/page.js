'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ViolationHistoryWidget from '@/components/ViolationHistoryWidget';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalVehicles: 0,
        pendingApprovals: 0,
        activeViolations: 0,
        todayLogs: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [latestRegistrations, setLatestRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success) {
                if (data.user.designation !== 'Admin') {
                    router.push('/login');
                    return;
                }
                setUser(data.user);
                await fetchDashboardData();
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    };

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard/stats');
            const data = await response.json();

            if (data.success) {
                setStats(data.stats);
                setRecentActivity(data.recentActivity);
                setLatestRegistrations(data.latestRegistrations);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
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
                {/* Welcome Banner */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Administrator Dashboard
                            </h2>
                            <p className="text-gray-200">
                                Integrated RFID Sticker System for Seamless Vehicle Identification
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-8 w-8" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#355E3B' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                    <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
                                <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>{stats.totalUsers}</p>
                                <p className="text-sm text-gray-500">Registered in system</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#FFD700' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                    <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Registered Vehicles</h3>
                                <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>{stats.totalVehicles}</p>
                                <p className="text-sm text-gray-500">Active registrations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-orange-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                                <p className="text-3xl font-bold text-orange-500">{stats.pendingApprovals}</p>
                                <p className="text-sm text-gray-500">Awaiting review</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-red-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-red-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Active Violations</h3>
                                <p className="text-3xl font-bold text-red-500">{stats.activeViolations}</p>
                                <p className="text-sm text-gray-500">Unresolved issues</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* UPDATED: Recent Activity, Latest Registrations & Violation History Widget */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Recent Vehicle Activity</h3>
                            <p className="text-sm" style={{ color: '#FFD700' }}>Todays access logs: {stats.todayLogs}</p>
                        </div>
                        <div className="p-6">
                            {recentActivity.length > 0 ? (
                                <div className="space-y-3">
                                    {recentActivity.map((activity, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className={`h-2 w-2 rounded-full ${activity.entry_type === 'entry' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{activity.plate_number}</p>
                                                    <p className="text-xs text-gray-500">{activity.user_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-medium" style={{ color: activity.entry_type === 'entry' ? '#355E3B' : '#dc2626' }}>
                                                    {activity.entry_type.toUpperCase()}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No recent activity</p>
                            )}
                        </div>
                    </div>

                    {/* Latest Registrations */}
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #FFD700 0%, #e6c200 100%)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>Latest Registrations</h3>
                            <p className="text-sm" style={{ color: '#355E3B' }}>Pending vehicle approvals</p>
                        </div>
                        <div className="p-6">
                            {latestRegistrations.length > 0 ? (
                                <div className="space-y-3">
                                    {latestRegistrations.map((registration, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{registration.full_name}</p>
                                                <p className="text-xs text-gray-500">{registration.plate_number} • {registration.vehicle_type}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-md">
                                                    Pending
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(registration.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No pending registrations</p>
                            )}
                        </div>
                    </div>

                    {/* NEW: Violation History Widget */}
                    <ViolationHistoryWidget />
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Manage your RFID vehicle system</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            {/* Add New User */}
                            <button
                                onClick={() => router.push('/admin/users/new')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#355E3B' }}>
                                        <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">Add New User</p>
                                    <p className="text-sm text-gray-600">Create new user accounts and assign roles</p>
                                </div>
                            </button>

                            {/* Vehicle Management */}
                            <button
                                onClick={() => router.push('/admin/vehicles')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#FFD700' }}>
                                        <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">Vehicle Management</p>
                                    <p className="text-sm text-gray-600">Manage registrations and RFID assignments</p>
                                </div>
                            </button>

                            {/* View Reports */}
                            <button
                                onClick={() => router.push('/admin/reports')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">View Reports</p>
                                    <p className="text-sm text-gray-600">Access analytics and system reports</p>
                                </div>
                            </button>

                            {/* RFID Tag Management */}
                            <button
                                onClick={() => router.push('/admin/rfid-tags')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#355E3B' }}>
                                        <svg className="h-6 w-6" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">RFID Tag Management</p>
                                    <p className="text-sm text-gray-600">Assign and manage RFID tags</p>
                                </div>
                            </button>

                            {/* Access Logs */}
                            <button
                                onClick={() => router.push('/admin/access-logs')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#FFD700' }}>
                                        <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">Access Logs</p>
                                    <p className="text-sm text-gray-600">Monitor vehicle entry and exit logs</p>
                                </div>
                            </button>

                            {/* Violation Management */}
                            <button
                                onClick={() => router.push('/admin/violations')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">Violation Management</p>
                                    <p className="text-sm text-gray-600">Handle parking violations and penalties</p>
                                </div>
                            </button>

                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="mt-8 bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl font-semibold text-white">System Status</h2>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Current system health and performance</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                                <div>
                                    <p className="text-sm font-medium text-green-800">Database Connection</p>
                                    <p className="text-xs text-green-600">Online</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                                <div>
                                    <p className="text-sm font-medium text-green-800">RFID Scanners</p>
                                    <p className="text-xs text-green-600">Ready for Integration</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Management Portal</p>
                                    <p className="text-xs text-blue-600">Active</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}