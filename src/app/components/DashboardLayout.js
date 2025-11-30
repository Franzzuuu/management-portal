'use client';

import { useRouter } from 'next/navigation';
import Header from './Header';

export default function DashboardLayout({ children, user, setUser, stats, quickActions, recentActivity, recentActivityTitle = "Recent Activity", recentActivitySubtitle = "Your latest account activity" }) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            // Clear any local state first
            setUser?.(null);

            // Make logout request with caching disabled
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                console.error('Logout failed with status:', response.status);
            }

            // Redirect to login regardless of success/failure
            router.push('/login');

        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect to login anyway
            router.push('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                user={user}
                onLogout={handleLogout}
            />

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Welcome Banner */}
                <div className="mb-8 p-6 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #355E3B 0%, #2d4f32 100%)' }}>
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Welcome, {user?.fullName || user?.full_name || user?.email}
                        </h2>
                        <p className="text-base text-gray-200">
                            Integrated RFID Sticker System - Vehicle Management Portal
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-lg p-6 border-l-4 transform transition-all duration-200 hover:shadow-xl" style={{ borderLeftColor: stat.borderColor }}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-14 w-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bgColor }}>
                                            <svg className="h-7 w-7" style={{ color: stat.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.iconPath} />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 min-w-0 flex-1">
                                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">{stat.title}</h3>
                                        <p className="text-3xl font-bold mb-1" style={{ color: stat.textColor }}>{stat.value}</p>
                                        <p className="text-xs text-gray-500">{stat.subtitle}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick Actions */}
                {quickActions && (
                    <div className="mb-8">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-200" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                                <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
                                <p className="text-sm mt-1" style={{ color: '#FFD700' }}>Access your most used features</p>
                            </div>
                            <div className="p-6">
                                <div className={`grid gap-6 ${quickActions.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : quickActions.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                                    {quickActions.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={action.onClick}
                                            className="flex items-center p-5 border-2 border-gray-200 rounded-xl hover:shadow-xl transition-all duration-200 group hover:border-gray-300 hover:cursor-pointer hover:scale-105"
                                        >
                                            <div className="flex-shrink-0">
                                                <div className="h-14 w-14 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: action.bgColor }}>
                                                    <svg className="h-7 w-7" style={{ color: action.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.iconPath} />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-5 text-left min-w-0 flex-1">
                                                <p className="text-lg font-semibold text-gray-900">{action.title}</p>
                                                <p className="text-sm text-gray-600 mt-1">{action.subtitle}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom content from children (inserted after quick actions) */}
                {children}

                {/* Recent Activity - only render if recentActivity is provided and not null */}
                {recentActivity !== null && (
                    <div className="bg-white rounded-xl shadow-lg">
                        <div className="px-6 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                            <h2 className="text-xl sm:text-xl font-semibold text-white">{recentActivityTitle}</h2>
                            <p className="text-sm sm:text-sm" style={{ color: '#FFD700' }}>{recentActivitySubtitle}</p>
                        </div>
                        <div className="p-6 sm:p-6">
                            {recentActivity && recentActivity.length > 0 ? (
                                <div className="space-y-4 sm:space-y-4">
                                    {recentActivity.map((activity, index) => (
                                        <div key={index} className="flex items-center p-4 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                            <div className="flex-shrink-0">
                                                {activity.type === 'access' && activity.access_type ? (
                                                    <div className={`h-8 w-8 sm:h-8 sm:w-8 rounded-full flex items-center justify-center ${activity.access_type === 'entry' ? 'bg-green-100 border-2 border-green-200' : 'bg-blue-100 border-2 border-blue-200'
                                                        }`}>
                                                        <svg className={`h-4 w-4 sm:h-4 sm:w-4 ${activity.access_type === 'entry' ? 'text-green-600' : 'text-blue-600'
                                                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {activity.access_type === 'entry' ? (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                                            ) : (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l4 4m0 0l-4 4m4-4H3m14 0V7a3 3 0 00-3-3H7a3 3 0 00-3 3v4" />
                                                            )}
                                                        </svg>
                                                    </div>
                                                ) : activity.type === 'violation' ? (
                                                    <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-full flex items-center justify-center bg-red-100 border-2 border-red-200">
                                                        <svg className="h-4 w-4 sm:h-4 sm:w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#355E3B' }}>
                                                        <svg className="h-4 w-4 sm:h-4 sm:w-4" style={{ color: '#FFD700' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4 sm:ml-4 min-w-0 flex-1">
                                                <p className="text-sm sm:text-sm font-medium text-gray-900">{activity.description}</p>
                                                <p className="text-xs text-gray-500">{activity.timestamp}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 sm:py-8">
                                    <svg className="h-12 w-12 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-base sm:text-base text-gray-500">No recent activity</p>
                                    <p className="text-sm sm:text-sm text-gray-400">{recentActivityTitle.toLowerCase()} will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}