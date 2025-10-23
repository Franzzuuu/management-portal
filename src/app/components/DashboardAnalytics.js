'use client';

import { useState, useEffect } from 'react';
import PieChart from './charts/PieChart';
import BarChart from './charts/BarChart';
import LineChart from './charts/LineChart';

export default function DashboardAnalytics({ reportData, dateRange }) {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState({
        userDistribution: [],
        vehicleDistribution: [],
        monthlyTrends: null,
        accessPatterns: null,
        violationTrends: null
    });

    // Fetch real analytics data
    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/analytics');
                const data = await response.json();

                if (data.success) {
                    setAnalyticsData(data);

                    // Process chart data using new API structure
                    const userDistribution = data.userDistribution?.map(item => ({
                        label: item.designation || 'Unknown',
                        value: parseInt(item.count) || 0
                    })).filter(item => item.value > 0) || [];

                    const vehicleDistribution = data.vehicleDistribution?.map(item => ({
                        label: item.vehicle_type || 'Unknown',
                        value: parseInt(item.count) || 0
                    })).filter(item => item.value > 0) || [];

                    // Generate charts from real analytics data
                    const monthlyTrends = generateMonthlyTrends(data);
                    const accessPatterns = generateAccessPatterns(data);
                    const violationTrends = generateViolationTrends(data);

                    setChartData({
                        userDistribution,
                        vehicleDistribution,
                        monthlyTrends,
                        accessPatterns,
                        violationTrends
                    });
                }
            } catch (error) {
                console.error('Failed to fetch analytics data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalyticsData();
    }, []);

    const generateMonthlyTrends = (data) => {
        if (!data?.monthlyTrends?.length) return null;

        const months = data.monthlyTrends.map(item => item.month);
        const accessCounts = data.monthlyTrends.map(item => parseInt(item.access_count) || 0);
        const violationCounts = data.monthlyTrends.map(item => parseInt(item.violation_count) || 0);

        return {
            labels: months,
            datasets: [
                {
                    label: 'Access Logs',
                    data: accessCounts,
                    borderColor: '#355E3B',
                    backgroundColor: 'rgba(53, 94, 59, 0.2)',
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Violations',
                    data: violationCounts,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.1,
                    fill: true
                }
            ]
        };
    };

    const generateAccessPatterns = (data) => {
        if (!data?.accessPatterns?.length) return null;

        const hours = data.accessPatterns.map(item => `${String(item.hour).padStart(2, '0')}:00`);
        const entryCounts = data.accessPatterns.map(item => parseInt(item.entry_count) || 0);
        const exitCounts = data.accessPatterns.map(item => parseInt(item.exit_count) || 0);

        return {
            labels: hours,
            datasets: [
                {
                    label: 'Entries',
                    data: entryCounts,
                    backgroundColor: '#355E3B',
                    borderColor: '#355E3B',
                    borderWidth: 1
                },
                {
                    label: 'Exits',
                    data: exitCounts,
                    backgroundColor: '#FFD700',
                    borderColor: '#FFD700',
                    borderWidth: 1
                }
            ]
        };
    };

    const generateViolationTrends = (data) => {
        if (!data?.violationTrends?.length) return null;

        const types = data.violationTrends.map(item => item.violation_type || 'Unknown');
        const counts = data.violationTrends.map(item => parseInt(item.count) || 0);

        return {
            labels: types,
            datasets: [{
                data: counts,
                backgroundColor: [
                    'rgb(239, 68, 68)',   // Red
                    'rgb(245, 158, 11)',  // Amber
                    'rgb(59, 130, 246)',  // Blue
                    'rgb(34, 197, 94)',   // Green
                    'rgb(168, 85, 247)',  // Purple
                    'rgb(236, 72, 153)',  // Pink
                    'rgb(20, 184, 166)',  // Teal
                    'rgb(251, 146, 60)'   // Orange
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };
    };

    return (
        <div className="space-y-8">
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    {chartData.userDistribution.length > 0 ? (
                        <PieChart
                            data={chartData.userDistribution}
                            title="User Distribution by Designation"
                            colors={['#355E3B', '#FFD700', '#4F81BD']}
                        />
                    ) : (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">User Distribution by Designation</h3>
                            <p className="text-gray-500">No user data available</p>
                        </div>
                    )}
                </div>

                {/* Vehicle Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    {chartData.vehicleDistribution.length > 0 ? (
                        <PieChart
                            data={chartData.vehicleDistribution}
                            title="Vehicle Distribution by Type"
                            colors={['#FFD700', '#355E3B']}
                        />
                    ) : (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Vehicle Distribution by Type</h3>
                            <p className="text-gray-500">No vehicle data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                {chartData.monthlyTrends ? (
                    <LineChart
                        data={chartData.monthlyTrends}
                        title="Monthly Activity Trends"
                        fill={true}
                        tension={0.3}
                    />
                ) : (
                    <div className="text-center py-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Monthly Activity Trends</h3>
                        <p className="text-gray-500">No monthly data available yet</p>
                    </div>
                )}
            </div>

            {/* Access Patterns */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                {chartData.accessPatterns ? (
                    <BarChart
                        data={chartData.accessPatterns}
                        title="Daily Access Patterns (24-Hour View)"
                        stacked={true}
                    />
                ) : (
                    <div className="text-center py-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Daily Access Patterns (24-Hour View)</h3>
                        <p className="text-gray-500">No access logs available yet</p>
                    </div>
                )}
            </div>

            {/* Violation Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                {chartData.violationTrends ? (
                    <PieChart
                        data={chartData.violationTrends.labels.map((label, index) => ({
                            label: label,
                            value: chartData.violationTrends.datasets[0].data[index]
                        }))}
                        title="Violation Types Distribution"
                        colors={chartData.violationTrends.datasets[0].backgroundColor}
                    />
                ) : (
                    <div className="text-center py-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Violation Types Distribution</h3>
                        <p className="text-gray-500">No violation data available yet</p>
                    </div>
                )}
            </div>

            {/* Key Metrics Cards - Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Peak Hour - Entry */}
                <div className="bg-green-800 rounded-xl shadow-lg p-6 text-white" style={{ backgroundColor: '#355E3B' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Peak Hour - Entry</h3>
                            <p className="text-3xl font-bold">
                                {analyticsData?.peakHours?.entry?.formatted || 'No access logs yet'}
                            </p>
                            <p className="text-sm opacity-80">Most entries</p>
                        </div>
                        <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Peak Hour - Exit */}
                <div className="bg-yellow-600 rounded-xl shadow-lg p-6 text-white" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Peak Hour - Exit</h3>
                            <p className="text-3xl font-bold">
                                {analyticsData?.peakHours?.exit?.formatted || 'No access logs yet'}
                            </p>
                            <p className="text-sm opacity-80">Most exits</p>
                        </div>
                        <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Active Users */}
                <div className="bg-blue-500 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Active Users</h3>
                            <p className="text-3xl font-bold">{analyticsData?.activeUsers || 0}</p>
                            <p className="text-sm opacity-80">Last 30 days</p>
                        </div>
                        <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Avg. Daily Access */}
                <div className="bg-red-500 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Avg. Daily Access</h3>
                            <p className="text-3xl font-bold">
                                {analyticsData?.avgDailyAccess !== undefined ? analyticsData.avgDailyAccess : 0}
                            </p>
                            <p className="text-sm opacity-80">Last 30 days</p>
                        </div>
                        <div className="h-12 w-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}