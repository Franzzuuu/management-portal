'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
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
            borderColor: '#e5e7eb',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            iconPath: 'M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z',
            iconFill: true
        },
        {
            title: 'Total Violations',
            value: stats.totalViolations,
            subtitle: 'Issued violations',
            borderColor: '#e5e7eb',
            bgColor: '#f59e0b',
            iconColor: '#ffffff',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
        },
        {
            title: 'Pending Appeals',
            value: stats.pendingAppeals,
            subtitle: 'Under review',
            borderColor: '#e5e7eb',
            bgColor: '#f97316',
            iconColor: '#ffffff',
            iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        {
            title: 'Account Status',
            value: 'Active',
            subtitle: 'Registration up to date',
            borderColor: '#e5e7eb',
            bgColor: '#10b981',
            iconColor: '#ffffff',
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        }
    ];

    // Configure quick actions for Carolinian dashboard
    // Quick actions configuration
    const quickActions = [
        {
            title: 'My Vehicles',
            subtitle: 'View and manage your registered vehicles',
            iconPath: 'M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z',
            iconFill: true,
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/carolinian/vehicles')
        },
        {
            title: 'My Violations',
            subtitle: 'View violations and submit appeals',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            bgColor: '#dc2626',
            iconColor: '#ffffff',
            onClick: () => router.push('/carolinian/violations')
        }
    ];

    if (loading) {
        return <LoadingSpinner message="Loading your dashboard" />;
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