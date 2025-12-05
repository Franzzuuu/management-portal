'use client';

export default function LoadingSpinner({ 
    message = 'Loading...', 
    size = 'default',
    fullScreen = true 
}) {
    const sizeClasses = {
        small: 'h-6 w-6',
        default: 'h-10 w-10',
        large: 'h-16 w-16'
    };

    const textSizeClasses = {
        small: 'text-sm',
        default: 'text-base',
        large: 'text-lg'
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center space-y-4">
            {/* Outer ring */}
            <div className="relative">
                <div 
                    className={`${sizeClasses[size]} rounded-full border-4 border-gray-200`}
                    style={{ borderTopColor: '#355E3B', borderRightColor: '#355E3B' }}
                >
                    <div className="absolute inset-0 rounded-full animate-spin">
                        <div 
                            className="h-full w-full rounded-full border-4 border-transparent"
                            style={{ borderTopColor: '#355E3B', borderRightColor: '#FFD700' }}
                        ></div>
                    </div>
                </div>
                {/* Inner pulse */}
                <div 
                    className="absolute inset-2 rounded-full animate-pulse"
                    style={{ backgroundColor: 'rgba(53, 94, 59, 0.1)' }}
                ></div>
            </div>
            
            {/* Loading text with animated dots */}
            <div className="flex items-center space-x-1">
                <span className={`${textSizeClasses[size]} font-medium text-gray-600`}>
                    {message}
                </span>
                <span className="flex space-x-1">
                    <span className="animate-bounce text-gray-600" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce text-gray-600" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce text-gray-600" style={{ animationDelay: '300ms' }}>.</span>
                </span>
            </div>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
                    {spinner}
                </div>
            </div>
        );
    }

    return spinner;
}
