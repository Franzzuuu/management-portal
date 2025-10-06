'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        fetchUserData();
        fetchViolations();
    }, [activeTab]);

    const fetchUserData = async () => {
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
    };

    const fetchViolations = async () => {
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
    };

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
        const validFiles = [];
        const rejectedFiles = [];

        files.forEach(file => {
            if (file.size <= maxSize) {
                validFiles.push(file);
            } else {
                rejectedFiles.push(file);
            }
        });

        if (rejectedFiles.length > 0) {
            const fileNames = rejectedFiles.map(f => f.name).join(', ');
            alert(`The following files exceed the 5MB limit and were not added: ${fileNames}`);
        }

        setContestForm(prev => ({ ...prev, evidence_files: validFiles }));
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

        switch (status) {
            case 'pending': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
            case 'contested': return 'bg-blue-50 text-blue-800 border-blue-200';
            case 'resolved': return 'bg-green-50 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-50 text-red-800 border-red-200';
            default: return 'bg-gray-50 text-gray-800 border-gray-200';
        }
    };

    const getContestStatusColor = (contestStatus) => {
        switch (contestStatus) {
            case 'pending': return 'bg-blue-50 text-blue-800 border-blue-200';
            case 'approved': return 'bg-green-50 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-50 text-red-800 border-red-200';
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
            {/* Header */}
            <header className="shadow-lg" style={{ backgroundColor: '#355E3B' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center py-4 px-6">
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">My Violations</h1>
                                <div className="flex items-center space-x-2 text-sm" style={{ color: '#FFD700' }}>
                                    <span>Dashboard</span>
                                    <span>›</span>
                                    <span>Violations</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/carolinian')}
                                className="text-white hover:text-yellow-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:cursor-pointer"
                            >
                                ← Back to Dashboard
                            </button>
                            <div className="text-right">
                                <div className="text-white font-medium">
                                    {user?.full_name || user?.username}
                                </div>
                                <div className="flex items-center justify-end mt-1">
                                    <span className="px-2 py-1 text-xs font-medium rounded-md" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                        {user?.designation}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md hover:shadow-lg hover:cursor-pointer"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Page Header with Tabs */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="mb-4 lg:mb-0">
                            <h2 className="text-3xl font-bold text-white mb-2">Violation Management</h2>
                            <p className="text-green-100">View and contest your traffic violations</p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-green-950 bg-opacity-30 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('current')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'current'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'current' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Current Violations
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'history'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'history' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                History
                            </button>
                            <button
                                onClick={() => setActiveTab('appeals')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:cursor-pointer ${activeTab === 'appeals'
                                    ? 'shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-green-700 hover:bg-opacity-40'
                                    }`}
                                style={activeTab === 'appeals' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                My Appeals
                            </button>
                        </div>
                    </div>
                </div>

                {/* Violations List */}
                <div className="bg-gray-100 rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <h3 className="text-lg font-semibold text-white">
                            {activeTab === 'current' && 'Current Violations'}
                            {activeTab === 'history' && 'Violation History'}
                            {activeTab === 'appeals' && 'Appeal Status'}
                        </h3>
                        <p className="text-sm" style={{ color: '#FFD700' }}>
                            {activeTab === 'current' && 'Violations that require your attention'}
                            {activeTab === 'history' && 'Complete record of all violations'}
                            {activeTab === 'appeals' && 'Track the status of your contest submissions'}
                        </p>
                    </div>

                    <div className="p-6">
                        {violations.length > 0 ? (
                            <div className="space-y-6">
                                {violations.map((violation) => (
                                    <div key={violation.id} className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                        {/* Violation Header */}
                                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 border-b border-gray-200">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">{violation.violation_type}</h3>
                                                        <p className="text-sm text-gray-600">
                                                            Vehicle: <span className="font-medium text-gray-900">{violation.plate_number}</span>
                                                            <span className="mx-2">•</span>
                                                            {violation.vehicle_make} {violation.vehicle_model}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 md:mt-0 flex flex-col md:items-end space-y-2">
                                                    <div className="flex space-x-2">
                                                        <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(violation.status, violation.contest_status)}`}>
                                                            <div className={`w-2 h-2 rounded-full mr-2 ${violation.contest_status === 'approved' ? 'bg-green-400' :
                                                                violation.status === 'pending' ? 'bg-yellow-400' :
                                                                    violation.status === 'contested' ? 'bg-blue-400' :
                                                                        violation.status === 'resolved' ? 'bg-green-400' : 'bg-red-400'
                                                                }`}></div>
                                                            {violation.contest_status === 'approved' ? 'Dismissed' :
                                                                violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                                                        </span>
                                                        {violation.contest_status && violation.contest_status !== 'approved' && (
                                                            <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${getContestStatusColor(violation.contest_status)}`}>
                                                                <div className={`w-2 h-2 rounded-full mr-2 ${violation.contest_status === 'pending' ? 'bg-blue-400' :
                                                                    violation.contest_status === 'approved' ? 'bg-green-400' : 'bg-red-400'
                                                                    }`}></div>
                                                                Appeal: {violation.contest_status.charAt(0).toUpperCase() + violation.contest_status.slice(1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(violation.created_at).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })} at {new Date(violation.created_at).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Violation Details */}
                                        <div className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Actions</h4>
                                                        <div className="mt-1 flex flex-wrap gap-2">
                                                            {violation.has_image && (
                                                                <button
                                                                    onClick={() => window.open(`/api/violations/view-image/${violation.id}`, '_blank')}
                                                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 hover:cursor-pointer"
                                                                >
                                                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    View Evidence
                                                                </button>
                                                            )}
                                                            {violation.status === 'pending' && !violation.contest_status && (
                                                                <button
                                                                    onClick={() => openContestModal(violation)}
                                                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:cursor-pointer transform hover:scale-105"
                                                                    style={{ backgroundColor: '#355E3B' }}
                                                                >
                                                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                    Submit Appeal
                                                                </button>
                                                            )}
                                                            {violation.contest_status === 'pending' && (
                                                                <div className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
                                                                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Appeal Under Review
                                                                </div>
                                                            )}
                                                            {violation.contest_status === 'approved' && (
                                                                <div className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                                                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    Appeal Approved - Violation Dismissed
                                                                </div>
                                                            )}
                                                            {violation.contest_status === 'rejected' && violation.status !== 'resolved' && (
                                                                <div className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                                                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                    Appeal Rejected
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Admin Review Notes Section */}
                                        {violation.admin_review_notes && (violation.contest_status === 'approved' || violation.contest_status === 'rejected') && (
                                            <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                                                <div className="flex items-start space-x-3">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                        <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                                                            Admin Review Notes
                                                            {violation.appeal_reviewed_at && (
                                                                <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                                                    Reviewed {new Date(violation.appeal_reviewed_at).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    })}
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <div className="text-sm text-blue-800 bg-gray-50 bg-opacity-70 p-3 rounded-lg border border-blue-100 leading-relaxed">
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
                <div
                    className="fixed inset-0 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
                    style={{
                        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/images/ismisbg.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                >
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
                                            multiple
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
                                                <p className="text-gray-600 font-medium">Click to upload files</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Images, PDF, Word documents • Max 5 files • 5MB each
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {contestForm.evidence_files.length > 0 && (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                            <p className="text-sm font-medium text-blue-900 mb-3">Selected Files ({contestForm.evidence_files.length}):</p>
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