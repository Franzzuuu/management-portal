'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import useSocketChannel from '@/hooks/useSocketChannel';
import { getRelativeTime } from '@/lib/client-utils';

const COLORS = {
    success: '#16a34a', // Green for success
    failure: '#dc2626'  // Red for failure
};

// Custom tooltip component with smart slice-aware positioning
const CustomTooltip = ({ active, payload, coordinate }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const value = data.value;
        const name = data.name;
        const total = data.payload.total;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        // Determine position based on slice name to avoid center obstruction
        let positionClass = "translate-x-3 -translate-y-12"; // Default position

        if (name === 'Success') {
            // For success slice (green), position to the right side to avoid center
            positionClass = "translate-x-16 -translate-y-6";
        } else if (name === 'Failure') {
            // For failure slice (red), position to the left side
            positionClass = "-translate-x-32 -translate-y-6";
        }

        return (
            <div className={`bg-white p-3 border border-gray-200 rounded-lg shadow-lg relative ${positionClass}`}>
                <p className="font-medium text-gray-900">{name}</p>
                <p className="text-sm text-gray-600">
                    {value.toLocaleString()} logs ({percentage}%)
                </p>
            </div>
        );
    }
    return null;
};

// Loading skeleton component
const LoadingSkeleton = () => (
    <div className="bg-white rounded-xl shadow-lg h-96">
        <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" style={{ width: '60%' }}></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: '40%' }}></div>
        </div>
        <div className="p-6 flex items-center justify-center h-80">
            <div className="relative">
                <div className="w-48 h-48 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    </div>
);

export default function AccessLogsSuccessPie() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatedAt, setGeneratedAt] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const debounceTimerRef = useRef(null);
    const lastUpdateRef = useRef(0);
    const componentRef = useRef(null);

    const fetchStats = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch('/api/access-logs/stats', { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                const { successCount, failureCount } = result.data;
                const total = successCount + failureCount;

                const chartData = [
                    {
                        name: 'Success',
                        value: successCount,
                        total,
                        color: COLORS.success
                    },
                    {
                        name: 'Failure',
                        value: failureCount,
                        total,
                        color: COLORS.failure
                    }
                ]; // Show all slices, even if value is 0

                console.log('API Response:', { successCount, failureCount, total });
                console.log('Chart Data:', chartData);
                setData(chartData);
                setGeneratedAt(result.generatedAt);

                // Simple update without pulsing animation
                lastUpdateRef.current = Date.now();
            } else {
                throw new Error(result.error || 'Failed to fetch access logs stats');
            }
        } catch (err) {
            console.error('Error fetching access logs stats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced refetch function
    const debouncedRefetch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            fetchStats();
        }, 300); // 300ms debounce
    }, [fetchStats]);

    // Real-time updates using existing socket system
    const { connected } = useSocketChannel('access_logs', {
        // Handle new access log updates
        update: (payload) => {
            if (payload && typeof payload.success !== 'undefined') {
                // Trigger subtle update animation
                setIsUpdating(true);
                setTimeout(() => setIsUpdating(false), 300);

                // Incrementally update in-memory counts if payload has success info
                setData(prevData => {
                    if (!prevData) return null;

                    const newData = [...prevData];
                    const successIndex = newData.findIndex(item => item.name === 'Success');
                    const failureIndex = newData.findIndex(item => item.name === 'Failure');

                    if (payload.success === 1 || payload.success === true) {
                        // Increment success count
                        if (successIndex >= 0) {
                            newData[successIndex].value += 1;
                            newData[successIndex].total += 1;
                        } else {
                            newData.push({
                                name: 'Success',
                                value: 1,
                                total: (prevData[0]?.total || 0) + 1,
                                color: COLORS.success
                            });
                        }

                        // Update total for failure item if it exists
                        if (failureIndex >= 0) {
                            newData[failureIndex].total += 1;
                        }
                    } else {
                        // Increment failure count
                        if (failureIndex >= 0) {
                            newData[failureIndex].value += 1;
                            newData[failureIndex].total += 1;
                        } else {
                            newData.push({
                                name: 'Failure',
                                value: 1,
                                total: (prevData[0]?.total || 0) + 1,
                                color: COLORS.failure
                            });
                        }

                        // Update total for success item if it exists
                        if (successIndex >= 0) {
                            newData[successIndex].total += 1;
                        }
                    }

                    return newData.filter(item => item.value > 0);
                });

                setGeneratedAt(new Date().toISOString());
            } else {
                // If no success info in payload, refetch with debounce
                debouncedRefetch();
            }
        },

        // Handle refresh events
        refresh: () => {
            debouncedRefetch();
        }
    }, {
        enablePollingFallback: true,
        pollFn: fetchStats,
        pollIntervalMs: 5000 // 5 second polling for fallback
    });

    // Initial data fetch
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Retry function for error state
    const handleRetry = () => {
        setError(null);
        setLoading(true);
        fetchStats();
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    return (
        <div
            ref={componentRef}
            className="bg-white rounded-xl shadow-lg h-full"
        >
            <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                <h2 className="text-xl font-semibold text-white">Access Log Success Rate</h2>
                <p className="text-sm" style={{ color: '#FFD700' }}>
                    Entry & exit success vs failure
                </p>
            </div>

            <div className="p-6 flex-1">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <svg className="h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-600 text-center mb-4">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="px-4 py-2 bg-[#355E3B] text-white rounded-lg hover:bg-[#2d4f32] transition-colors duration-200"
                        >
                            Try Again
                        </button>
                    </div>
                ) : !data || data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-gray-600 text-center">No access logs yet</p>
                        <p className="text-sm text-gray-400 text-center">Data will appear when entries are logged</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Chart with fixed height */}
                        <div style={{ width: '100%', height: '320px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={85}
                                        innerRadius={40}
                                        paddingAngle={2}
                                        dataKey="value"
                                        animationDuration={800}
                                        animationEasing="ease-out"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        wrapperStyle={{
                                            outline: 'none',
                                            pointerEvents: 'none'
                                        }}
                                        allowEscapeViewBox={{ x: false, y: false }}
                                        offset={10}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={40}
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center total */}
                            <div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                style={{ paddingBottom: '40px' }}
                            >
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-800">
                                        {data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Total</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}