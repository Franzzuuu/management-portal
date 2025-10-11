import { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', isVisible, onClose, duration = 5000 }) {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    const getToastStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    text: 'text-green-800',
                    icon: (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )
                };
            case 'error':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    text: 'text-red-800',
                    icon: (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-200',
                    text: 'text-yellow-800',
                    icon: (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    )
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    text: 'text-blue-800',
                    icon: (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
        }
    };

    const styles = getToastStyles();

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
            <div className={`max-w-sm w-full ${styles.bg} ${styles.border} border rounded-lg shadow-lg overflow-hidden`}>
                <div className="p-4">
                    <div className="flex items-start">
                        <div className={`flex-shrink-0 ${styles.text}`}>
                            {styles.icon}
                        </div>
                        <div className="ml-3 w-0 flex-1">
                            <p className={`text-sm font-medium ${styles.text}`}>
                                {message}
                            </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex">
                            <button
                                onClick={onClose}
                                className={`inline-flex ${styles.text} hover:opacity-70 transition-opacity`}
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {duration > 0 && (
                    <div className="h-1 bg-gray-200">
                        <div
                            className={`h-full transition-all ease-linear ${type === 'success' ? 'bg-green-500' :
                                    type === 'error' ? 'bg-red-500' :
                                        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                            style={{
                                animation: `shrink ${duration}ms linear forwards`
                            }}
                        />
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes shrink {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    );
}