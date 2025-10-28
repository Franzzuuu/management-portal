'use client';

import { useState, useEffect } from 'react';
import PieChart from './charts/PieChart';
import LineChart from './charts/LineChart';
import { DATE_PRESETS, getDateRange, formatDateLabel } from '@/lib/date-filters';

export default function DashboardAnalytics({ reportData, dateRange }) {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPreset, setSelectedPreset] = useState(DATE_PRESETS.LAST_30_DAYS);
    const [chartData, setChartData] = useState({
        userDistribution: [],
        vehicleDistribution: [],
        accessPatterns: null
    });

    // Fetch real analytics data
    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                setLoading(true);

                // Get date range for selected preset
                const { start, end } = getDateRange(selectedPreset);

                // Build URL with date parameters
                let url = '/api/analytics';
                const params = new URLSearchParams();
                if (start && end) {
                    params.append('start_date', start);
                    params.append('end_date', end);
                }
                if (params.toString()) {
                    url += '?' + params.toString();
                }

                const response = await fetch(url);
                const data = await response.json();

                if (data.success) {
                    setAnalyticsData(data);

                    // Define color mapping for user designations
                    const designationColors = {
                        'Faculty': '#4E7D57',    // Green as specified
                        'Student': '#355E3B',    // Dark Green
                        'Admin': '#FFD700',      // Gold
                        'Security': '#4F81BD',   // Blue
                        'Staff': '#F79646',      // Orange
                        'Unknown': '#95A5A6'     // Gray
                    };

                    // Process chart data using new API structure
                    const userDistribution = data.userDistribution?.map(item => ({
                        label: item.designation || 'Unknown',
                        value: parseInt(item.total_users) || 0,
                        color: designationColors[item.designation || 'Unknown'] || designationColors['Unknown']
                    })).filter(item => item.value > 0) || [];

                    const vehicleDistribution = data.vehicleDistribution?.map(item => ({
                        label: item.vehicle_type || 'Unknown',
                        value: parseInt(item.count) || 0
                    })).filter(item => item.value > 0) || [];

                    // Generate charts from real analytics data
                    const accessPatterns = generateAccessPatterns(data);

                    setChartData({
                        userDistribution,
                        vehicleDistribution,
                        accessPatterns
                    });
                }
            } catch (error) {
                console.error('Failed to fetch analytics data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalyticsData();
    }, [selectedPreset]);

    const generateAccessPatterns = (data) => {
        if (!data?.accessPatterns?.length) return null;

        // Access patterns should already be in correct order (00:00-23:00)
        // Build labels and data arrays directly without sorting to maintain order
        const labels = data.accessPatterns.map(item => item.hour_label);
        const entryData = data.accessPatterns.map(item => parseInt(item.entry_count) || 0);
        const exitData = data.accessPatterns.map(item => parseInt(item.exit_count) || 0);

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Entries',
                    data: entryData,
                    borderColor: '#355E3B',
                    backgroundColor: 'rgba(53, 94, 59, 0.1)',
                    tension: 0.1
                },
                {
                    label: 'Exits',
                    data: exitData,
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    tension: 0.1
                }
            ]
        };
    };

    // Helper function to format peak hour time labels
    const formatPeakHourLabel = (peakHourData) => {
        if (!peakHourData) return 'No data';
        return peakHourData.hour_label ?? 'No data';
    };

    return (
        <div className="space-y-8">
            {/* Quick Filters */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Time Period</h3>
                <div className="flex flex-wrap gap-2">
                    {Object.values(DATE_PRESETS).map((preset) => (
                        <button
                            key={preset}
                            onClick={() => setSelectedPreset(preset)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPreset === preset
                                ? 'bg-[#355E3B] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {formatDateLabel(preset)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Distribution by Designation */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">User Distribution by Designation</h3>
                    {chartData.userDistribution.length > 0 ? (
                        <PieChart
                            data={chartData.userDistribution}
                            title=""
                            colors={chartData.userDistribution.map(item => item.color)}
                        />
                    ) : (
                        <div className="text-center py-8">
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

            {/* Daily Access Patterns */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                {chartData.accessPatterns ? (
                    <LineChart
                        data={chartData.accessPatterns}
                        title="Daily Access Patterns"
                        colors={['#355E3B', '#FFD700']}
                    />
                ) : (
                    <div className="text-center py-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Daily Access Patterns</h3>
                        <p className="text-gray-500">No access logs available yet</p>
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
                                {formatPeakHourLabel(analyticsData?.peakHours?.entry)}
                            </p>
                            <p className="text-sm opacity-80">Most entries</p>
                        </div>
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3EC]">
                            <svg className="h-6 w-6 text-[#355E3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </span>
                    </div>
                </div>

                {/* Peak Hour - Exit */}
                <div className="bg-yellow-600 rounded-xl shadow-lg p-6 text-white" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Peak Hour - Exit</h3>
                            <p className="text-3xl font-bold">
                                {formatPeakHourLabel(analyticsData?.peakHours?.exit)}
                            </p>
                            <p className="text-sm opacity-80">Most exits</p>
                        </div>
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#355E3B] bg-opacity-20">
                            <svg className="h-6 w-6 text-[#355E3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </span>
                    </div>
                </div>

                {/* Active Users */}
                <div className="bg-blue-500 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Active Users</h3>
                            <p className="text-3xl font-bold">{analyticsData?.activeUsers || 0}</p>
                            <p className="text-sm opacity-80">Current period</p>
                        </div>
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white bg-opacity-20">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </span>
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
                            <p className="text-sm opacity-80">Current period</p>
                        </div>
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white bg-opacity-20">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 712-2h2a2 2 0 712 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 712-2h2a2 2 0 712 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}