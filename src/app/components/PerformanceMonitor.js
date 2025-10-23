'use client';

import { useState, useEffect, useCallback } from 'react';

export default function PerformanceMonitor() {
    const [healthData, setHealthData] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('health');

    const fetchMonitoringData = useCallback(async () => {
        try {
            const response = await fetch(`/api/admin/monitoring?type=${activeTab}`);
            if (response.ok) {
                const data = await response.json();

                switch (activeTab) {
                    case 'health':
                        setHealthData(data.data);
                        break;
                    case 'metrics':
                        setMetrics(data.data);
                        break;
                    case 'alerts':
                        setAlerts(data.data.alerts);
                        break;
                }
            }
        } catch (error) {
            console.error('Failed to fetch monitoring data:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchMonitoringData();

        // Set up auto-refresh every 30 seconds
        const interval = setInterval(fetchMonitoringData, 30000);
        return () => clearInterval(interval);
    }, [fetchMonitoringData]);

    const resolveAlert = async (alertId) => {
        try {
            const response = await fetch('/api/admin/monitoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resolve_alert',
                    alertId: alertId
                })
            });

            if (response.ok) {
                fetchMonitoringData();
            }
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const getHealthStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'critical': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'error': return 'text-red-600 bg-red-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'info': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                <h3 className="text-lg font-semibold text-white">System Performance Monitor</h3>
                <p className="text-sm" style={{ color: '#FFD700' }}>Real-time system health and performance metrics</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex">
                    {[
                        { key: 'health', label: 'Health Status' },
                        { key: 'metrics', label: 'Metrics' },
                        { key: 'alerts', label: 'Alerts' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === tab.key
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <span className="ml-2 text-gray-600">Loading monitoring data...</span>
                    </div>
                ) : (
                    <>
                        {/* Health Status Tab */}
                        {activeTab === 'health' && healthData && (
                            <div className="space-y-6">
                                {/* Overall Health */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900">System Health</h4>
                                        <p className="text-sm text-gray-600">Score: {Math.round(healthData.health_score * 100)}%</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(healthData.status)}`}>
                                        {healthData.status.toUpperCase()}
                                    </span>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="text-sm font-medium text-gray-600">Queue Size</div>
                                        <div className="text-2xl font-bold text-gray-900">{healthData.metrics.queue_size}</div>
                                        <div className="text-xs text-gray-500">Active jobs</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="text-sm font-medium text-gray-600">Error Rate</div>
                                        <div className="text-2xl font-bold text-gray-900">{Math.round(healthData.metrics.error_rate * 100)}%</div>
                                        <div className="text-xs text-gray-500">Last 24 hours</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="text-sm font-medium text-gray-600">Avg Processing</div>
                                        <div className="text-2xl font-bold text-gray-900">{Math.round(healthData.metrics.avg_processing_time_ms / 1000)}s</div>
                                        <div className="text-xs text-gray-500">Per job</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="text-sm font-medium text-gray-600">Active Alerts</div>
                                        <div className="text-2xl font-bold text-gray-900">{healthData.metrics.active_alerts}</div>
                                        <div className="text-xs text-gray-500">Unresolved</div>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {healthData.recommendations && healthData.recommendations.length > 0 && (
                                    <div>
                                        <h5 className="text-md font-semibold text-gray-900 mb-3">Recommendations</h5>
                                        <div className="space-y-2">
                                            {healthData.recommendations.map((rec, index) => (
                                                <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                                                    <div className="flex-shrink-0">
                                                        <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm text-blue-800">{rec.message}</div>
                                                        <div className="text-xs text-blue-600 mt-1">Priority: {rec.priority}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Metrics Tab */}
                        {activeTab === 'metrics' && metrics && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Export Jobs Metrics */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h5 className="text-md font-semibold text-gray-900 mb-3">Export Jobs (Last Hour)</h5>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Total:</span>
                                                <span className="text-sm font-medium">{metrics.export_jobs.total}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Successful:</span>
                                                <span className="text-sm font-medium text-green-600">{metrics.export_jobs.successful}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Failed:</span>
                                                <span className="text-sm font-medium text-red-600">{metrics.export_jobs.failed}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Avg Duration:</span>
                                                <span className="text-sm font-medium">{Math.round(metrics.export_jobs.avg_duration / 1000)}s</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* API Calls Metrics */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h5 className="text-md font-semibold text-gray-900 mb-3">API Calls (Last Hour)</h5>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Total:</span>
                                                <span className="text-sm font-medium">{metrics.api_calls.total}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Successful:</span>
                                                <span className="text-sm font-medium text-green-600">{metrics.api_calls.successful}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Failed:</span>
                                                <span className="text-sm font-medium text-red-600">{metrics.api_calls.failed}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Avg Duration:</span>
                                                <span className="text-sm font-medium">{metrics.api_calls.avg_duration}ms</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Alerts Tab */}
                        {activeTab === 'alerts' && (
                            <div className="space-y-4">
                                {alerts.length > 0 ? (
                                    alerts.map((alert, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                                        {alert.severity.toUpperCase()}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {new Date(alert.timestamp).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!alert.resolved && (
                                                    <button
                                                        onClick={() => resolveAlert(alert.timestamp.toString())}
                                                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                                                    >
                                                        Resolve
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p>No alerts in the last 24 hours</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}