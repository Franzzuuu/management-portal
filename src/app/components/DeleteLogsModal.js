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
            {/* Custom Background with Image */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-opacity"
                style={{
                    backgroundImage: "url('/ismisbg.jpg')",
                }}
                onClick={handleClose}
            >
                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-black/60"></div>
            </div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4 relative z-10">
                <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in-0 duration-300">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#355E3B] to-[#2d4f32]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="h-10 w-10 bg-[#FFD700] rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5 text-[#355E3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-lg font-semibold text-white">Delete Access Logs</h3>
                                    <p className="text-sm text-[#FFD700]">Permanently remove access log records</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isDeleting}
                                className="text-white hover:text-gray-200 transition-colors disabled:opacity-50 focus:ring-2 focus:ring-[#FFD700] focus:outline-none rounded"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                        {/* Warning */}
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start">
                                <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <h4 className="text-sm font-medium text-red-800">Permanent Deletion Warning</h4>
                                    <p className="text-sm text-red-700 mt-1">
                                        This action cannot be undone. Deleted access logs cannot be recovered.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scope Selection */}
                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Select Time Range</h4>
                            <div className="space-y-3">
                                <label className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="past_hour"
                                        checked={scope === 'past_hour'}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mr-3 focus:ring-[#355E3B]"
                                        style={{ accentColor: '#355E3B' }}
                                        disabled={isDeleting}
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Past Hour</div>
                                        <div className="text-sm text-gray-700">Delete logs from the last 60 minutes</div>
                                    </div>
                                </label>

                                <label className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="range"
                                        checked={scope === 'range'}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mr-3 focus:ring-[#355E3B]"
                                        style={{ accentColor: '#355E3B' }}
                                        disabled={isDeleting}
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Custom Range</div>
                                        <div className="text-sm text-gray-700">Select specific start and end dates</div>
                                    </div>
                                </label>

                                <label className="flex items-center cursor-pointer p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="all_time"
                                        checked={scope === 'all_time'}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mr-3 focus:ring-red-500"
                                        style={{ accentColor: '#dc2626' }}
                                        disabled={isDeleting}
                                    />
                                    <div>
                                        <div className="font-medium text-red-900">All Time</div>
                                        <div className="text-sm text-red-600">Delete ALL access logs permanently</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Date Range Calendar (only show when range is selected) */}
                        {scope === 'range' && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Select Date Range</h4>
                                <DateRangeCalendar
                                    startDate={startDate}
                                    endDate={endDate}
                                    onStartDateChange={setStartDate}
                                    onEndDateChange={setEndDate}
                                    showTime={true}
                                />
                            </div>
                        )}

                        {/* Confirmation Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Type <span className="font-bold text-red-600">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#355E3B] focus:outline-none text-sm"
                                disabled={isDeleting}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
                        <button
                            onClick={handleClose}
                            disabled={isDeleting}
                            className="px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#355E3B] focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirmDisabled()}
                            className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        >
                            {isDeleting && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{isDeleting ? 'Deleting...' : 'Delete Logs'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}