'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, AlertCircle, CheckCircle, Clock, Users, Car, Calendar, MapPin, User } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
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
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#355E3B' }}></div>
                    <p className="mt-4 text-gray-600">Loading Security Dashboard...</p>
                </div>
            </div>
        );
    }

    // Dashboard stats configuration - Security-specific KPIs
    const dashboardStats = [
        {
            title: 'Total Violations',
            value: stats.totalViolations,
            subtitle: 'Recorded in system',
            iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            textColor: '#355E3B',
            borderColor: '#355E3B'
        },
        {
            title: 'Self-Issued Violations',
            value: stats.selfIssuedViolations,
            subtitle: 'Violations you reported',
            iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            textColor: '#FFD700',
            borderColor: '#FFD700'
        },
        {
            title: 'Contribution Percentage',
            value: `${stats.contributionPercentage}%`,
            subtitle: 'Your contribution to total violations',
            iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            bgColor: '#10b981',
            iconColor: '#ffffff',
            textColor: '#10b981',
            borderColor: '#10b981'
        }
    ];

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Violations',
            subtitle: 'Report, monitor and manage all security violations',
            iconPath: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
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