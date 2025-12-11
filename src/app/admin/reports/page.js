'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import KPICard from '../../components/KPICard';
import ReportsSection from '../../components/ReportsSection';
import SimplePieChart from '../../components/SimplePieChart';
import SimpleBarChart from '../../components/SimpleBarChart';
import SkeletonLoader from '../../components/SkeletonLoader';

export default function ReportsPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        userStats: {},
        vehicleStats: {},
        accessStats: {},
        violationStats: {},
        recentLogs: []
    });
    const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [previewDateRange, setPreviewDateRange] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [quickDateFilter, setQuickDateFilter] = useState('all-time');
    const router = useRouter();

    // Handle modal open/close effects
    useEffect(() => {
        if (showExportModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showExportModal]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && showExportModal) {
                setShowExportModal(false);
            }
        };
        
        if (showExportModal) {
            document.addEventListener('keydown', handleEscape);
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showExportModal]);

    const fetchReportData = useCallback(async () => {
        setIsDataLoading(true);
        try {
            const queryParams = new URLSearchParams({
                ...(dateRange.startDate && { startDate: dateRange.startDate }),
                ...(dateRange.endDate && { endDate: dateRange.endDate })
            });

            const response = await fetch(`/api/reports?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setReportData(data.reportData);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch report data:', error);
        } finally {
            setIsDataLoading(false);
        }
    }, [dateRange]);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
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

    useEffect(() => {
        if (user) {
            fetchReportData();
        }
    }, [user, fetchReportData]);



    // Helper function to format date as YYYY-MM-DD in local timezone
    const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Quick date filter handler
    const handleQuickDateFilter = (filter) => {
        setQuickDateFilter(filter);
        const now = new Date();
        let startDate = '';
        let endDate = formatDateLocal(now);

        switch (filter) {
            case 'today':
                startDate = endDate;
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = formatDateLocal(yesterday);
                endDate = startDate;
                break;
            case 'last-week':
                // Last 7 days (including today)
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                startDate = formatDateLocal(sevenDaysAgo);
                break;
            case 'last-30-days':
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 29);
                startDate = formatDateLocal(thirtyDaysAgo);
                break;
            case 'this-month':
                // From 1st of current month to today
                const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                startDate = formatDateLocal(firstOfMonth);
                break;
            case 'last-month':
                // From 1st of last month to last day of last month
                const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                startDate = formatDateLocal(firstOfLastMonth);
                endDate = formatDateLocal(lastOfLastMonth);
                break;
            case 'all-time':
            default:
                startDate = '';
                endDate = '';
                break;
        }

        setDateRange({ startDate, endDate });
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const getDateRangeForPreset = (preset) => {
        const today = new Date();
        let startDate, endDate;

        switch (preset) {
            case 'today':
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                break;
            case 'yesterday':
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
                break;
            case 'this-week':
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay());
                startDate = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                break;
            case 'this-month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                break;
            case 'last-month':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'this-year':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                break;
            case 'all-time':
            default:
                return { startDate: '', endDate: '' };
        }

        return {
            startDate: formatDateLocal(startDate),
            endDate: formatDateLocal(endDate)
        };
    };

    const formatDateRangePreview = (preset) => {
        const today = new Date();

        switch (preset) {
            case 'today':
                return `${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} only`;
            case 'yesterday':
                const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
                return `${yesterday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} only`;
            case 'this-week':
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay());
                return `${firstDayOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            case 'this-month':
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                return `${firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            case 'last-month':
                const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                return `${firstOfLastMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} to ${lastOfLastMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            case 'this-year':
                const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                return `${firstDayOfYear.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} to ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            case 'all-time':
                return `January 1, 2020 to ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (Complete History)`;
            default:
                return '';
        }
    };

    const handlePresetClick = (preset) => {
        setPreviewDateRange(formatDateRangePreview(preset));
    };

    const handleExportPreset = async (preset) => {
        setIsExporting(true);
        try {
            const exportRange = getDateRangeForPreset(preset);
            const response = await fetch(`/api/reports/export?type=pdf&startDate=${exportRange.startDate}&endDate=${exportRange.endDate}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            const fileName = `overview-report-${preset}-${new Date().toISOString().split('T')[0]}.pdf`;
            a.download = fileName;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log('Export completed successfully');
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
            setShowExportModal(false);
            setPreviewDateRange(null);
        }
    };

    const exportReport = async (type) => {
        setIsExporting(true);
        try {
            const response = await fetch(`/api/reports/export?type=${type}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            const fileName = `overview-report-${dateRange.startDate || 'all-time'}-to-${dateRange.endDate || 'now'}.${type}`;
            a.download = fileName;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log('Export completed successfully');
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading reports" />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Admin Dashboard" fallbackPath="/admin" />
                </div>

                {/* Page Header */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
                                <p className="text-gray-200">System-wide insights and data analysis</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
                    <div className="space-y-4">
                        {/* Date Filters */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: 'today', label: 'Today' },
                                        { value: 'yesterday', label: 'Yesterday' },
                                        { value: 'last-week', label: 'Last 7 Days' },
                                        { value: 'last-30-days', label: 'Last 30 Days' },
                                        { value: 'this-month', label: 'This Month' },
                                        { value: 'last-month', label: 'Last Month' },
                                        { value: 'all-time', label: 'All Time' }
                                    ].map((filter) => (
                                        <button
                                            key={filter.value}
                                            onClick={() => handleQuickDateFilter(filter.value)}
                                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${quickDateFilter === filter.value
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 font-medium"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Export PDF</span>
                                </button>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex flex-wrap items-end gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => {
                                            setDateRange({ ...dateRange, startDate: e.target.value });
                                            setQuickDateFilter('custom');
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => {
                                            setDateRange({ ...dateRange, endDate: e.target.value });
                                            setQuickDateFilter('custom');
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-700"
                                        style={{ '--tw-ring-color': '#355E3B' }}
                                    />
                                </div>
                                {lastUpdate && (
                                    <div className="text-sm text-gray-500">
                                        Last updated: {lastUpdate.toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Content */}
                {isDataLoading ? (
                    <div className="space-y-6">
                        <SkeletonLoader type="card" count={6} />
                        <SkeletonLoader type="table" count={2} />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* KPI Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            <KPICard
                                title="Total Users"
                                value={reportData.userStats?.total || 0}
                                subtitle="System-wide"
                                icon={<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
                                borderColor="#355E3B"
                                textColor="#355E3B"
                                iconBgColor="#355E3B"
                                iconColor="#FFD700"
                            />
                            <KPICard
                                title="Users with Activity"
                                value={reportData.userStats?.activeInRange !== undefined ? reportData.userStats.activeInRange : 0}
                                subtitle={dateRange.startDate && dateRange.endDate ? "Logged access in period" : "With access records"}
                                icon={<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />}
                                borderColor="#FFD700"
                                textColor="#FFD700"
                                iconBgColor="#FFD700"
                                iconColor="#355E3B"
                            />
                            <KPICard
                                title="Total Vehicles"
                                value={reportData.vehicleStats?.total || 0}
                                subtitle="Registered"
                                icon={<path fill="currentColor" d="M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,2C17.52,2 22,6.48 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,7C13.1,7 14.14,7.22 15.1,7.61L13.58,10.24C13.15,10.08 12.6,10 12,10C11.4,10 10.85,10.08 10.42,10.24L8.9,7.61C9.86,7.22 10.9,7 12,7M16.73,8.86C17.45,9.66 17.88,10.71 17.97,11.87L14.95,12.39C14.83,11.86 14.59,11.37 14.24,10.97L16.73,8.86M17.97,12.13C17.88,13.29 17.45,14.34 16.73,15.14L14.24,13.03C14.59,12.63 14.83,12.14 14.95,11.61L17.97,12.13M15.1,16.39C14.14,16.78 13.1,17 12,17C10.9,17 9.86,16.78 8.9,16.39L10.42,13.76C10.85,13.92 11.4,14 12,14C12.6,14 13.15,13.92 13.58,13.76L15.1,16.39M7.27,15.14C6.55,14.34 6.12,13.29 6.03,12.13L9.05,11.61C9.17,12.14 9.41,12.63 9.76,13.03L7.27,15.14M6.03,11.87C6.12,10.71 6.55,9.66 7.27,8.86L9.76,10.97C9.41,11.37 9.17,11.86 9.05,12.39L6.03,11.87Z" />}
                                borderColor="#4E7D57"
                                textColor="#4E7D57"
                                iconBgColor="#4E7D57"
                                iconColor="#FFD700"
                            />
                        </div>

                        {/* Second Row of KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            <KPICard
                                title="Access Logs"
                                value={reportData.accessStats?.inRange || 0}
                                subtitle={dateRange.startDate && dateRange.endDate ? "Entry and Exit" : "Total"}
                                icon={<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />}
                                borderColor="#4F81BD"
                                textColor="#4F81BD"
                                iconBgColor="#4F81BD"
                                iconColor="#FFD700"
                            />
                            <KPICard
                                title="Violations"
                                value={reportData.violationStats?.total || 0}
                                subtitle={dateRange.startDate && dateRange.endDate ? "In period" : "Total"}
                                icon={<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
                                borderColor="#DC2626"
                                textColor="#DC2626"
                                iconBgColor="#DC2626"
                                iconColor="#FFD700"
                            />
                            <KPICard
                                title="Peak Entry Hour"
                                value={reportData.accessStats?.peakEntryHour !== null ? `${String(reportData.accessStats.peakEntryHour).padStart(2, '0')}:00 - ${String(reportData.accessStats.peakEntryHour).padStart(2, '0')}:59` : 'N/A'}
                                subtitle="Most entries"
                                icon={<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                borderColor="#F59E0B"
                                textColor="#F59E0B"
                                iconBgColor="#F59E0B"
                                iconColor="#FFF"
                            />
                        </div>

                        {/* Users Section */}
                        <ReportsSection 
                            title="Users Overview" 
                            subtitle="User distribution and statistics"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    {reportData.userStats?.distribution?.length > 0 ? (
                                        <SimplePieChart
                                            title="User Distribution by Designation"
                                            data={reportData.userStats.distribution.map(item => ({
                                                label: item.designation,
                                                value: parseInt(item.count)
                                            }))}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                                            <p className="text-gray-500">No user data available</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-gray-900">User Statistics</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold" style={{ color: '#355E3B' }}>{reportData.userStats?.students || 0}</div>
                                            <div className="text-sm text-gray-600">Students</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold" style={{ color: '#dbb902' }}>{reportData.userStats?.faculty || 0}</div>
                                            <div className="text-sm text-gray-600">Faculty</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold" style={{ color: '#4E7D57' }}>{reportData.userStats?.security || 0}</div>
                                            <div className="text-sm text-gray-600">Security</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold" style={{ color: '#F79646' }}>{reportData.userStats?.admin || 0}</div>
                                            <div className="text-sm text-gray-600">Admin</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ReportsSection>

                        {/* Vehicles Section */}
                        <ReportsSection 
                            title="Vehicles Overview" 
                            subtitle="Vehicle registration and type distribution"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    {reportData.vehicleStats?.distribution?.length > 0 ? (
                                        <SimplePieChart
                                            title="Vehicle Distribution by Type"
                                            data={reportData.vehicleStats.distribution.map(item => ({
                                                label: item.vehicle_type,
                                                value: parseInt(item.count)
                                            }))}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                                            <p className="text-gray-500">No vehicle data available</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-gray-900">Vehicle Statistics</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold" style={{ color: '#dbb902' }}>{reportData.vehicleStats?.twoWheel || 0}</div>
                                            <div className="text-sm text-gray-600">Two-wheel</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold" style={{ color: '#355E3B' }}>{reportData.vehicleStats?.fourWheel || 0}</div>
                                            <div className="text-sm text-gray-600">Four-wheel</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{reportData.vehicleStats?.approved || 0}</div>
                                            <div className="text-sm text-gray-600">Approved Vehicles</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ReportsSection>

                        {/* Access Logs Section */}
                        <ReportsSection 
                            title="Access Logs Analysis" 
                            subtitle="Entry/exit patterns and activity trends"
                        >
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-green-600">{reportData.accessStats?.entries || 0}</div>
                                        <div className="text-sm text-gray-600">Total Entries</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-red-600">{reportData.accessStats?.exits || 0}</div>
                                        <div className="text-sm text-gray-600">Total Exits</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {reportData.accessStats?.peakEntryHour !== null ? `${String(reportData.accessStats.peakEntryHour).padStart(2, '0')}:00 - ${String(reportData.accessStats.peakEntryHour).padStart(2, '0')}:59` : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600">Peak Entry Hour</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {reportData.accessStats?.peakExitHour !== null ? `${String(reportData.accessStats.peakExitHour).padStart(2, '0')}:00 - ${String(reportData.accessStats.peakExitHour).padStart(2, '0')}:59` : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600">Peak Exit Hour</div>
                                    </div>
                                </div>
                                
                                {reportData.recentLogs?.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Access Activity</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {reportData.recentLogs.slice(0, 10).map((log, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`h-3 w-3 rounded-full ${log.entry_type === 'entry' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{log.plate_number}</p>
                                                            <p className="text-xs text-gray-500">{log.user_name} • {log.entry_type}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ReportsSection>

                        {/* Violations Section */}
                        <ReportsSection 
                            title="Violations Overview" 
                            subtitle="Violation statistics and resolution status"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    {reportData.violationStats?.byType?.length > 0 ? (
                                        <SimpleBarChart
                                            title="Violations by Type"
                                            data={reportData.violationStats.byType.map(item => ({
                                                label: item.type?.substring(0, 10) + (item.type?.length > 10 ? '...' : ''),
                                                value: parseInt(item.count)
                                            }))}
                                            xLabel="Violation Type"
                                            yLabel="Count"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                                            <p className="text-gray-500">No violations in this period</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-gray-900">Violation Statistics</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-orange-600">{reportData.violationStats?.total || 0}</div>
                                            <div className="text-sm text-gray-600">Total Violations</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-red-600">{reportData.violationStats?.pending || 0}</div>
                                            <div className="text-sm text-gray-600">Pending</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">{reportData.violationStats?.resolved || 0}</div>
                                            <div className="text-sm text-gray-600">Resolved</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {reportData.violationStats?.total > 0
                                                    ? `${Math.round(((reportData.violationStats.resolved || 0) / reportData.violationStats.total) * 100)}%`
                                                    : 'N/A'}
                                            </div>
                                            <div className="text-sm text-gray-600">Resolution Rate</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ReportsSection>
                    </div>
                )}
            </main>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div 
                        className="bg-white rounded-xl shadow-2xl border border-gray-300 w-full max-w-md mx-4 transform transition-all duration-300 ease-out animate-in fade-in zoom-in-95 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header with Hunter Green Background */}
                        <div className="bg-green-800 px-6 py-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Export PDF Report</h3>
                                    <p className="text-green-100 text-sm mt-1">Select a date range for your export</p>
                                </div>
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="text-white hover:text-green-200 transition-colors duration-200 p-2 hover:bg-green-700 rounded-lg"
                                    disabled={isExporting}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 bg-white">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                    onClick={() => { handlePresetClick('today'); handleExportPreset('today'); }}
                                    disabled={isExporting}
                                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => { handlePresetClick('yesterday'); handleExportPreset('yesterday'); }}
                                    disabled={isExporting}
                                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                    Yesterday
                                </button>
                                <button
                                    onClick={() => { handlePresetClick('this-week'); handleExportPreset('this-week'); }}
                                    disabled={isExporting}
                                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                    This Week
                                </button>
                                <button
                                    onClick={() => { handlePresetClick('this-month'); handleExportPreset('this-month'); }}
                                    disabled={isExporting}
                                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                    This Month
                                </button>
                                <button
                                    onClick={() => { handlePresetClick('this-year'); handleExportPreset('this-year'); }}
                                    disabled={isExporting}
                                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                    This Year
                                </button>
                                <button
                                    onClick={() => { handlePresetClick('all-time'); handleExportPreset('all-time'); }}
                                    disabled={isExporting}
                                    className="px-4 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                    ✨ All Time
                                </button>
                            </div>

                            {/* Date Range Preview */}
                            {previewDateRange && (
                                <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800 font-medium text-center">
                                        📅 {previewDateRange}
                                    </p>
                                </div>
                            )}

                            {/* Loading State */}
                            {isExporting && (
                                <div className="flex items-center justify-center space-x-3 py-4 bg-green-50 rounded-lg border border-green-200">
                                    <svg className="animate-spin h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-green-800 font-medium">Generating PDF...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}