'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import BackButton from '../../../components/BackButton';

// Date utility functions (using native Date instead of date-fns for simplicity)
const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
};

const getQuickSelectRanges = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
        'Last 7 Days': { start: sevenDaysAgo, end: today },
        'Last 30 Days': { start: thirtyDaysAgo, end: today },
        'This Month': { start: thisMonthStart, end: today },
        'Last Month': { start: lastMonthStart, end: lastMonthEnd }
    };
};

export default function DownloadAccessLogs() {
    const [user, setUser] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [dateError, setDateError] = useState('');
    const router = useRouter();

    const quickSelectRanges = getQuickSelectRanges();
    const today = formatDateForInput(new Date());

    // Initialize date range to current month
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        setDateRange({
            startDate: firstDay.toISOString().split('T')[0],
            endDate: lastDay.toISOString().split('T')[0]
        });
    }, []);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setUser(data.user);
                    } else {
                        router.push('/login');
                    }
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Failed to fetch user data:', error);
                router.push('/login');
            }
        };

        fetchUserData();
    }, [router]);

    // Auto-clear message
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message.text]);

    // Validate date range
    useEffect(() => {
        if (dateRange.startDate && dateRange.endDate) {
            if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
                setDateError('Start date cannot be after end date');
            } else {
                setDateError('');
            }
        } else {
            setDateError('');
        }
    }, [dateRange.startDate, dateRange.endDate]);

    const handleQuickSelect = (label) => {
        const range = quickSelectRanges[label];
        setDateRange({
            startDate: formatDateForInput(range.start),
            endDate: formatDateForInput(range.end)
        });
    };

    const isValidDateRange = () => {
        return dateRange.startDate && 
               dateRange.endDate && 
               new Date(dateRange.startDate) <= new Date(dateRange.endDate);
    };

    const getButtonText = () => {
        if (downloading) return 'Generating PDF...';
        if (!dateRange.startDate || !dateRange.endDate) return 'Select Date Range';
        if (dateError) return 'Select Valid Dates';
        return 'Download PDF Report';
    };

    const handleDownloadPDF = async () => {
        if (!isValidDateRange()) {
            setMessage({ type: 'error', text: 'Please select a valid date range.' });
            return;
        }

        setDownloading(true);
        try {
            const response = await fetch('/api/carolinian/access-logs/download-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `vehicle-access-logs-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                setMessage({ type: 'success', text: 'PDF downloaded successfully! You can now go back to access logs.' });
            } else {
                const errorData = await response.json();
                setMessage({ type: 'error', text: errorData.error || 'Failed to generate PDF. Please try again.' });
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
        } finally {
            setDownloading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div 
            className="min-h-screen bg-cover bg-center bg-no-repeat relative"
            style={{ backgroundImage: 'url(/images/ismisbg.jpg)' }}
        >
            {/* Background overlay */}
            <div className="absolute inset-0 bg-white bg-opacity-90"></div>
            
            {/* Content */}
            <div className="relative z-10 min-h-screen">
                <Header user={user} onLogout={handleLogout} />

                {/* Toast Message */}
                {message.text && (
                    <div className="fixed top-4 right-4 z-50">
                        <div className={`px-6 py-3 rounded-lg shadow-lg border-l-4 max-w-sm transform transition-all duration-300 ${
                            message.type === 'success' 
                                ? 'bg-green-50 border-green-400 text-green-700' 
                                : 'bg-red-50 border-red-400 text-red-700'
                        }`}>
                            <div className="flex items-center">
                                {message.type === 'success' ? (
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                )}
                                <span className="font-medium">{message.text}</span>
                                <button
                                    onClick={() => setMessage({ type: '', text: '' })}
                                    className="ml-3 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {/* Navigation */}
                    <div className="mb-6">
                        <BackButton text="Back to Access Logs" />
                    </div>

                    {/* Download Card */}
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-200" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <div className="flex items-center">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center mr-4" style={{ backgroundColor: '#FFD700' }}>
                                    <svg className="h-6 w-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">Download Access Logs</h1>
                                    <p className="text-green-100 mt-1">Export your vehicle access history to PDF</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="max-w-2xl mx-auto">
                                {/* Quick Select Chips */}
                                <div className="mb-8">
                                    <label className="block text-sm font-semibold text-gray-800 mb-4">
                                        Quick Select
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.keys(quickSelectRanges).map((label) => (
                                            <button
                                                key={label}
                                                onClick={() => handleQuickSelect(label)}
                                                className="px-4 py-2 rounded-full border-2 border-green-200 text-green-700 text-sm font-medium hover:bg-green-50 hover:border-green-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                                style={{
                                                    backgroundColor: 'rgba(53, 94, 59, 0.05)',
                                                    borderColor: '#355E3B'
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date Range Form */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-800 mb-3">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={dateRange.startDate}
                                                max={today}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900 font-medium transition-all ${
                                                    dateError && dateRange.startDate && dateRange.endDate
                                                        ? 'border-red-400 focus:border-red-400 focus:ring-red-500'
                                                        : 'border-gray-300 focus:border-green-500'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-800 mb-3">
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                value={dateRange.endDate}
                                                max={today}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900 font-medium transition-all ${
                                                    dateError && dateRange.startDate && dateRange.endDate
                                                        ? 'border-red-400 focus:border-red-400 focus:ring-red-500'
                                                        : 'border-gray-300 focus:border-green-500'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Error Message */}
                                    {dateError && (
                                        <div className="text-red-600 text-sm font-medium flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {dateError}
                                        </div>
                                    )}
                                </div>

                                {/* Info Box */}
                                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <h4 className="text-sm font-semibold text-blue-900 mb-2">What&apos;s included in your PDF report:</h4>
                                            <ul className="text-sm text-blue-800 space-y-1">
                                                <li className="flex items-center">
                                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></div>
                                                    Date and time of each access
                                                </li>
                                                <li className="flex items-center">
                                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></div>
                                                    Vehicle information (plate number, make, model)
                                                </li>
                                                <li className="flex items-center">
                                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></div>
                                                    Entry type (entry/exit) and location
                                                </li>
                                                <li className="flex items-center">
                                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></div>
                                                    Summary statistics and insights
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-8 space-y-4">
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={downloading || !isValidDateRange()}
                                        className="w-full px-6 py-4 rounded-xl text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                        style={{ 
                                            backgroundColor: downloading || !isValidDateRange() ? '#6B7280' : '#355E3B',
                                            background: !downloading && isValidDateRange() ? 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' : undefined
                                        }}
                                    >
                                        {downloading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                                                Generating PDF...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                {getButtonText()}
                                            </>
                                        )}  
                                    </button>
                                    
                                    <div className="text-center">
                                        <button
                                            onClick={() => router.back()}
                                            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200 underline-offset-4 hover:underline"
                                            disabled={downloading}
                                        >
                                            Cancel and go back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}