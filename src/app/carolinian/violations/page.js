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
        setContestForm(prev => ({ ...prev, evidence_files: files }));
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getContestStatusColor = (contestStatus) => {
        switch (contestStatus) {
            case 'pending': return 'bg-blue-100 text-blue-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
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
                                className="text-white hover:text-yellow-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
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
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
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
                        <div className="flex space-x-1 bg-white bg-opacity-10 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('current')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'current'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'current' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                Current Violations
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'history'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'history' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                History
                            </button>
                            <button
                                onClick={() => setActiveTab('appeals')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === 'appeals'
                                    ? 'text-white shadow-lg'
                                    : 'text-green-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                                    }`}
                                style={activeTab === 'appeals' ? { backgroundColor: '#FFD700', color: '#355E3B' } : {}}
                            >
                                My Appeals
                            </button>
                        </div>
                    </div>
                </div>

                {/* Violations List */}
                <div className="bg-white rounded-xl shadow-lg">
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
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vehicle
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Violation Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Location
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {violations.map((violation) => (
                                            <tr key={violation.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {new Date(violation.created_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(violation.created_at).toLocaleTimeString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {violation.plate_number}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {violation.vehicle_make} {violation.vehicle_model}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {violation.violation_type}
                                                    </div>
                                                    {violation.description && (
                                                        <div className="text-sm text-gray-500">
                                                            {violation.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {violation.location || 'Campus'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col space-y-1">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(violation.status)}`}>
                                                            {violation.status}
                                                        </span>
                                                        {violation.contest_status && (
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getContestStatusColor(violation.contest_status)}`}>
                                                                Appeal: {violation.contest_status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        {violation.has_image && (
                                                            <button
                                                                onClick={() => window.open(`/api/violations/view-image/${violation.id}`, '_blank')}
                                                                className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors duration-200"
                                                            >
                                                                View Evidence
                                                            </button>
                                                        )}
                                                        {violation.status === 'pending' && !violation.contest_status && (
                                                            <button
                                                                onClick={() => openContestModal(violation)}
                                                                className="text-white px-3 py-1 rounded-md transition-colors duration-200 hover:opacity-90"
                                                                style={{ backgroundColor: '#355E3B' }}
                                                            >
                                                                Contest
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-gray-500 text-lg mb-2">
                                    {activeTab === 'current' && 'No current violations'}
                                    {activeTab === 'history' && 'No violation history'}
                                    {activeTab === 'appeals' && 'No appeals submitted'}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    {activeTab === 'current' && 'Great! You have no outstanding violations.'}
                                    {activeTab === 'history' && 'You have a clean record with no violations.'}
                                    {activeTab === 'appeals' && 'You haven\'t submitted any appeals yet.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Contest Modal */}
            {contestModal.open && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Contest Violation</h3>
                                <button
                                    onClick={closeContestModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Violation Details */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Violation Details</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Date:</span>
                                        <span className="ml-2 text-gray-900">
                                            {new Date(contestModal.violation.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Vehicle:</span>
                                        <span className="ml-2 text-gray-900">
                                            {contestModal.violation.plate_number}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Violation:</span>
                                        <span className="ml-2 text-gray-900">
                                            {contestModal.violation.violation_type}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Location:</span>
                                        <span className="ml-2 text-gray-900">
                                            {contestModal.violation.location || 'Campus'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contest Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Explanation <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={contestForm.explanation}
                                        onChange={(e) => setContestForm(prev => ({ ...prev, explanation: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        rows={4}
                                        placeholder="Please explain why you believe this violation should be dismissed..."
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Supporting Evidence (Optional)
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Accepted formats: Images, PDF, Word documents. Max 5 files.
                                    </p>
                                </div>

                                {contestForm.evidence_files.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
                                        <ul className="text-sm text-gray-600">
                                            {contestForm.evidence_files.map((file, index) => (
                                                <li key={index} className="flex items-center">
                                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    {file.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={closeContestModal}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitContest}
                                    disabled={submitting || !contestForm.explanation.trim()}
                                    className="px-4 py-2 text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: '#355E3B' }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Appeal'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}