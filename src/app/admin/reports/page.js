'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function ReportsPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState('summary');
    const [dateRange, setDateRange] = useState('week');
    const [reportData, setReportData] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const router = useRouter();

    useEffect(() => {
        checkAuth();
        // Set default date range (last 7 days)
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        setEndDate(today.toISOString().split('T')[0]);
        setStartDate(lastWeek.toISOString().split('T')[0]);
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success) {
                if (data.user.designation !== 'Admin') {
                    router.push('/login');
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
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const generateReport = async () => {
        setGenerating(true);
        try {
            const response = await fetch(`/api/reports?type=${reportType}&range=${dateRange}&startDate=${startDate}&endDate=${endDate}`);
            const data = await response.json();
            if (data.success) {
                setReportData(data.report);
            } else {
                // Generate sample data for demonstration
                const sampleData = generateSampleData();
                setReportData(sampleData);
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
            // Generate sample data as fallback
            const sampleData = generateSampleData();
            setReportData(sampleData);
        }
        setGenerating(false);
    };

    const generateSampleData = () => {
        switch (reportType) {
            case 'summary':
                return {
                    type: 'System Summary',
                    period: `${startDate} to ${endDate}`,
                    metrics: {
                        totalUsers: 892,
                        totalVehicles: 647,
                        totalAccessLogs: 3421,
                        totalViolations: 23,
                        averageDailyEntries: 156,
                        peakHour: '8:00 AM - 9:00 AM'
                    },
                    charts: [
                        { name: 'Monday', entries: 145, exits: 142 },
                        { name: 'Tuesday', entries: 167, exits: 165 },
                        { name: 'Wednesday', entries: 134, exits: 131 },
                        { name: 'Thursday', entries: 189, exits: 186 },
                        { name: 'Friday', entries: 201, exits: 198 },
                        { name: 'Saturday', entries: 89, exits: 87 },
                        { name: 'Sunday', entries: 67, exits: 65 }
                    ]
                };
            case 'violations':
                return {
                    type: 'Violation Report',
                    period: `${startDate} to ${endDate}`,
                    metrics: {
                        totalViolations: 23,
                        pendingViolations: 8,
                        resolvedViolations: 15,
                        mostCommonViolation: 'Illegal Parking'
                    },
                    violationTypes: [
                        { type: 'Illegal Parking', count: 12 },
                        { type: 'No Sticker', count: 6 },
                        { type: 'Expired Sticker', count: 3 },
                        { type: 'Unauthorized Area', count: 2 }
                    ]
                };
            case 'access':
                return {
                    type: 'Access Analytics',
                    period: `${startDate} to ${endDate}`,
                    metrics: {
                        totalEntries: 1089,
                        totalExits: 1067,
                        uniqueVehicles: 456,
                        averageStayTime: '4.2 hours'
                    },
                    hourlyData: [
                        { hour: '6 AM', count: 23 },
                        { hour: '7 AM', count: 67 },
                        { hour: '8 AM', count: 145 },
                        { hour: '9 AM', count: 89 },
                        { hour: '10 AM', count: 45 },
                        { hour: '11 AM', count: 34 },
                        { hour: '12 PM', count: 78 },
                        { hour: '1 PM', count: 56 },
                        { hour: '2 PM', count: 43 },
                        { hour: '3 PM', count: 67 },
                        { hour: '4 PM', count: 89 },
                        { hour: '5 PM', count: 123 }
                    ]
                };
            default:
                return null;
        }
    };

    const downloadReport = () => {
        if (!reportData) return;

        // Create CSV content
        let csvContent = `Report Type: ${reportData.type}\n`;
        csvContent += `Period: ${reportData.period}\n\n`;

        if (reportData.metrics) {
            csvContent += 'Metrics:\n';
            Object.entries(reportData.metrics).forEach(([key, value]) => {
                csvContent += `${key}: ${value}\n`;
            });
        }

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-800"></div>
                    <span className="text-gray-600">Loading reports...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <PageHeader
                title="Reports Management"
                user={user}
                onLogout={handleLogout}
            />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-blue-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">System Reports</h3>
                                <p className="text-3xl font-bold text-blue-500">5</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-green-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Generated Today</h3>
                                <p className="text-3xl font-bold text-green-500">12</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-yellow-400">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
                                <p className="text-3xl font-bold text-yellow-600">47</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-purple-500">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Data Points</h3>
                                <p className="text-3xl font-bold text-purple-500">8.2K</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Configuration */}
                <div className="bg-white rounded-xl shadow-lg mb-8">
                    <div className="px-6 py-4 border-b border-gray-200 bg-green-800 rounded-t-xl">
                        <h2 className="text-xl font-semibold text-white">Generate Reports</h2>
                        <p className="text-sm text-yellow-400">Create detailed system analytics and reports</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Report Type
                                </label>
                                <select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent"
                                >
                                    <option value="summary">System Summary</option>
                                    <option value="violations">Violation Report</option>
                                    <option value="access">Access Analytics</option>
                                    <option value="vehicles">Vehicle Statistics</option>
                                    <option value="users">User Activity</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date Range
                                </label>
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent"
                                >
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                    <option value="quarter">Last 3 Months</option>
                                    <option value="year">Last 12 Months</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Actions
                                </label>
                                <button
                                    onClick={generateReport}
                                    disabled={generating}
                                    className="w-full px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                                >
                                    {generating ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    )}
                                    <span>{generating ? 'Generating...' : 'Generate Report'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Results */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 bg-green-800 rounded-t-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Report Results</h3>
                                <p className="text-sm text-yellow-400">Generated report data and analytics</p>
                            </div>
                            {reportData && (
                                <button
                                    onClick={downloadReport}
                                    className="px-4 py-2 bg-yellow-400 text-green-800 rounded-lg hover:bg-yellow-500 transition-colors duration-200 flex items-center space-x-2"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Download CSV</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-6">
                        {reportData ? (
                            <div className="space-y-6">
                                {/* Report Header */}
                                <div className="text-center border-b border-gray-200 pb-4">
                                    <h4 className="text-2xl font-bold text-green-800 mb-2">
                                        {reportData.type}
                                    </h4>
                                    <p className="text-gray-600">Period: {reportData.period}</p>
                                </div>

                                {/* Metrics */}
                                {reportData.metrics && (
                                    <div>
                                        <h5 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {Object.entries(reportData.metrics).map(([key, value]) => (
                                                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm font-medium text-gray-600 capitalize">
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </p>
                                                    <p className="text-2xl font-bold text-green-800">{value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Charts Data */}
                                {reportData.charts && (
                                    <div>
                                        <h5 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h5>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entries</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exits</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {reportData.charts.map((day, index) => (
                                                        <tr key={index}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {day.name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {day.entries}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {day.exits}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Violation Types */}
                                {reportData.violationTypes && (
                                    <div>
                                        <h5 className="text-lg font-semibold text-gray-900 mb-4">Violation Breakdown</h5>
                                        <div className="space-y-2">
                                            {reportData.violationTypes.map((violation, index) => (
                                                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                    <span className="text-sm font-medium text-gray-900">{violation.type}</span>
                                                    <span className="text-sm font-bold text-red-600">{violation.count} cases</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hourly Data */}
                                {reportData.hourlyData && (
                                    <div>
                                        <h5 className="text-lg font-semibold text-gray-900 mb-4">Hourly Distribution</h5>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                            {reportData.hourlyData.map((hour, index) => (
                                                <div key={index} className="text-center p-2 bg-gray-50 rounded">
                                                    <p className="text-xs text-gray-600">{hour.hour}</p>
                                                    <p className="text-lg font-bold text-green-800">{hour.count}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
                                <p className="text-gray-500">Select your report parameters and click Generate Report to view analytics</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}