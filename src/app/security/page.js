'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, AlertCircle, CheckCircle, Clock, BarChart3, Shield, Plus, Calendar, RefreshCcw } from 'lucide-react';

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
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            // ✅ FIXED: Only fetch violations data (activity API doesn't exist yet)
            const violationsResponse = await fetch('/api/violations?securityFilter=true');

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
            // ✅ ADDED: Set empty states if API fails
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
        } finally {
            setLastUpdated(new Date());
        }
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Security') {
                setUser(data.user);
                await fetchDashboardData();
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
        setLoading(false);
    }, [fetchDashboardData, router]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (user) {
            const interval = setInterval(() => {
                fetchDashboardData();
            }, 60000);
            return () => clearInterval(interval);
        }
    }, [user, fetchDashboardData]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="shadow-lg" style={{ backgroundColor: '#355E3B' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center py-4 px-6">
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <Shield className="h-6 w-6" style={{ color: '#355E3B' }} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
                                <p className="text-sm text-gray-200">RFID Vehicle Access Management</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-right">
                                <div className="text-white">
                                    Welcome, <span className="font-semibold">{user?.fullName || `${user?.first_name} ${user?.last_name}`}</span>
                                </div>
                                <div className="flex items-center justify-end mt-1">
                                    <span className="px-2 py-1 text-xs font-medium rounded-md" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                        {user?.designation}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-200 mt-1">
                                    Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                                </div>
                            </div>
                            <button
                                onClick={fetchDashboardData}
                                className="bg-white hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md hover:shadow-lg flex items-center"
                                style={{ color: '#355E3B' }}
                            >
                                <RefreshCcw className="h-4 w-4 mr-1" />
                                Refresh
                            </button>
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
                {/* Welcome Section */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <Shield className="h-6 w-6" style={{ color: '#355E3B' }} />
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">
                                    Welcome back, Test Security{user?.first_name}!
                                </h2>
                                <p className="text-gray-200">Monitor campus security and manage traffic violations</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-white text-sm opacity-90">
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Violations</p>
                                    <p className="text-2xl font-bold" style={{ color: '#355E3B' }}>
                                        {stats.totalViolations}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                    <FileText className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-white">
                            <div className="text-xs text-gray-500">
                                {stats.monthlyViolations} this month
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {stats.pendingViolations}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-yellow-500">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-white">
                            <div className="text-xs text-gray-500">
                                {stats.todayViolations} reported today
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Resolved</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {stats.resolvedViolations}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-500">
                                    <CheckCircle className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-white">
                            <div className="text-xs text-gray-500">
                                {stats.weeklyViolations} this week
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Contested</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {stats.contestedViolations}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-red-500">
                                    <AlertCircle className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-white">
                            <div className="text-xs text-gray-500">
                                Require attention
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>
                                Quick Actions
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">Manage violations and generate reports</p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <button
                                    onClick={() => router.push('/security/violations')}
                                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 text-left group"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-10 w-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#355E3B' }}>
                                            <FileText className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold" style={{ color: '#355E3B' }}>
                                                {stats.totalViolations}
                                            </div>
                                            <div className="text-xs text-gray-500">Total</div>
                                        </div>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Manage Violations</h4>
                                    <p className="text-sm text-gray-600">
                                        View, edit, and track all traffic violations youve reported
                                    </p>
                                </button>

                                <button
                                    onClick={() => router.push('/security/violations?tab=add')}
                                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 text-left group"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-10 w-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#FFD700' }}>
                                            <Plus className="h-6 w-6" style={{ color: '#355E3B' }} />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold" style={{ color: '#355E3B' }}>
                                                {stats.todayViolations}
                                            </div>
                                            <div className="text-xs text-gray-500">Today</div>
                                        </div>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Report New Violation</h4>
                                    <p className="text-sm text-gray-600">
                                        Issue a new traffic violation with evidence capture
                                    </p>
                                </button>

                                <button
                                    onClick={() => router.push('/security/violations?tab=stats')}
                                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 text-left group"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-10 w-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 bg-blue-500">
                                            <BarChart3 className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold" style={{ color: '#355E3B' }}>
                                                {stats.weeklyViolations}
                                            </div>
                                            <div className="text-xs text-gray-500">This week</div>
                                        </div>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-2">View Statistics</h4>
                                    <p className="text-sm text-gray-600">
                                        Analyze violation trends and performance metrics
                                    </p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Violations */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>
                                        Recent Violations
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">Latest violations youve reported</p>
                                </div>
                                <button
                                    onClick={() => router.push('/security/violations')}
                                    className="text-sm font-medium hover:underline px-3 py-1 rounded transition-colors"
                                    style={{ color: '#355E3B' }}
                                >
                                    View All
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {recentViolations.length > 0 ? (
                                    recentViolations.map((violation) => (
                                        <div key={violation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-gray-900">{violation.violation_type}</h4>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                                                        {getStatusIcon(violation.status)}
                                                        <span className="ml-1 capitalize">{violation.status}</span>
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {violation.owner_name} • {violation.vehicle_plate}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatDate(violation.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                        <p>No violations reported yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Today's Activity */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100" style={{ backgroundColor: '#f8f9fa' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>
                                        Todays Activity
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">Violations reported today</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                        {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {todayActivity.length > 0 ? (
                                    todayActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                                    <AlertCircle className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {activity.violation_type}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {activity.location} • {activity.vehicle_plate}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(activity.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                        <p>No activity today</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SecurityDashboard;