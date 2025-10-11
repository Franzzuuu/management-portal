import { useState } from 'react';
import DateRangeCalendar from './DateRangeCalendar';

export default function DeleteLogsModal({ isOpen, onClose, onConfirm }) {
    const [scope, setScope] = useState('past_hour');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const resetModal = () => {
        setScope('past_hour');
        setStartDate(null);
        setEndDate(null);
        setConfirmationText('');
        setIsDeleting(false);
    };

    const handleClose = () => {
        if (!isDeleting) {
            resetModal();
            onClose();
        }
    };

    const handleConfirm = async () => {
        if (confirmationText !== 'DELETE') {
            return;
        }

        if (scope === 'range' && (!startDate || !endDate)) {
            return;
        }

        setIsDeleting(true);

        try {
            const requestBody = {
                scope,
                ...(scope === 'range' && {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                })
            };

            const response = await fetch('/api/access-logs/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success) {
                onConfirm(data);
                resetModal();
                onClose();
            } else {
                throw new Error(data.error || 'Delete operation failed');
            }
        } catch (error) {
            console.error('Delete operation failed:', error);
            // You could add a toast notification here for errors
            alert(`Delete failed: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const isConfirmDisabled = () => {
        if (confirmationText !== 'DELETE') return true;
        if (scope === 'range' && (!startDate || !endDate)) return true;
        return isDeleting;
    };

    const getScopeDescription = () => {
        switch (scope) {
            case 'past_hour':
                return 'All access logs from the past hour will be permanently deleted.';
            case 'range':
                return 'All access logs within the selected date range will be permanently deleted.';
            case 'all_time':
                return 'ALL access logs will be permanently deleted. This action cannot be undone.';
            default:
                return '';
        }
    };

    const getEstimatedCount = () => {
        // This would ideally come from an API call, but for now we'll show general text
        switch (scope) {
            case 'past_hour':
                return 'recent entries';
            case 'range':
                return startDate && endDate ? 'entries in selected range' : 'selected entries';
            case 'all_time':
                return 'ALL entries';
            default:
                return 'entries';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-opacity"
                style={{
                    backgroundImage: "url('/images/ismisbg.jpg')",
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden backdrop-blur-sm">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#FFD700' }}>
                                    <svg className="h-6 w-6" style={{ color: '#355E3B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-bold text-white">Delete Access Logs</h3>
                                    <p className="text-sm mt-1" style={{ color: '#FFD700' }}>Permanently remove access log records</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isDeleting}
                                className="text-white hover:text-gray-200 transition-colors disabled:opacity-50 p-2 rounded-lg hover:bg-white/10"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
                        {/* Warning */}
                        <div className="mb-8 p-5 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-sm">
                            <div className="flex items-start">
                                <svg className="h-6 w-6 text-red-500 mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <h4 className="text-base font-semibold text-red-800 mb-1">Permanent Deletion Warning</h4>
                                    <p className="text-sm text-red-700">
                                        This action cannot be undone. Deleted access logs cannot be recovered.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scope Selection */}
                        <div className="mb-8">
                            <h4 className="text-base font-semibold text-gray-800 mb-4">Select Time Range</h4>
                            <div className="space-y-4">
                                <label className="flex items-center cursor-pointer p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-[#355E3B]/30 transition-all duration-200 group">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="past_hour"
                                        checked={scope === 'past_hour'}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mr-4 w-4 h-4"
                                        style={{ accentColor: '#355E3B' }}
                                        disabled={isDeleting}
                                    />
                                    <div>
                                        <div className="font-semibold text-gray-900 group-hover:text-[#355E3B] transition-colors">Past Hour</div>
                                        <div className="text-sm text-gray-600 mt-1">Delete logs from the last 60 minutes</div>
                                    </div>
                                </label>

                                <label className="flex items-center cursor-pointer p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-[#355E3B]/30 transition-all duration-200 group">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="range"
                                        checked={scope === 'range'}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mr-4 w-4 h-4"
                                        style={{ accentColor: '#355E3B' }}
                                        disabled={isDeleting}
                                    />
                                    <div>
                                        <div className="font-semibold text-gray-900 group-hover:text-[#355E3B] transition-colors">Custom Range</div>
                                        <div className="text-sm text-gray-600 mt-1">Select specific start and end dates using calendar</div>
                                    </div>
                                </label>

                                <label className="flex items-center cursor-pointer p-4 border-2 border-red-300 rounded-xl hover:bg-red-50 hover:border-red-400 transition-all duration-200 group">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="all_time"
                                        checked={scope === 'all_time'}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mr-4 w-4 h-4"
                                        style={{ accentColor: '#dc2626' }}
                                        disabled={isDeleting}
                                    />
                                    <div>
                                        <div className="font-semibold text-red-900 group-hover:text-red-700 transition-colors">All Time</div>
                                        <div className="text-sm text-red-600 mt-1">⚠️ Delete ALL access logs permanently</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Date Range Calendar (only show when range is selected) */}
                        {scope === 'range' && (
                            <div className="mb-8">
                                <h4 className="text-base font-semibold text-gray-800 mb-4">Select Date Range</h4>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <DateRangeCalendar
                                        startDate={startDate}
                                        endDate={endDate}
                                        onStartDateChange={setStartDate}
                                        onEndDateChange={setEndDate}
                                        showTime={true}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Confirmation Input */}
                        <div className="mb-6">
                            <label className="block text-base font-semibold text-gray-800 mb-3">
                                Type <span className="font-bold text-red-600 bg-red-100 px-2 py-1 rounded">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:border-[#355E3B] focus:outline-none text-base text-gray-900 placeholder-gray-500 transition-all duration-200"
                                style={{ '--tw-ring-color': '#355E3B' }}
                                disabled={isDeleting}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-4">
                        <button
                            onClick={handleClose}
                            disabled={isDeleting}
                            className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirmDisabled()}
                            className="px-6 py-3 text-white bg-red-600 rounded-xl hover:bg-red-700 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
                        >
                            {isDeleting && (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            )}
                            <span>{isDeleting ? 'Deleting...' : 'Delete Logs'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}