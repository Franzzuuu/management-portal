'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthData } from '@/lib/client-auth';
import DashboardLayout from '../components/DashboardLayout';

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
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            textColor: '#FFD700',
            borderColor: '#FFD700'
        },
        {
            title: 'Pending Approvals',
            value: stats.pendingApprovals,
            subtitle: 'Awaiting review',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z',
            bgColor: '#f97316',
            iconColor: '#ffffff',
            textColor: '#f97316',
            borderColor: '#f97316'
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

    // Format recent activity for DashboardLayout
    const formattedRecentActivity = recentActivity.map((activity, index) => ({
        description: `${activity.plate_number} - ${activity.user_name} (${activity.entry_type.toUpperCase()})`,
        timestamp: new Date(activity.timestamp).toLocaleString()
    }));

    return (
        <DashboardLayout
            user={user}
            setUser={setUser}
            stats={dashboardStats}
            quickActions={quickActions}
            recentActivity={formattedRecentActivity}
        />
    );
}