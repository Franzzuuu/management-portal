'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import BackButton from '../../../components/BackButton';

export default function DownloadAccessLogs() {
    const [user, setUser] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const router = useRouter();

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

    const handleDownloadPDF = async () => {
        if (!dateRange.startDate || !dateRange.endDate) {
            setMessage({ type: 'error', text: 'Please select both start and end dates.' });
            return;
        }

        if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
            setMessage({ type: 'error', text: 'Start date cannot be after end date.' });
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
                            <div className="max-w-md mx-auto">
                                {/* Date Range Form */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.startDate}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 font-medium transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.endDate}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 font-medium transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex">
                                        <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-800 mb-1">What&apos;s included in your PDF:</h4>
                                            <ul className="text-sm text-blue-700 space-y-1">
                                                <li>• Date and time of each access</li>
                                                <li>• Vehicle information (plate number, make, model)</li>
                                                <li>• Entry type (entry/exit)</li>
                                                <li>• Gate location</li>
                                                <li>• Summary statistics</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                                    <button
                                        onClick={() => router.back()}
                                        className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                                        disabled={downloading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={downloading || !dateRange.startDate || !dateRange.endDate}
                                        className="flex-1 px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
                                        style={{ backgroundColor: downloading ? '#6B7280' : '#355E3B' }}
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
                                                Download PDF Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}