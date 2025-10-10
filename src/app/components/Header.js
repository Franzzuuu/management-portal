'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header({ user, onLogout }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [profilePicture, setProfilePicture] = useState(null);
    const dropdownRef = useRef(null);
    const router = useRouter();

    // Dynamic title based on user designation
    const getPortalTitle = () => {
        switch (user?.designation) {
            case 'Admin':
                return 'Admin Portal';
            case 'Security':
                return 'Security Portal';
            case 'Carolinian':
            default:
                return 'Management Portal';
        }
    };

    // Get role-specific colors for designation badge
    const getDesignationColors = () => {
        switch (user?.designation) {
            case 'Admin':
                return 'bg-red-500 text-white';
            case 'Security':
                return 'bg-green-500 text-white';
            case 'Carolinian':
            default:
                return 'bg-[#FFD700] text-[#355E3B]';
        }
    };

    // Fetch profile picture
    useEffect(() => {
        const fetchProfilePicture = async () => {
            if (!user) return;

            try {
                let endpoint = '/api/carolinian/profile-picture'; // default

                if (user?.designation === 'Admin') {
                    endpoint = '/api/admin/profile-picture';
                } else if (user?.designation === 'Security') {
                    endpoint = '/api/security/profile-picture';
                }

                const response = await fetch(endpoint);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setProfilePicture(`data:${data.image_type};base64,${data.image_data}`);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch profile picture:', error);
            }
        };

        if (user) {
            fetchProfilePicture();
        }
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProfileClick = () => {
        let profilePath = '/carolinian/profile'; // default

        if (user?.designation === 'Admin') {
            profilePath = '/admin/profile';
        } else if (user?.designation === 'Security') {
            profilePath = '/security/profile';
        }

        router.push(profilePath);
        setIsDropdownOpen(false);
    };

    const handleLogoClick = () => {
        let dashboardPath = '/carolinian'; // default

        if (user?.designation === 'Admin') {
            dashboardPath = '/admin';
        } else if (user?.designation === 'Security') {
            dashboardPath = '/security';
        }

        console.log('Logo clicked, navigating to:', dashboardPath);
        router.push(dashboardPath);
    };

    return (
        <header className="sticky top-0 z-40 shadow-md bg-[#355E3B] pt-[env(safe-area-inset-top)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Mobile: Two-row layout, Tablet+: Single row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-3 sm:py-4">

                    {/* Branding Row */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleLogoClick();
                                }}
                                className="hover:opacity-80 transition-opacity duration-200 focus:outline-none rounded-lg p-1 cursor-pointer"
                                aria-label="Navigate to main dashboard"
                                type="button"
                            >
                                <Image
                                    src="/images/USC_seal.svg"
                                    alt="USC Seal"
                                    width={32}
                                    height={32}
                                    className="h-24 w-24 sm:h-24 sm:w-24 object-contain shrink-0"
                                />
                            </button>
                            <div className="min-w-0">
                                <h1 className="font-bold text-white text-[clamp(1.125rem,2.5vw,1.5rem)] leading-tight">
                                    {getPortalTitle()}
                                </h1>
                                <div className="text-[clamp(0.75rem,1.5vw,0.875rem)] text-[#FFD700]">
                                    Dashboard
                                </div>
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
                                        {user?.fullName || user?.full_name || user?.email}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap mt-1 sm:mt-0 self-start sm:self-auto ${getDesignationColors()}`}>
                                        {user?.designation}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 h-12 px-3 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 hover:ring-1 hover:ring-[#FFD700] transition-all duration-200 focus:outline-none cursor-pointer"
                                aria-label="Profile menu"
                            >
                                <div className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden">
                                    {profilePicture ? (
                                        <Image
                                            src={profilePicture}
                                            alt="Profile"
                                            width={32}
                                            height={32}
                                            className="w-full h-full object-cover"
                                            unoptimized={true}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#FFD700]">
                                            <svg className="h-4 w-4 text-[#355E3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                {/* Dropdown arrow */}
                                <svg
                                    className={`h-4 w-4 text-white transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                    <button
                                        onClick={handleProfileClick}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                                    >
                                        <svg className="h-4 w-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        My Profile
                                    </button>
                                    <hr className="my-1 border-gray-200" />
                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onLogout();
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                                    >
                                        <svg className="h-4 w-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}