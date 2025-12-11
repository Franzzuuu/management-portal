'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthData } from '@/lib/client-auth';
import DashboardLayout from '../components/DashboardLayout';
import AccessLogsSuccessPie from '../components/AccessLogsSuccessPie';
import LoadingSpinner from '../components/LoadingSpinner';
import useSocketChannel from '@/hooks/useSocketChannel';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalVehicles: 0,
        pendingApprovals: 0,
        activeViolations: 0,
        todayLogs: 0,
        pendingAppeals: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [latestRegistrations, setLatestRegistrations] = useState([]);
    const [entryExitActivity, setEntryExitActivity] = useState([]);
    const [pendingVehicleApprovals, setPendingVehicleApprovals] = useState([]);
    const [recentViolationAppeals, setRecentViolationAppeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success) {
                if (data.user.designation !== 'Admin') {
                    router.push('/login');
                    return;
                }

                // Check if user must change password
                if (data.user.must_change_password) {
                    router.push('/change-password');
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
    }, [router]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard/stats');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStats(data.stats);
                    setRecentActivity(data.recentActivity);
                    setLatestRegistrations(data.latestRegistrations);
                }
            }

            // Fetch initial snapshot data
            const snapshotResponse = await fetch('/api/admin/snapshot', { cache: 'no-store' });
            if (snapshotResponse.ok) {
                const snapshotData = await snapshotResponse.json();
                if (snapshotData.success) {
                    setEntryExitActivity(snapshotData.entryExit || []);
                    setPendingVehicleApprovals(snapshotData.pendingVehicleApprovals || []);
                    setStats(prevStats => ({
                        ...prevStats,
                        pendingApprovals: snapshotData.pendingApprovalsCount || 0
                    }));
                }
            }

            // Fetch recent violation appeals - using violation contests endpoint
            try {
                const violationAppealsResponse = await fetch('/api/admin/violation-contests?status=pending');
                if (violationAppealsResponse.ok) {
                    const violationAppealsData = await violationAppealsResponse.json();
                    if (violationAppealsData.success) {
                        setRecentViolationAppeals(violationAppealsData.contests?.slice(0, 5) || []);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch violation appeals:', error);
                setRecentViolationAppeals([]);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        }
    };

    // Real-time dashboard updates using the standardized socket system
    const { connected } = useSocketChannel('dashboard', {
        // Handle entry/exit activity updates
        entry_exit_update: (payload) => {
            console.log('Dashboard received entry_exit_update:', payload);
            setEntryExitActivity(prev => [payload, ...prev].slice(0, 5));
        },

        // Handle vehicle approval updates
        vehicle_pending_update: (payload) => {
            console.log('Dashboard received vehicle_pending_update:', payload);
            if (payload.count !== undefined) {
                setStats(prevStats => ({
                    ...prevStats,
                    pendingApprovals: payload.count
                }));
            }
            if (payload.vehicles) {
                setPendingVehicleApprovals(payload.vehicles.slice(0, 5));
            }
        },

        // Handle stats refresh
        stats_refresh: (payload) => {
            console.log('Dashboard received stats_refresh:', payload);
            if (payload.stats) {
                setStats(prevStats => ({ ...prevStats, ...payload.stats }));
            }
        }
    }, {
        enablePollingFallback: true,
        pollFn: () => {
            console.log('Dashboard polling fallback: fetching snapshot data');
            fetchDashboardData();
        },
        pollIntervalMs: 5000 // 5 second polling for dashboard
    });

    if (loading) {
        return <LoadingSpinner message="Loading dashboard" />;
    }

    // Dashboard stats configuration
    const dashboardStats = [
        {
            title: 'Total Users',
            value: stats.totalUsers,
            subtitle: 'Registered in system',
            iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            borderColor: '#e5e7eb'
        },
        {
            title: 'Total Vehicles',
            value: stats.totalVehicles,
            subtitle: 'Active registrations',
            iconPath: 'M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z',
            iconFill: true,
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            borderColor: '#e5e7eb'
        },
        {
            title: 'Pending Approvals',
            value: stats.pendingApprovals,
            subtitle: 'Vehicles needing action',
            iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            bgColor: '#f59e0b',
            iconColor: '#ffffff',
            borderColor: '#e5e7eb'
        },
        {
            title: 'Active Violations',
            value: stats.activeViolations,
            subtitle: 'Unresolved issues',
            iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
            bgColor: '#dc2626',
            iconColor: '#ffffff',
            borderColor: '#e5e7eb'
        }
    ];

    // Quick actions configuration
    const quickActions = [
        {
            title: 'User Management',
            subtitle: 'View, add, and manage users',
            iconPath: 'M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2M16 7a4 4 0 01-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM19 8v3m0 0v3m0-3h3m-3 0h-3',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/admin/users/new')
        },
        {
            title: 'Vehicle Management',
            subtitle: 'Manage vehicle registrations',
            iconPath: 'M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z',
            iconFill: true,
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            onClick: () => router.push('/admin/vehicles')
        },
        {
            title: 'View Reports',
            subtitle: 'Access analytics and system reports',
            iconPath: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            bgColor: '#2563eb',
            iconColor: '#ffffff',
            onClick: () => router.push('/admin/reports')
        },
        {
            title: 'RFID Tag Management',
            subtitle: 'Assign and manage RFID tags',
            iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/admin/rfid-tags')
        },
        {
            title: 'Access Logs',
            subtitle: 'Monitor vehicle entry and exit logs',
            iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            onClick: () => router.push('/admin/access-logs')
        },
        {
            title: 'Violation Management',
            subtitle: 'Handle parking violations and penalties',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            bgColor: '#dc2626',
            iconColor: '#ffffff',
            onClick: () => router.push('/admin/violations')
        }
    ];

    // Format recent violation appeals for DashboardLayout
    const formattedRecentAppeals = (recentViolationAppeals || []).map((contest) => ({
        description: `${contest.violation_type || 'Violation'} Appeal - ${contest.user_name || contest.full_name || 'Unknown'} (${contest.contest_status || 'pending'})`,
        timestamp: new Date(contest.contest_created_at || contest.created_at).toLocaleString()
    }));

    return (
        <DashboardLayout
            user={user}
            setUser={setUser}
            stats={dashboardStats}
            quickActions={quickActions}
            recentActivity={null} // No recent activity at bottom since we have custom layout
            recentActivityTitle=""
            recentActivitySubtitle=""
        >
            {/* Entry & Exit Activity + Pending Vehicle Approvals Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 sm:mb-8">
                {/* Entry & Exit Activity */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl sm:text-xl font-semibold text-white">Entry & Exit Activity</h2>
                        <p className="text-sm sm:text-sm" style={{ color: '#FFD700' }}>Latest gate access logs</p>
                    </div>
                    <div className="p-6 sm:p-6">
                        {entryExitActivity && entryExitActivity.length > 0 ? (
                            <div className="space-y-4 sm:space-y-4">
                                {entryExitActivity.slice(0, 5).map((activity, index) => (
                                    <div key={index} className="flex items-center p-4 sm:p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-shrink-0">
                                            <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: (activity.entry_type || activity.action) === 'entry' ? '#10b981' : '#f97316' }}>
                                                <svg className="h-4 w-4 sm:h-4 sm:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {(activity.entry_type || activity.action) === 'entry' ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l4 4m0 0l-4 4m4-4H3m14 0V7a3 3 0 00-3-3H7a3 3 0 00-3 3v4" />
                                                    )}
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                            <p className="text-sm sm:text-sm font-medium text-gray-900">
                                                {activity.location || 'Main Gate'} - {activity.plate_number || activity.plateNumber || 'Unknown Vehicle'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(activity.entry_type || activity.action || 'entry')?.toUpperCase()} • {new Date(activity.timestamp || activity.created_at || Date.now()).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 sm:py-8">
                                <svg className="h-12 w-12 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-base sm:text-base text-gray-500">No recent entries or exits</p>
                                <p className="text-sm sm:text-sm text-gray-400">Gate access logs will appear here</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Vehicle Approvals */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-xl font-semibold text-white">
                                    Pending Vehicle Approvals {stats.pendingApprovals > 0 && `(${stats.pendingApprovals})`}
                                </h2>
                                <p className="text-sm sm:text-sm" style={{ color: '#FFD700' }}>Awaiting admin confirmation</p>
                            </div>
                            {stats.pendingApprovals > 0 && (
                                <span className="bg-[#FFD700] text-[#355E3B] text-xs font-semibold px-2 py-1 rounded-full">
                                    {stats.pendingApprovals}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-6 sm:p-6">
                        {pendingVehicleApprovals && pendingVehicleApprovals.length > 0 ? (
                            <div 
                                className="space-y-4 sm:space-y-4 cursor-pointer"
                                onClick={() => router.push('/admin/vehicles')}
                            >
                                {pendingVehicleApprovals.slice(0, 5).map((vehicle, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center flex-1">
                                            <div className="flex-shrink-0">
                                                <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f97316' }}>
                                                    <svg className="h-4 w-4 sm:h-4 sm:w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                                <p className="text-sm sm:text-sm font-medium text-gray-900">
                                                    {(vehicle.make || 'Unknown Make')} {(vehicle.model || 'Unknown Model')} - {(vehicle.plate_number || vehicle.plateNumber || 'No Plate')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {(vehicle.owner_name || vehicle.ownerName || 'Unknown Owner')} • Submitted {new Date(vehicle.updated_at || vehicle.created_at || Date.now()).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 ml-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${vehicle.pending_reason === 'Needs Approval'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {vehicle.pending_reason || 'Needs Approval'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <p className="text-xs text-center text-gray-400 mt-2">Click to manage pending approvals</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 sm:py-8">
                                <svg className="h-12 w-12 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-base sm:text-base text-gray-500">No pending vehicle actions</p>
                                <p className="text-sm sm:text-sm text-gray-400">Vehicles needing approval or RFID assignment will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Access Logs Success Rate + Recent Violation Appeals Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 sm:mb-8 items-stretch">
                {/* Access Logs Success Rate Pie Chart */}
                <AccessLogsSuccessPie />

                {/* Recent Violation Appeals */}
                <div className="bg-white rounded-xl shadow-lg h-full flex flex-col">
                    <div className="px-6 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl sm:text-xl font-semibold text-white">Recent Violation Appeals</h2>
                        <p className="text-sm sm:text-sm" style={{ color: '#FFD700' }}>Latest violations submitted for appeal</p>
                    </div>
                    <div className="p-6 sm:p-6 flex-1">
                        {formattedRecentAppeals && formattedRecentAppeals.length > 0 ? (
                            <div className="space-y-4 sm:space-y-4">
                                {formattedRecentAppeals.map((activity, index) => (
                                    <div key={index} className="flex items-center p-4 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
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
                            <div className="flex flex-col items-center justify-center h-full">
                                <svg className="h-12 w-12 sm:h-12 sm:w-12 text-gray-400 mb-4 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-base sm:text-base text-gray-500">No recent violation appeals</p>
                                <p className="text-sm sm:text-sm text-gray-400">Latest violations submitted for appeal will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}