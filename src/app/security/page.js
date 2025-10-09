'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, AlertCircle, CheckCircle, Clock, Users, Car, Calendar, MapPin, User } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const SecurityDashboard = () => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalViolations: 0,
        pendingViolations: 0,
        resolvedViolations: 0,
        contestedViolations: 0,
        todayViolations: 0,
        weeklyViolations: 0,
        monthlyViolations: 0
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
            console.log('Fetching violations with user:', user);
            // Fetch violations reported by the current security personnel
            const violationsResponse = await fetch('/api/violations?securityFilter=true', {
                headers: {
                    'X-User-Role': 'Security',
                    'X-User-Id': user?.uscId?.toString() || ''
                }
            });

            // ✅ FIXED: Check if the response is OK before parsing JSON
            if (!violationsResponse.ok) {
                console.error('Violations API failed:', violationsResponse.status);
                return; // Exit early if API fails
            }

            const violationsData = await violationsResponse.json();

            if (violationsData.success) {
                const violations = violationsData.violations;
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

                setStats({
                    totalViolations: violations.length,
                    pendingViolations: violations.filter(v => v.status === 'pending').length,
                    resolvedViolations: violations.filter(v => v.status === 'resolved').length,
                    contestedViolations: violations.filter(v => v.status === 'contested').length,
                    todayViolations: violations.filter(v => new Date(v.created_at) >= today).length,
                    weeklyViolations: violations.filter(v => new Date(v.created_at) >= weekAgo).length,
                    monthlyViolations: violations.filter(v => new Date(v.created_at) >= monthAgo).length
                });

                // Get recent violations (last 5)
                setRecentViolations(violations.slice(0, 5));

                // Get today's activity
                setTodayActivity(violations.filter(v => new Date(v.created_at) >= today));
            } else {
                console.error('Violations API returned error:', violationsData.error);
            }

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setStats({
                totalViolations: 0,
                pendingViolations: 0,
                resolvedViolations: 0,
                contestedViolations: 0,
                todayViolations: 0,
                weeklyViolations: 0,
                monthlyViolations: 0
            });
            setRecentViolations([]);
            setTodayActivity([]);
        }
    }, [user]);

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

    // Dashboard stats configuration
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
            title: 'Pending Review',
            value: stats.pendingViolations,
            subtitle: `${stats.todayViolations} reported today`,
            iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
            textColor: '#FFD700',
            borderColor: '#FFD700'
        },
        {
            title: 'Resolved Cases',
            value: stats.resolvedViolations,
            subtitle: `${stats.weeklyViolations} this week`,
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            bgColor: '#10b981',
            iconColor: '#ffffff',
            textColor: '#10b981',
            borderColor: '#10b981'
        },
        {
            title: 'Contested',
            value: stats.contestedViolations,
            subtitle: 'Require attention',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z',
            bgColor: '#dc2626',
            iconColor: '#ffffff',
            textColor: '#dc2626',
            borderColor: '#dc2626'
        }
    ];

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Report New Violation',
            subtitle: 'Issue traffic violation with evidence and comprehensive details',
            iconPath: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
            bgColor: '#355E3B',
            iconColor: '#FFD700',
            onClick: () => router.push('/security/violations?tab=add')
        },
        {
            title: 'View All Violations',
            subtitle: 'Monitor and manage all security violations',
            iconPath: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
            bgColor: '#FFD700',
            iconColor: '#355E3B',
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
        />
    );
}; export default SecurityDashboard;