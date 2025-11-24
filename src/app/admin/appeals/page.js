'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';

export default function ViolationAppealsPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('pending');
    const [stats, setStats] = useState({});
    const [selectedContest, setSelectedContest] = useState(null);
    const [reviewModal, setReviewModal] = useState({ open: false, contest: null });
    const [reviewForm, setReviewForm] = useState({ action: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [imagePreviewModal, setImagePreviewModal] = useState({ open: false, src: '', filename: '' });

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (data.success && data.user.designation === 'Admin') {
                setUser(data.user);
            } else {
                router.push('/login');
            }
        } catch (error) {
            router.push('/login');
        }
    }, [router]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const fetchContests = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/violation-contests?status=${selectedStatus}`);
            if (response.ok) {
                const data = await response.json();
                setContests(data.contests);
                setStats(data.stats);
            } else {
                console.error('Failed to fetch contests');
            }
        } catch (error) {
            console.error('Error fetching contests:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedStatus]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        fetchContests();
    }, [fetchContests]);

    // Handle escape key for image preview modal
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && imagePreviewModal.open) {
                closeImagePreview();
            }
        };

        if (imagePreviewModal.open) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [imagePreviewModal.open]);

    const openReviewModal = (contest) => {
        setReviewModal({ open: true, contest });
        setReviewForm({ action: '', notes: '' });
    };

    const closeReviewModal = () => {
        setReviewModal({ open: false, contest: null });
        setReviewForm({ action: '', notes: '' });
    };

    const openImagePreview = (src, filename) => {
        setImagePreviewModal({ open: true, src, filename });
    };

    const closeImagePreview = () => {
        setImagePreviewModal({ open: false, src: '', filename: '' });
    };

    const submitReview = async () => {
        if (!reviewForm.action) {
            alert('Please select an action.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/admin/violation-contests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contestId: reviewModal.contest.contest_id,
                    action: reviewForm.action,
                    reviewNotes: reviewForm.notes.trim() || null
                })
            });

            if (response.ok) {
                alert(`Appeal ${reviewForm.action}ed successfully!`);
                closeReviewModal();
                fetchContests();
            } else {
                const error = await response.json();
                console.error('API Error:', error);
                alert(error.error || error.message || 'Failed to process appeal');
            }
        } catch (error) {
            console.error('Review submission error:', error);
            alert('Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'under_review': return 'bg-blue-100 text-blue-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'denied': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>;
            case 'under_review':
                return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>;
            case 'approved':
                return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>;
            case 'denied':
                return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Dashboard" fallbackPath="/admin" />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
                                <div className="text-sm text-gray-500">Total Appeals</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                    <svg className="h-4 w-4" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">{stats.pending || 0}</div>
                                <div className="text-sm text-gray-500">Pending</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">{stats.under_review || 0}</div>
                                <div className="text-sm text-gray-500">Under Review</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">{stats.approved || 0}</div>
                                <div className="text-sm text-gray-500">Approved</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">{stats.denied || 0}</div>
                                <div className="text-sm text-gray-500">Denied</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center space-x-4">
                        <label className="text-sm font-medium text-gray-700">Filter by status:</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="pending">Pending Review</option>
                            <option value="active">Active Appeals</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="denied">Denied</option>
                            <option value="all">All Appeals</option>
                        </select>
                    </div>
                </div>

                {/* Appeals List */}
                <div className="bg-white shadow-lg rounded-lg border overflow-hidden" style={{ borderTopColor: '#355E3B', borderTopWidth: '4px' }}>
                    <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: 'rgba(53, 94, 59, 0.05)' }}>
                        <h3 className="text-lg font-bold" style={{ color: '#355E3B' }}>
                            Appeals {selectedStatus !== 'all' && `(${selectedStatus.replace('_', ' ')})`}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-gray-600">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading appeals...
                            </div>
                        </div>
                    ) : contests.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            No appeals found.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {contests.map((contest) => (
                                <div key={contest.contest_id} className="p-6 transition-all duration-300" style={{ borderLeft: '4px solid #355E3B' }}>
                                    <div className="bg-gray-50 hover:bg-gray-100 -m-6 p-6 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contest.contest_status)}`}>
                                                        {getStatusIcon(contest.contest_status)}
                                                        <span className="ml-1">{contest.contest_status.replace('_', ' ').toUpperCase()}</span>
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        Appeal #{contest.contest_id} • Violation #{contest.violation_id}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div className="bg-white border rounded-lg p-5" style={{ borderLeftColor: '#355E3B', borderLeftWidth: '3px' }}>
                                                        <div className="flex items-center mb-3">
                                                            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(53, 94, 59, 0.1)' }}>
                                                                <svg className="h-5 w-5" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                            </div>
                                                            <h4 className="text-lg font-semibold ml-3" style={{ color: '#355E3B' }}>Student Information</h4>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-blue-700 w-20">Name:</span>
                                                                <span className="text-sm text-blue-900 font-semibold">{contest.user_name || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-blue-700 w-20">USC ID:</span>
                                                                <span className="text-sm text-blue-900">{contest.usc_id}</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-blue-700 w-20">Email:</span>
                                                                <span className="text-sm text-blue-900">{contest.email}</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-blue-700 w-20">Role:</span>
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                                                    {contest.designation}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white border rounded-lg p-5" style={{ borderLeftColor: '#FFD700', borderLeftWidth: '3px' }}>
                                                        <div className="flex items-center mb-3">
                                                            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}>
                                                                <svg className="h-5 w-5" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                                </svg>
                                                            </div>
                                                            <h4 className="text-lg font-semibold ml-3" style={{ color: '#355E3B' }}>Violation Details</h4>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-orange-700 w-20">Type:</span>
                                                                <span className="text-sm text-orange-900 font-semibold">{contest.violation_type}</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-orange-700 w-20">Vehicle:</span>
                                                                <span className="text-sm text-orange-900">{contest.vehicle_info}</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-orange-700 w-20">Plate:</span>
                                                                <span className="text-sm text-orange-900 font-mono bg-orange-100 px-2 py-1 rounded">{contest.plate_number}</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-medium text-orange-700 w-20">Date:</span>
                                                                <span className="text-sm text-orange-900">{new Date(contest.violation_created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5">
                                                        <div className="flex items-center mb-3">
                                                            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <h4 className="text-lg font-semibold text-purple-900 ml-3">Appeal Explanation</h4>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                                                            <p className="text-gray-700 leading-relaxed">
                                                                {contest.contest_notes}
                                                            </p>
                                                        </div>
                                                        <div className="mt-3 flex items-center text-xs text-purple-600">
                                                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Submitted: {new Date(contest.contest_created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Evidence Files Section */}
                                                {contest.evidence_files && contest.evidence_files.length > 0 && (
                                                    <div className="mb-6">
                                                        <div className="bg-white border rounded-lg p-5" style={{ borderLeftColor: '#FFD700', borderLeftWidth: '3px' }}>
                                                            <div className="flex items-center mb-3">
                                                                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}>
                                                                    <svg className="h-5 w-5" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                    </svg>
                                                                </div>
                                                                <h4 className="text-lg font-semibold ml-3" style={{ color: '#355E3B' }}>Evidence Files ({contest.evidence_files.length})</h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {contest.evidence_files.map((file, index) => (
                                                                    <div key={file.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                                        <div className="flex items-center space-x-3">
                                                                            <div className="flex-shrink-0">
                                                                                {file.mime_type.startsWith('image/') ? (
                                                                                    <div className="w-16 h-16 rounded-lg overflow-hidden border">
                                                                                        <Image
                                                                                            src={`data:${file.mime_type};base64,${file.file_data}`}
                                                                                            alt={file.filename}
                                                                                            width={64}
                                                                                            height={64}
                                                                                            className="w-full h-full object-cover cursor-pointer"
                                                                                            onClick={() => openImagePreview(`data:${file.mime_type};base64,${file.file_data}`, file.filename)}
                                                                                            style={{ cursor: 'pointer' }}
                                                                                        />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="w-16 h-16 rounded-lg border flex items-center justify-center" style={{ backgroundColor: 'rgba(53, 94, 59, 0.1)' }}>
                                                                                        <svg className="h-8 w-8" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                                                    {file.filename}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500">
                                                                                    {file.mime_type}
                                                                                </p>
                                                                                <p className="text-xs text-gray-400">
                                                                                    {new Date(file.uploaded_at).toLocaleDateString()}
                                                                                </p>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const link = document.createElement('a');
                                                                                    link.href = `data:${file.mime_type};base64,${file.file_data}`;
                                                                                    link.download = file.filename;
                                                                                    document.body.appendChild(link);
                                                                                    link.click();
                                                                                    document.body.removeChild(link);
                                                                                }}
                                                                                className="p-2 rounded-lg border hover:bg-gray-100 transition-colors"
                                                                                title="Download file"
                                                                            >
                                                                                <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {contest.review_notes && (
                                                    <div className="mb-6">
                                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5">
                                                            <div className="flex items-center mb-3">
                                                                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                                                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </div>
                                                                <h4 className="text-lg font-semibold text-green-900 ml-3">Review Notes</h4>
                                                            </div>
                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                                                                <p className="text-gray-700 leading-relaxed">
                                                                    {contest.review_notes}
                                                                </p>
                                                            </div>
                                                            <div className="mt-3 flex items-center text-xs text-green-600">
                                                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                                Reviewed by {contest.reviewed_by_email} on {new Date(contest.reviewed_at).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-center">
                                                        <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Submitted: {new Date(contest.contest_created_at).toLocaleString()}
                                                    </div>
                                                    {contest.reviewed_at && (
                                                        <div className="flex items-center">
                                                            <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Reviewed: {new Date(contest.reviewed_at).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="ml-6 flex-shrink-0">
                                                {contest.contest_status === 'pending' || contest.contest_status === 'under_review' ? (
                                                    <button
                                                        onClick={() => openReviewModal(contest)}
                                                        className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white shadow hover:shadow-md transition-all duration-200"
                                                        style={{ backgroundColor: '#355E3B' }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2d4a31'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#355E3B'}
                                                    >
                                                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Review Appeal
                                                    </button>
                                                ) : (
                                                    <div className="text-center">
                                                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getStatusColor(contest.contest_status)}`}>
                                                            {getStatusIcon(contest.contest_status)}
                                                            <span className="ml-2">
                                                                {contest.contest_status === 'approved' ? 'APPROVED' : 'DENIED'}
                                                            </span>
                                                        </span>
                                                        <div className="mt-2 text-xs text-gray-500">
                                                            Decision Final
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Review Modal */}
                {reviewModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto p-4">
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 border-b border-gray-200 px-6 py-4 rounded-t-lg" style={{ backgroundColor: '#355E3B' }}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-white">
                                        Review Appeal #{reviewModal.contest.contest_id}
                                    </h3>
                                    <button
                                        onClick={closeReviewModal}
                                        className="text-white hover:text-gray-200"
                                    >
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Appeal Summary */}
                                <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                                    <div className="flex items-center mb-4">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-semibold text-gray-900 ml-3">Appeal Summary</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                        <div className="space-y-3">
                                            <div className="flex items-center">
                                                <span className="text-gray-500 w-20">Student:</span>
                                                <span className="ml-2 font-semibold text-gray-900">
                                                    {reviewModal.contest.user_name || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-gray-500 w-20">USC ID:</span>
                                                <span className="ml-2 font-mono text-gray-900 bg-gray-200 px-2 py-1 rounded">
                                                    {reviewModal.contest.usc_id}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center">
                                                <span className="text-gray-500 w-20">Violation:</span>
                                                <span className="ml-2 font-semibold text-gray-900">{reviewModal.contest.violation_type}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-gray-500 w-20">Vehicle:</span>
                                                <span className="ml-2 font-medium text-gray-900">{reviewModal.contest.vehicle_info}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Appeal Explanation */}
                                <div className="mb-6">
                                    <div className="flex items-center mb-4">
                                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-semibold text-gray-900 ml-3">Student&apos;s Explanation</h4>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 text-gray-700 leading-relaxed">
                                        {reviewModal.contest.contest_notes}
                                    </div>
                                </div>

                                {/* Evidence Files in Modal */}
                                {reviewModal.contest.evidence_files && reviewModal.contest.evidence_files.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex items-center mb-4">
                                            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}>
                                                <svg className="h-5 w-5" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-semibold ml-3" style={{ color: '#355E3B' }}>
                                                Evidence Files ({reviewModal.contest.evidence_files.length})
                                            </h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border">
                                            {reviewModal.contest.evidence_files.map((file, index) => (
                                                <div key={file.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex-shrink-0">
                                                            {file.mime_type.startsWith('image/') ? (
                                                                <div className="w-12 h-12 rounded-lg overflow-hidden border">
                                                                    <Image
                                                                        src={`data:${file.mime_type};base64,${file.file_data}`}
                                                                        alt={file.filename}
                                                                        width={48}
                                                                        height={48}
                                                                        className="w-full h-full object-cover cursor-pointer"
                                                                        onClick={() => openImagePreview(`data:${file.mime_type};base64,${file.file_data}`, file.filename)}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-lg border flex items-center justify-center" style={{ backgroundColor: 'rgba(53, 94, 59, 0.1)' }}>
                                                                    <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {file.filename}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(file.uploaded_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = `data:${file.mime_type};base64,${file.file_data}`;
                                                                link.download = file.filename;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            className="p-1.5 rounded border hover:bg-gray-100 transition-colors"
                                                            title="Download"
                                                        >
                                                            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Decision Form */}
                                <div className="space-y-6 bg-gray-50 rounded-xl p-6">
                                    <div>
                                        <label className="block text-lg font-semibold text-gray-900 mb-4">
                                            Decision
                                        </label>
                                        <div className="space-y-3">
                                            <label className="flex items-center p-4 border-2 border-green-200 rounded-xl hover:bg-green-50 cursor-pointer transition-all duration-200 group">
                                                <input
                                                    type="radio"
                                                    name="action"
                                                    value="approve"
                                                    checked={reviewForm.action === 'approve'}
                                                    onChange={(e) => setReviewForm(prev => ({ ...prev, action: e.target.value }))}
                                                    className="mr-4 text-green-600 h-5 w-5"
                                                />
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-green-200">
                                                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <span className="text-green-700 font-semibold">Approve Appeal</span>
                                                        <div className="text-sm text-green-600">Dismiss violation and remove from record</div>
                                                    </div>
                                                </div>
                                            </label>
                                            <label className="flex items-center p-4 border-2 border-red-200 rounded-xl hover:bg-red-50 cursor-pointer transition-all duration-200 group">
                                                <input
                                                    type="radio"
                                                    name="action"
                                                    value="deny"
                                                    checked={reviewForm.action === 'deny'}
                                                    onChange={(e) => setReviewForm(prev => ({ ...prev, action: e.target.value }))}
                                                    className="mr-4 text-red-600 h-5 w-5"
                                                />
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-red-200">
                                                        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <span className="text-red-700 font-semibold">Deny Appeal</span>
                                                        <div className="text-sm text-red-600">Keep violation active in record</div>
                                                    </div>
                                                </div>
                                            </label>
                                            <label className="flex items-center p-4 border-2 border-blue-200 rounded-xl hover:bg-blue-50 cursor-pointer transition-all duration-200 group">
                                                <input
                                                    type="radio"
                                                    name="action"
                                                    value="under_review"
                                                    checked={reviewForm.action === 'under_review'}
                                                    onChange={(e) => setReviewForm(prev => ({ ...prev, action: e.target.value }))}
                                                    className="mr-4 text-blue-600 h-5 w-5"
                                                />
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-200">
                                                        <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <span className="text-blue-700 font-semibold">Mark Under Review</span>
                                                        <div className="text-sm text-blue-600">Need more information or investigation</div>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                                            Review Notes (Optional)
                                        </label>
                                        <textarea
                                            value={reviewForm.notes}
                                            onChange={(e) => setReviewForm(prev => ({ ...prev, notes: e.target.value }))}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            placeholder="Add any notes about your decision..."
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        onClick={closeReviewModal}
                                        className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitReview}
                                        disabled={submitting || !reviewForm.action}
                                        className="px-6 py-3 border text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: '#355E3B',
                                            borderColor: '#355E3B',
                                            color: 'white'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2d4a31'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#355E3B'}
                                    >
                                        {submitting ? (
                                            <div className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </div>
                                        ) : (
                                            'Submit Decision'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Preview Modal */}
                {imagePreviewModal.open && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={closeImagePreview}>
                        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
                            <button
                                onClick={closeImagePreview}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="text-center">
                                <Image
                                    src={imagePreviewModal.src}
                                    alt={imagePreviewModal.filename}
                                    width={800}
                                    height={600}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="mt-4 text-white text-lg font-medium">
                                    {imagePreviewModal.filename}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div> {/* End of main content */}
        </div>
    );
}