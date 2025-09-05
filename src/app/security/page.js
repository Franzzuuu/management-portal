'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FileText, AlertCircle, CheckCircle, Clock, Users, Car, BarChart3, Shield, Plus, Eye, TrendingUp, Calendar, MapPin, Zap, User } from 'lucide-react';

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
    const [profilePicture, setProfilePicture] = useState(null);

    useEffect(() => {
        checkAuth();
        fetchProfilePicture();
    }, []);

    const checkAuth = async () => {
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
    };

    const fetchDashboardData = async () => {
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
        }
    };

    const fetchProfilePicture = async () => {
        try {
            const response = await fetch('/api/security/profile-picture');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setProfilePicture(`data:${data.image_type};base64,${data.image_data}`);
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile picture:', error);
        }
    };

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
            <header className="shadow-lg border-b-2" style={{ backgroundColor: '#355E3B', borderBottomColor: '#FFD700' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <div>
                                <Image src="/images/usclogo.png" alt="Logo" width={128} height={128} className="mx-auto h-32 w-auto" />
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
                                    Welcome, <span className="font-semibold">{user?.fullName || `${user?.first_name} ${user?.last_name}`}</span>
                                </div>
                                <div className="flex items-center justify-end mt-1">
                                    <span className="px-2 py-1 text-xs font-medium rounded-md" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                        {user?.designation}
                                    </span>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-lg">
                                    {profilePicture ? (
                                        <Image
                                            src={profilePicture}
                                            alt="Profile"
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                            unoptimized={true}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                            <User className="h-6 w-6" style={{ color: '#355E3B' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md hover:shadow-lg hover:cursor-pointer"
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
                                Security Dashboard
                            </h2>
                            <p className="text-gray-200">
                                Integrated RFID Sticker System for Campus Security Management
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <Shield className="h-8 w-8" style={{ color: '#355E3B' }} />
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
                                    <FileText className="h-6 w-6" style={{ color: '#FFD700' }} />
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Total Violations</h3>
                                <p className="text-3xl font-bold" style={{ color: '#355E3B' }}>{stats.totalViolations}</p>
                                <p className="text-sm text-gray-500">Recorded in system</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#FFD700' }}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                    <Clock className="h-6 w-6" style={{ color: '#355E3B' }} />
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Pending Review</h3>
                                <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>{stats.pendingViolations}</p>
                                <p className="text-sm text-gray-500">{stats.todayViolations} reported today</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Resolved Cases</h3>
                                <p className="text-3xl font-bold text-green-600">{stats.resolvedViolations}</p>
                                <p className="text-sm text-gray-500">{stats.weeklyViolations} this week</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Contested</h3>
                                <p className="text-3xl font-bold text-red-600">{stats.contestedViolations}</p>
                                <p className="text-sm text-gray-500">Require attention</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
                        <p className="text-sm" style={{ color: '#FFD700' }}>Manage security operations and violations</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Report New Violation */}
                            <button
                                onClick={() => router.push('/security/violations?tab=add')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300 hover:cursor-pointer"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: '#FFD700' }}>
                                        <Plus className="h-6 w-6" style={{ color: '#355E3B' }} />
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">Report New Violation</p>
                                    <p className="text-sm text-gray-600">Issue traffic violation with evidence and details</p>
                                </div>
                            </button>

                            {/* My Profile */}
                            <button
                                onClick={() => router.push('/security/profile')}
                                className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 group hover:border-gray-300 hover:cursor-pointer"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                        <User className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                                <div className="ml-4 text-left">
                                    <p className="text-lg font-semibold text-gray-900">My Profile</p>
                                    <p className="text-sm text-gray-600">Update personal information and settings</p>
                                </div>
                            </button>

                        </div>
                    </div>
                </div>

                {/* Recent Activity and Today's Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Violations */}
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Recent Violations</h3>
                                    <p className="text-sm" style={{ color: '#FFD700' }}>Latest reported violations</p>
                                </div>
                                <button
                                    onClick={() => router.push('/security/violations')}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 text-white hover:bg-white hover:text-gray-900 hover:cursor-pointer"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                                >
                                    View All
                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {recentViolations.length > 0 ? (
                                    recentViolations.map((violation) => (
                                        <div key={violation.id}
                                            className="relative p-4 rounded-lg transition-all duration-200 hover:shadow-md"
                                            style={{
                                                backgroundColor: 'rgba(53,94,59,0.03)',
                                                borderLeft: '4px solid',
                                                borderLeftColor: violation.status === 'pending' ? '#F59E0B' :
                                                    violation.status === 'resolved' ? '#10B981' : '#EF4444'
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-medium text-gray-900">{violation.violation_type}</h4>
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                                                            {getStatusIcon(violation.status)}
                                                            <span className="ml-1 capitalize">{violation.status}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                                        <Users className="w-4 h-4 mr-1" />
                                                        <span>{violation.owner_name}</span>
                                                        <span className="mx-2">•</span>
                                                        <Car className="w-4 h-4 mr-1" />
                                                        <span>{violation.vehicle_plate || 'No Plate'}</span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500 mt-2">
                                                        <Calendar className="w-3 h-3 mr-1" />
                                                        <span>{formatDate(violation.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(53,94,59,0.1)' }}>
                                            <FileText className="h-6 w-6" style={{ color: '#355E3B' }} />
                                        </div>
                                        <p className="text-gray-600">No violations reported yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Today's Activity */}
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #FFD700 0%, #e6c200 100%)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>Today&apos;s Activity</h3>
                            <p className="text-sm" style={{ color: '#355E3B' }}>Activity for {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {todayActivity.length > 0 ? (
                                    todayActivity.map((activity) => (
                                        <div key={activity.id}
                                            className="flex items-center p-4 rounded-lg transition-all duration-200 hover:shadow-md"
                                            style={{ backgroundColor: 'rgba(53,94,59,0.03)' }}
                                        >
                                            <div className="flex-shrink-0 mr-4">
                                                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                                    <MapPin className="h-5 w-5 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-medium text-gray-900">{activity.violation_type}</h4>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-xs text-gray-600 mt-1">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    <span>{activity.location || 'No location'}</span>
                                                    <span className="mx-2">•</span>
                                                    <Car className="w-3 h-3 mr-1" />
                                                    <span>{activity.vehicle_plate || 'No Plate'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(53,94,59,0.1)' }}>
                                            <Clock className="h-6 w-6" style={{ color: '#355E3B' }} />
                                        </div>
                                        <p className="text-gray-600">No activity recorded today</p>
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