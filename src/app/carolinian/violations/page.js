'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';

export default function CarolinianViolations() {
    const [user, setUser] = useState(null);
    const [violations, setViolations] = useState([]);
    const [activeTab, setActiveTab] = useState('current');
    const [loading, setLoading] = useState(true);
    const [contestModal, setContestModal] = useState({ open: false, violation: null });
    const [contestForm, setContestForm] = useState({
        explanation: '',
        evidence_files: []
    });
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    const fetchUserData = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const sessionData = await response.json();
                setUser(sessionData.user);
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            router.push('/login');
        }
    }, [router]);

    const fetchViolations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/carolinian/violations?view=${activeTab}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Violations data:', data.violations); // Debug log
                setViolations(data.violations || []);
            }
        } catch (error) {
            console.error('Failed to fetch violations:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchUserData();
        fetchViolations();
    }, [fetchUserData, fetchViolations]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const openContestModal = (violation) => {
        setContestModal({ open: true, violation });
        setContestForm({ explanation: '', evidence_files: [] });
    };

    const closeContestModal = () => {
        setContestModal({ open: false, violation: null });
        setContestForm({ explanation: '', evidence_files: [] });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes

        // Only allow 1 file
        if (files.length > 1) {
            alert('You can only upload 1 file. Please select a single file.');
            e.target.value = ''; // Reset the input
            return;
        }

        // Check if a file is already uploaded
        if (contestForm.evidence_files.length >= 1) {
            alert('You can only upload 1 file. Please remove the existing file first.');
            e.target.value = ''; // Reset the input
            return;
        }

        const file = files[0];
        if (!file) return;

        if (file.size > maxSize) {
            alert(`The file "${file.name}" exceeds the 5MB limit and was not added.`);
            e.target.value = ''; // Reset the input
            return;
        }

        setContestForm(prev => ({ ...prev, evidence_files: [file] }));
        e.target.value = ''; // Reset the input for future uploads
    };

    const removeFile = (indexToRemove) => {
        setContestForm(prev => ({
            ...prev,
            evidence_files: prev.evidence_files.filter((_, index) => index !== indexToRemove)
        }));
    };

    const submitContest = async () => {
        if (!contestForm.explanation.trim()) {
            alert('Please provide an explanation for your appeal.');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('violationId', contestModal.violation.id);
            formData.append('explanation', contestForm.explanation);

            contestForm.evidence_files.forEach((file, index) => {
                formData.append(`evidence_${index}`, file);
            });

            const response = await fetch('/api/carolinian/contest-violation', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Appeal submitted successfully!');
                closeContestModal();
                fetchViolations();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to submit appeal');
            }
        } catch (error) {
            console.error('Contest submission error:', error);
            alert('Failed to submit appeal');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status, contestStatus) => {
        // If appeal is approved, show as resolved/dismissed regardless of original status
        if (contestStatus === 'approved') {
            return 'bg-green-50 text-green-800 border-green-200';
        }

        // If appeal is denied, show as resolved but with different color to indicate it stands
        if (contestStatus === 'denied') {
            return 'bg-orange-50 text-orange-800 border-orange-200';
        }

        switch (status) {
            case 'pending': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
            case 'contested': return 'bg-blue-50 text-blue-800 border-blue-200';
            case 'resolved': return 'bg-green-50 text-green-800 border-green-200';
            case 'closed': return 'bg-gray-50 text-gray-600 border-gray-300';
            case 'rejected': return 'bg-red-50 text-red-800 border-red-200';
            default: return 'bg-gray-50 text-gray-800 border-gray-200';
        }
    };

    const getContestStatusColor = (contestStatus) => {
        switch (contestStatus) {
            case 'pending': return 'bg-blue-50 text-blue-800 border-blue-200';
            case 'approved': return 'bg-green-50 text-green-800 border-green-200';
            case 'denied': return 'bg-red-50 text-red-800 border-red-200';
            default: return 'bg-gray-50 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#355E3B' }}></div>
                    <p className="mt-4 text-gray-600">Loading violations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Dashboard" fallbackPath="/carolinian" />
                </div>

                {/* Page Header with Tabs */}
                <div className="mb-8 p-4 sm:p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Violation Management</h2>
                            <p className="text-sm sm:text-base text-green-100">View and contest your traffic violations</p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-green-950 bg-opacity-30 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('current')}
                                className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 hover:cursor-pointer whitespace-nowrap ${activeTab === 'current'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'current' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                <span className="sm:hidden">Current</span>
                                <span className="hidden sm:inline">Current Violations</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 hover:cursor-pointer whitespace-nowrap ${activeTab === 'history'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'history' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                History
                            </button>
                            <button
                                onClick={() => setActiveTab('appeals')}
                                className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 hover:cursor-pointer whitespace-nowrap ${activeTab === 'appeals'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'appeals' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                <span className="sm:hidden">Appeals</span>
                                <span className="hidden sm:inline">My Appeals</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Violations List */}
                <div className="bg-gray-100 rounded-xl shadow-lg">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-base sm:text-lg font-semibold text-white">
                            {activeTab === 'current' && 'Current Violations'}
                            {activeTab === 'history' && 'Violation History'}
                            {activeTab === 'appeals' && 'Appeal Status'}
                        </h3>
                        <p className="text-xs sm:text-sm" style={{ color: '#FFD700' }}>
                            {activeTab === 'current' && 'Violations that require your attention'}
                            {activeTab === 'history' && 'Complete record of all violations'}
                            {activeTab === 'appeals' && 'Track the status of your contest submissions'}
                        </p>
                    </div>

                    <div className="p-4 sm:p-6">
                        {violations.length > 0 ? (
                            <div className="space-y-4 sm:space-y-6">
                                {violations.map((violation) => (
                                    <div key={violation.id} className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                        {/* Violation Header */}
                                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                                            <div className="flex flex-col space-y-3">
                                                <div className="flex items-start space-x-3">
                                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#355E3B' }}>
                                                        <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{violation.violation_type}</h3>
                                                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                            Vehicle: <span className="font-medium text-gray-900">{violation.plate_number}</span>
                                                            <span className="mx-1 sm:mx-2">•</span>
                                                            <span className="hidden sm:inline">{violation.vehicle_make} {violation.vehicle_model}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full border ${getStatusColor(violation.status, violation.contest_status)}`}>
                                                            <div className={`w-2 h-2 rounded-full mr-1 sm:mr-2 flex-shrink-0 ${violation.contest_status === 'approved' ? 'bg-green-400' :
                                                                violation.contest_status === 'denied' ? 'bg-orange-400' :
                                                                    violation.status === 'pending' ? 'bg-yellow-400' :
                                                                        violation.status === 'contested' ? 'bg-blue-400' :
                                                                            violation.status === 'resolved' ? 'bg-green-400' :
                                                                                violation.status === 'closed' ? 'bg-gray-400' : 'bg-red-400'
                                                                }`}></div>
                                                            <span className="truncate">
                                                                {violation.contest_status === 'approved' ? 'Dismissed' :
                                                                    violation.contest_status === 'denied' ? 'Stands' :
                                                                        violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                                                            </span>
                                                        </span>
                                                        {violation.contest_status && violation.contest_status !== 'approved' && (
                                                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full border ${getContestStatusColor(violation.contest_status)}`}>
                                                                <div className={`w-2 h-2 rounded-full mr-1 sm:mr-2 flex-shrink-0 ${violation.contest_status === 'pending' ? 'bg-blue-400' :
                                                                    violation.contest_status === 'approved' ? 'bg-green-400' : 'bg-red-400'
                                                                    }`}></div>
                                                                <span className="truncate">Appeal: {violation.contest_status.charAt(0).toUpperCase() + violation.contest_status.slice(1)}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-gray-500">
                                                        {new Date(violation.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })} at {new Date(violation.created_at).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Violation Details */}
                                        <div className="px-4 sm:px-6 py-3 sm:py-4">
                                            <div className="grid grid-cols-1 gap-4 sm:gap-6">
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Description</h4>
                                                        <p className="mt-1 text-gray-900">
                                                            {violation.description || 'No additional details provided'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Location</h4>
                                                        <div className="mt-1 flex items-center text-gray-900">
                                                            <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            {violation.location || 'USC Campus'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Actions</h4>
                                                        <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-2">
                                                            {violation.has_image && (
                                                                <button
                                                                    onClick={() => window.open(`/api/violations/view-image/${violation.id}`, '_blank')}
                                                                    className="inline-flex items-center justify-center sm:justify-start px-3 py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 hover:cursor-pointer"
                                                                >
                                                                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <span>View Evidence</span>
                                                                </button>
                                                            )}
                                                            {violation.status === 'pending' && !violation.contest_status && (
                                                                <button
                                                                    onClick={() => openContestModal(violation)}
                                                                    className="inline-flex items-center justify-center sm:justify-start px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:cursor-pointer transform hover:scale-105"
                                                                    style={{ backgroundColor: '#355E3B' }}
                                                                >
                                                                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                    <span>Submit Appeal</span>
                                                                </button>
                                                            )}
                                                            {violation.contest_status === 'pending' && (
                                                                <div className="inline-flex items-center justify-center sm:justify-start px-3 py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
                                                                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <span className="truncate">Appeal Under Review</span>
                                                                </div>
                                                            )}
                                                            {violation.contest_status === 'approved' && (
                                                                <div className="inline-flex items-center justify-center sm:justify-start px-3 py-2 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                                                                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    <span className="truncate">Appeal Approved - Dismissed</span>
                                                                </div>
                                                            )}
                                                            {violation.contest_status === 'denied' && (
                                                                <div className="inline-flex items-center justify-center sm:justify-start px-3 py-2 text-xs sm:text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg">
                                                                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                                    </svg>
                                                                    <span className="truncate">Appeal Denied - Stands</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Admin Review Notes Section */}
                                        {violation.admin_review_notes && (violation.contest_status === 'approved' || violation.contest_status === 'denied') && (
                                            <div className="mx-4 sm:mx-6 mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                                                <div className="flex items-start space-x-2 sm:space-x-3">
                                                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                        <svg className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm sm:text-base font-semibold text-blue-900 mb-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                                                            <span>Admin Review Notes</span>
                                                            {violation.appeal_reviewed_at && (
                                                                <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block sm:ml-2">
                                                                    Reviewed {new Date(violation.appeal_reviewed_at).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    })}
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <div className="text-xs sm:text-sm text-blue-800 bg-gray-50 bg-opacity-70 p-2 sm:p-3 rounded-lg border border-blue-100 leading-relaxed break-words">
                                                            {violation.admin_review_notes}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f0f9ff' }}>
                                    <svg className="h-12 w-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {activeTab === 'current' && 'No Current Violations! 🎉'}
                                    {activeTab === 'history' && 'Clean Driving Record 📋'}
                                    {activeTab === 'appeals' && 'No Appeals Yet 📝'}
                                </h3>
                                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                                    {activeTab === 'current' && 'Excellent! You currently have no outstanding violations. Keep up the good driving behavior on campus.'}
                                    {activeTab === 'history' && 'You have a perfect record with no traffic violations. Way to go with safe and responsible driving!'}
                                    {activeTab === 'appeals' && 'You haven\'t submitted any violation appeals yet. If you receive a violation you believe is incorrect, you can contest it here.'}
                                </p>
                                {activeTab === 'current' && (
                                    <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        All Clear
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Contest Modal */}
            {contestModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto p-4">
                    <div className="relative bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">Submit Violation Appeal</h3>
                                        <p className="text-sm text-gray-500">Contest this violation with supporting evidence</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeContestModal}
                                    className="text-gray-400 hover:text-gray-600 hover:cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                                >
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Violation Summary Card */}
                            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl">
                                <div className="flex items-start space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-red-900 mb-2">Violation Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-2">
                                                <div className="flex items-center">
                                                    <span className="text-red-600 font-medium w-20">Type:</span>
                                                    <span className="text-red-800">{contestModal.violation.violation_type}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="text-red-600 font-medium w-20">Vehicle:</span>
                                                    <span className="text-red-800">{contestModal.violation.plate_number}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center">
                                                    <span className="text-red-600 font-medium w-20">Date:</span>
                                                    <span className="text-red-800">
                                                        {new Date(contestModal.violation.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="text-red-600 font-medium w-20">Location:</span>
                                                    <span className="text-red-800">{contestModal.violation.location || 'USC Campus'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Appeal Form */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                                        <span className="flex items-center">
                                            <svg className="h-4 w-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
                                            </svg>
                                            Your Explanation
                                            <span className="text-red-500 ml-1">*</span>
                                        </span>
                                    </label>
                                    <textarea
                                        value={contestForm.explanation}
                                        onChange={(e) => setContestForm(prev => ({ ...prev, explanation: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200 bg-gray-50 text-gray-900 placeholder-gray-500 shadow-sm hover:border-gray-400"
                                        rows={6}
                                        placeholder="Please provide a detailed explanation of why you believe this violation should be dismissed. Include specific circumstances, timing, or any relevant context that supports your appeal..."
                                        style={{
                                            fontSize: '14px',
                                            lineHeight: '1.5',
                                            fontFamily: 'inherit'
                                        }}
                                        required
                                    />
                                    <div className="mt-2 flex items-center text-xs text-gray-500">
                                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Be specific and honest. Clear explanations have better chances of approval.
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                                        <span className="flex items-center">
                                            <svg className="h-4 w-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 00-2.828-2.828z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Supporting Evidence
                                            <span className="text-gray-400 ml-2 font-normal">(Optional)</span>
                                        </span>
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors duration-200">
                                        <input
                                            type="file"
                                            accept="image/*,.pdf,.doc,.docx"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="evidence-upload"
                                        />
                                        <label htmlFor="evidence-upload" className="cursor-pointer">
                                            <div className="flex flex-col items-center">
                                                <svg className="h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <p className="text-gray-600 font-medium">Click to upload a file</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Images, PDF, Word documents • 1 file only • Max 5MB
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {contestForm.evidence_files.length > 0 && (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                            <p className="text-sm font-medium text-blue-900 mb-3">Selected File:</p>
                                            <ul className="space-y-2">
                                                {contestForm.evidence_files.map((file, index) => (
                                                    <li key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded-lg border border-blue-100">
                                                        <div className="flex items-center">
                                                            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                                                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFile(index)}
                                                            className="ml-3 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                            title="Remove file"
                                                            type="button"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0 mt-8 pt-6 border-t border-gray-200">
                                <button
                                    onClick={closeContestModal}
                                    className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition-all duration-200 hover:cursor-pointer font-medium"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitContest}
                                    disabled={submitting || !contestForm.explanation.trim()}
                                    className="w-full sm:w-auto px-6 py-3 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting Appeal...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center">
                                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Submit Appeal
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}