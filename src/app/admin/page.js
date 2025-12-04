'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthData } from '@/lib/client-auth';
import DashboardLayout from '../components/DashboardLayout';
import AccessLogsSuccessPie from '../components/AccessLogsSuccessPie';
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
                const violationAppealsResponse = await fetch('/api/admin/violation-contests?status=all');
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

    // Dashboard stats configuration
    const dashboardStats = [
        {
            title: 'Total Users',
            value: stats.totalUsers,
            subtitle: 'Registered in system',
            iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            textColor: '#355E3B',
            borderColor: '#355E3B'
        },
        {
            title: 'Total Vehicles',
            value: stats.totalVehicles,
            subtitle: 'Active registrations',
            iconPath: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            textColor: '#355E3B',
            borderColor: '#355E3B'
        },
        {
            title: 'Pending Approvals',
            value: stats.pendingApprovals,
            subtitle: 'Vehicles needing action',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            textColor: '#FFD700',
            borderColor: '#FFD700'
        },
        {
            title: 'Active Violations',
            value: stats.activeViolations,
            subtitle: 'Unresolved issues',
            iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            bgColor: '#dc2626',
            iconColor: '#ffffff',
            textColor: '#dc2626',
            borderColor: '#dc2626'
        }
    ];

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Add New User',
            subtitle: 'Create new accounts',
            iconPath: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/admin/users/new')
        },
        {
            title: 'Vehicle Management',
            subtitle: 'Manage vehicle registrations',
            iconPath: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            onClick: () => router.push('/admin/vehicles')
        },
        {
            title: 'View Reports',
            subtitle: 'Access analytics and system reports',
            iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            bgColor: '#2563eb',
            iconColor: '#ffffff',
            onClick: () => router.push('/admin/reports')
        },
        {
            title: 'RFID Tag Management',
            subtitle: 'Assign and manage RFID tags',
            iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/admin/rfid-tags')
        },
        {
            title: 'Access Logs',
            subtitle: 'Monitor vehicle entry and exit logs',
            iconPath: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            onClick: () => router.push('/admin/access-logs')
        },
        {
            title: 'Violation Management',
            subtitle: 'Handle parking violations and penalties',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z',
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
                <div 
                    className="bg-white rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200"
                    onClick={() => router.push('/admin/vehicles')}
                >
                    <div className="px-6 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-xl font-semibold text-white">
                                    Pending Vehicle Approvals {stats.pendingApprovals > 0 && `(${stats.pendingApprovals})`}
                                </h2>
                                <p className="text-sm sm:text-sm" style={{ color: '#FFD700' }}>Awaiting admin confirmation • Click to manage</p>
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
                            <div className="space-y-4 sm:space-y-4">
                                {pendingVehicleApprovals.slice(0, 5).map((vehicle, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                        <div className="flex items-center flex-1">
                                            <div className="flex-shrink-0">
                                                <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f97316' }}>
                                                    <svg className="h-4 w-4 sm:h-4 sm:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5a2 2 0 00-2-2H8z" />
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