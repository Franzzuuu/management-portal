'use client';

import Image from 'next/image';

export default function Header({ user, onLogout }) {
    return (
        <header className="sticky top-0 z-40 shadow-md bg-[#355E3B] pt-[env(safe-area-inset-top)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Mobile: Two-row layout, Tablet+: Single row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-3 sm:py-4">

                    {/* Branding Row */}
                    <div className="flex items-center gap-3">
                        <Image
                            src="/images/USC_seal.svg"
                            alt="USC Seal"
                            width={40}
                            height={40}
                            className="h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0"
                        />
                        <div className="min-w-0">
                            <h1 className="font-bold text-white text-[clamp(1.125rem,2.5vw,1.5rem)] leading-tight">
                                Carolinian Portal
                            </h1>
                            <div className="text-[clamp(0.75rem,1.5vw,0.875rem)] text-[#FFD700]">
                                Dashboard
                            </div>
                        </div>
                    </div>

                    {/* User Actions Row */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4" aria-label="User actions">
                        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                            <div className="min-w-0">
                                {/* Mobile: Stacked layout, Desktop: One line */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                    <div className="text-white text-sm sm:text-base font-medium truncate max-w-[120px] sm:max-w-none">
                                        {user?.fullName || user?.email}
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFD700] text-[#355E3B] whitespace-nowrap mt-1 sm:mt-0 self-start sm:self-auto">
                                        {user?.designation}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Logout button - hidden on mobile, visible on sm+ */}
                        <button
                            onClick={onLogout}
                            aria-label="Logout"
                            className="hidden sm:flex bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium 
                                     transition-colors duration-200 shadow-sm hover:shadow-md shrink-0 min-h-[40px]
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
                        >
                            Logout
                        </button>

                        {/* Mobile logout - icon only */}
                        <button
                            onClick={onLogout}
                            aria-label="Logout"
                            className="sm:hidden bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg
                                     transition-colors duration-200 shadow-sm hover:shadow-md shrink-0 min-h-[40px] min-w-[40px]
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}