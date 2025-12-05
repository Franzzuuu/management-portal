'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, AlertCircle, CheckCircle, Clock, Users, Car, Calendar, MapPin, User } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import useSocketChannel from '@/hooks/useSocketChannel';

const SecurityDashboard = () => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalViolations: 0,
        selfIssuedViolations: 0,
        contributionPercentage: 0
    });
    const [recentViolations, setRecentViolations] = useState([]);
    const [todayActivity, setTodayActivity] = useState([]);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Security') {
                // Check if user must change password
                if (data.user.must_change_password) {
                    router.push('/change-password');
                    return;
                }

                setUser(data.user);
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

    const fetchDashboardData = useCallback(async () => {
        if (!user) return; // Don't fetch if no user

        try {
            console.log('Fetching security snapshot with user:', user);
            // Use snapshot API for initial load and polling fallback
            const snapshotResponse = await fetch(`/api/security/snapshot?userId=${user.uscId}`, {
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!snapshotResponse.ok) {
                console.error('Security snapshot API failed:', snapshotResponse.status);
                return;
            }

            const snapshotData = await snapshotResponse.json();

            if (snapshotData.success) {
                setStats(snapshotData.stats);
                setRecentViolations(snapshotData.recentViolations || []);

                // Set today's activity from the violations
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayViols = (snapshotData.violations || []).filter(v => {
                    const violDate = new Date(v.created_at);
                    violDate.setHours(0, 0, 0, 0);
                    return violDate.getTime() === today.getTime();
                });
                setTodayActivity(todayViols);
            } else {
                console.error('Security snapshot API returned error:', snapshotData.error);
            }

        } catch (error) {
            console.error('Failed to fetch security dashboard data:', error);
            setStats({
                totalViolations: 0,
                selfIssuedViolations: 0,
                contributionPercentage: 0
            });
            setRecentViolations([]);
            setTodayActivity([]);
        }
    }, [user]);

    // Real-time security dashboard updates
    const { connected } = useSocketChannel('violations', {
        // Handle violation updates
        update: (payload) => {
            console.log('Security dashboard received violations:update:', payload);

            if (payload.action === 'create') {
                // New violation created
                setStats(prevStats => {
                    const newTotalViolations = prevStats.totalViolations + 1;
                    const newSelfIssuedViolations = payload.reported_by === user?.uscId 
                        ? prevStats.selfIssuedViolations + 1 
                        : prevStats.selfIssuedViolations;
                    const newContributionPercentage = newTotalViolations > 0 
                        ? ((newSelfIssuedViolations / newTotalViolations) * 100).toFixed(1)
                        : 0;

                    return {
                        totalViolations: newTotalViolations,
                        selfIssuedViolations: newSelfIssuedViolations,
                        contributionPercentage: newContributionPercentage
                    };
                });

                // Add to recent violations (prepend and cap to 5)
                setRecentViolations(prev => [payload, ...prev].slice(0, 5));

                // Add to today's activity if created today
                const today = new Date();
                const payloadDate = new Date(payload.created_at);
                if (payloadDate.toDateString() === today.toDateString()) {
                    setTodayActivity(prev => [payload, ...prev]);
                }
            } else if (payload.action === 'update') {
                // Update in recent violations list
                setRecentViolations(prev =>
                    prev.map(v => v.id === payload.id ? { ...v, ...payload } : v)
                );
            }
        },

        // Handle stats refresh
        stats_refresh: (payload) => {
            console.log('Security dashboard received violations:stats_refresh:', payload);
            if (payload.stats) {
                setStats(payload.stats);
            }
        }
    }, {
        enablePollingFallback: true,
        pollFn: () => {
            console.log('Security dashboard polling fallback');
            if (user?.uscId) {
                fetchDashboardData();
            }
        },
        pollIntervalMs: 8000
    });

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, fetchDashboardData]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'contested': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'resolved': return <CheckCircle className="w-4 h-4" />;
            case 'contested': return <AlertCircle className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading Security Dashboard" />;
    }

    // Dashboard stats configuration - Security-specific KPIs
    const dashboardStats = [
        {
            title: 'Total Violations',
            value: stats.totalViolations,
            subtitle: 'Recorded in system',
            iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            borderColor: '#e5e7eb'
        },
        {
            title: 'Self-Issued Violations',
            value: stats.selfIssuedViolations,
            subtitle: 'Violations you reported',
            iconPath: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            bgColor: '#f59e0b',
            iconColor: '#ffffff',
            borderColor: '#e5e7eb'
        },
        {
            title: 'Contribution Percentage',
            value: `${stats.contributionPercentage}%`,
            subtitle: 'Your contribution to total violations',
            iconPath: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z',
            bgColor: '#10b981',
            iconColor: '#ffffff',
            borderColor: '#e5e7eb'
        }
    ];

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Violations',
            subtitle: 'Report, monitor and manage all security violations',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/security/violations')
        }
    ];

    // Format recent activity for DashboardLayout
    const formattedRecentActivity = recentViolations.map((violation) => ({
        description: `${violation.violation_type} - ${violation.owner_name} (${violation.vehicle_plate || 'No Plate'})`,
        timestamp: formatDate(violation.created_at)
    }));

    return (
        <DashboardLayout
            user={user}
            setUser={setUser}
            stats={dashboardStats}
            quickActions={quickActions}
            recentActivity={formattedRecentActivity}
            statsColumns={3}
        />
    );
}; export default SecurityDashboard;