'use client';

import { useState, useEffect } from 'react';

export default function RealtimeStatus({
    isConnected = false,
    lastUpdate = null,
    autoRefresh = false,
    nextRefresh = null
}) {
    const [timeAgo, setTimeAgo] = useState('');
    const [timeToNext, setTimeToNext] = useState('');

    useEffect(() => {
        const updateTimestamps = () => {
            if (lastUpdate) {
                const now = new Date();
                const last = new Date(lastUpdate);
                const diffMs = now - last;
                const diffSecs = Math.floor(diffMs / 1000);
                const diffMins = Math.floor(diffSecs / 60);
                const diffHours = Math.floor(diffMins / 60);

                if (diffSecs < 60) {
                    setTimeAgo(`${diffSecs}s ago`);
                } else if (diffMins < 60) {
                    setTimeAgo(`${diffMins}m ago`);
                } else {
                    setTimeAgo(`${diffHours}h ago`);
                }
            }

            if (autoRefresh && nextRefresh) {
                const now = new Date();
                const next = new Date(nextRefresh);
                const diffMs = next - now;
                const diffSecs = Math.max(0, Math.floor(diffMs / 1000));

                if (diffSecs > 0) {
                    setTimeToNext(`${diffSecs}s`);
                } else {
                    setTimeToNext('Refreshing...');
                }
            }
        };

        updateTimestamps();
        const interval = setInterval(updateTimestamps, 1000);

        return () => clearInterval(interval);
    }, [lastUpdate, autoRefresh, nextRefresh]);

    return (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm">
            <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-gray-600">
                        {isConnected ? 'Connected' : 'Offline'}
                    </span>
                </div>

                {/* Last Update */}
                {lastUpdate && (
                    <div className="flex items-center space-x-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-600">
                            Last updated {timeAgo}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-4">
                {/* Auto-refresh Status */}
                {autoRefresh && (
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                            <svg className="h-4 w-4 text-green-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-green-600 font-medium">Auto-refresh</span>
                        </div>
                        {nextRefresh && (
                            <span className="text-gray-500">
                                Next: {timeToNext}
                            </span>
                        )}
                    </div>
                )}

                {/* Manual refresh indicator */}
                {!autoRefresh && (
                    <div className="flex items-center space-x-1">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                        <span className="text-gray-500">Manual refresh</span>
                    </div>
                )}
            </div>
        </div>
    );
}