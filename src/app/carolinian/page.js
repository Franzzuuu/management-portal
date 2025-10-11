'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '../components/DashboardLayout';
import useSocketChannel from '@/hooks/useSocketChannel';

export default function CarolinianDashboard() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalViolations: 0,
        pendingAppeals: 0,
        registeredVehicles: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);
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

    // Real-time carolinian dashboard updates
    const { connected } = useSocketChannel('violations', {
        // Handle violation updates for this user
        update: (payload) => {
            console.log('Carolinian dashboard received violations:update:', payload);
            if (payload.user_id === user?.uscId || payload.owner_id === user?.uscId) {
                setStats(prevStats => ({
                    ...prevStats,
                    totalViolations: prevStats.totalViolations + (payload.action === 'create' ? 1 : 0),
                    pendingAppeals: prevStats.pendingAppeals + (payload.status === 'pending' ? 1 : payload.status === 'resolved' ? -1 : 0)
                }));
            }
        }
    }, {
        enablePollingFallback: true,
        pollFn: () => {
            console.log('Carolinian dashboard polling fallback');
            fetchPersonalStats();
        },
        pollIntervalMs: 15000
    });

    // Also subscribe to vehicle updates for this user
    const { connected: vehicleConnected } = useSocketChannel('vehicles', {
        // Handle vehicle approval updates
        approval_update: (payload) => {
            console.log('Carolinian dashboard received vehicles:approval_update:', payload);
            if (payload.owner_id === user?.uscId && payload.approval_status === 'approved') {
                setStats(prevStats => ({
                    ...prevStats,
                    registeredVehicles: prevStats.registeredVehicles + 1
                }));
            }
        }
    }, {
        enablePollingFallback: false // Only poll for violations, not vehicles
    });

    // Configure stats for Carolinian dashboard
    const dashboardStats = [
        {
            title: 'My Vehicles',
            value: stats.registeredVehicles,
            subtitle: 'Registered vehicles',
            borderColor: '#355E3B',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            textColor: '#355E3B',
            iconPath: 'M8 9l4-4 4 4m0 6l-4 4-4-4'
        },
        {
            title: 'Total Violations',
            value: stats.totalViolations,
            subtitle: 'Issued violations',
            borderColor: '#FFD700',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            textColor: '#FFD700',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z'
        },
        {
            title: 'Pending Appeals',
            value: stats.pendingAppeals,
            subtitle: 'Under review',
            borderColor: '#f97316',
            bgColor: '#f97316',
            iconColor: '#ffffff',
            textColor: '#f97316',
            iconPath: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
        },
        {
            title: 'Account Status',
            value: 'Active',
            subtitle: 'Registration up to date',
            borderColor: '#10b981',
            bgColor: '#10b981',
            iconColor: '#ffffff',
            textColor: '#10b981',
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        }
    ];

    // Configure quick actions for Carolinian dashboard
    // Quick actions configuration
    const quickActions = [
        {
            title: 'My Vehicles',
            subtitle: 'View and manage your registered vehicles',
            iconPath: 'M8 9l4-4 4 4m0 6l-4 4-4-4',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/carolinian/vehicles')
        },
        {
            title: 'My Violations',
            subtitle: 'View violations and submit appeals',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z',
            bgColor: '#dc2626',
            iconColor: '#ffffff',
            onClick: () => router.push('/carolinian/violations')
        }
    ];

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
        <DashboardLayout
            user={user}
            setUser={setUser}
            stats={dashboardStats}
            quickActions={quickActions}
            recentActivity={stats.recentActivity}
        />
    );
}