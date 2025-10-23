'use client';

export default function SkeletonLoader({ type = 'default', count = 1 }) {
    const renderSkeleton = () => {
        switch (type) {
            case 'card':
                return (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-pulse">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                            </div>
                            <div className="ml-4 flex-1">
                                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                        </div>
                    </div>
                );

            case 'chart':
                return (
                    <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
                        <div className="relative h-80 w-full bg-gray-100 rounded-lg flex items-center justify-center">
                            <div className="text-gray-400">
                                <svg className="h-16 w-16 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                );

            case 'table':
                return (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="h-6 bg-gray-200 rounded w-40"></div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                                            <div>
                                                <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                                                <div className="h-3 bg-gray-200 rounded w-32"></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'analytics':
                return (
                    <div className="space-y-8 animate-pulse">
                        {/* Summary Cards Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-200">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                                        </div>
                                        <div className="ml-4">
                                            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                                            <div className="h-8 bg-gray-200 rounded w-12 mb-1"></div>
                                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts Grid Skeleton */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                                    <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
                                    <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Large Chart Skeleton */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="h-6 bg-gray-200 rounded w-56 mb-6"></div>
                            <div className="h-80 bg-gray-100 rounded-lg"></div>
                        </div>

                        {/* Metrics Cards Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-gray-100 rounded-xl shadow-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                                            <div className="h-8 bg-gray-200 rounded w-12 mb-1"></div>
                                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                                        </div>
                                        <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'filters':
                return (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6 animate-pulse">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="h-6 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i}>
                                        <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                                        <div className="h-10 bg-gray-100 rounded-lg"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'list':
                return (
                    <div className="space-y-3 animate-pulse">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                                    <div>
                                        <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return (
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                );
        }
    };

    return (
        <>
            {[...Array(count)].map((_, index) => (
                <div key={index}>
                    {renderSkeleton()}
                </div>
            ))}
        </>
    );
}