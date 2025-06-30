// src/components/ViolationHistoryWidget.js
'use client';

import { useState, useEffect } from 'react';

export default function ViolationHistoryWidget() {
    const [stats, setStats] = useState({
        topViolators: [],
        recentActivity: [],
        summary: {
            totalUsers: 0,
            highRiskUsers: 0,
            totalViolations: 0,
            pendingViolations: 0
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadViolationStats();
    }, []);

    const loadViolationStats = async () => {
        try {
            const response = await fetch('/api/admin/violation-stats');
            const data = await response.json();

            if (data.topViolators) {
                setStats({
                    topViolators: data.topViolators.slice(0, 5),
                    summary: {
                        totalUsers: data.topViolators.length,
                        highRiskUsers: data.topViolators.filter(u => u.violation_count >= 5).length,
                        totalViolations: data.topViolators.reduce((sum, u) => sum + u.violation_count, 0),
                        pendingViolations: data.topViolators.reduce((sum, u) => sum + u.active_violations, 0)
                    }
                });
            }
        } catch (error) {
            console.error('Error loading violation stats:', error);
            // Fallback to empty data
            setStats({
                topViolators: [],
                summary: {
                    totalUsers: 0,
                    highRiskUsers: 0,
                    totalViolations: 0,
                    pendingViolations: 0
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const getRiskLevel = (violationCount) => {
        if (violationCount >= 5) return { level: 'High', color: 'red' };
        if (violationCount >= 2) return { level: 'Medium', color: 'yellow' };
        return { level: 'Low', color: 'green' };
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <h3 className="text-lg font-semibold text-white">Violation History Overview</h3>
                </div>
                <div className="p-6 flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                        <svg className="animate-spin h-5 w-5" style={{ color: '#355E3B' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-gray-600">Loading violation data...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                <h3 className="text-lg font-semibold text-white">Violation History Overview</h3>
                <p className="text-sm" style={{ color: '#FFD700' }}>Track user violation patterns and enforcement</p>
            </div>

            <div className="p-6">
                {/* Summary Statistics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.summary.totalUsers}</div>
                        <div className="text-xs text-blue-600">Users with Violations</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.summary.highRiskUsers}</div>
                        <div className="text-xs text-red-600">High Risk Users</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.summary.totalViolations}</div>
                        <div className="text-xs text-purple-600">Total Violations</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.summary.pendingViolations}</div>
                        <div className="text-xs text-yellow-600">Pending Actions</div>
                    </div>
                </div>

                {/* Top Violators */}
                <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Top Violators</h4>
                    {stats.topViolators.length > 0 ? (
                        <div className="space-y-2">
                            {stats.topViolators.map((violator, index) => {
                                const risk = getRiskLevel(violator.violation_count);
                                return (
                                    <div key={violator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-yellow-500' :
                                                index === 1 ? 'bg-gray-400' :
                                                    index === 2 ? 'bg-yellow-600' : 'bg-gray-500'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {violator.full_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {violator.designation}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${risk.color === 'red' ? 'bg-red-100 text-red-800' :
                                                risk.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                {risk.level}
                                            </span>
                                            <div className="text-right">
                                                <div className="text-sm font-bold" style={{ color: '#355E3B' }}>
                                                    {violator.violation_count}
                                                </div>
                                                {violator.active_violations > 0 && (
                                                    <div className="text-xs text-red-600">
                                                        {violator.active_violations} active
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">No violation data available</p>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-900">Quick Actions</h4>
                        <a
                            href="/admin/violations"
                            className="text-sm font-medium hover:underline"
                            style={{ color: '#355E3B' }}
                        >
                            View All →
                        </a>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={() => window.location.href = '/admin/violations?tab=history'}
                            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <svg className="h-4 w-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">View History</span>
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/violations?tab=statistics'}
                            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <svg className="h-4 w-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">View Analytics</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Additional utility component for user violation badge
export function UserViolationBadge({ violationCount, className = "" }) {
    const getRiskStyle = (count) => {
        if (count >= 5) return 'bg-red-100 text-red-800 border-red-200';
        if (count >= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (count > 0) return 'bg-orange-100 text-orange-800 border-orange-200';
        return 'bg-green-100 text-green-800 border-green-200';
    };

    if (violationCount === 0) return null;

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskStyle(violationCount)} ${className}`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {violationCount} violation{violationCount !== 1 ? 's' : ''}
        </span>
    );
}