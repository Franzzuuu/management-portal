'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function Header({ user, onLogout }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [profilePicture, setProfilePicture] = useState(null);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [hasCheckedWelcome, setHasCheckedWelcome] = useState(false);
    const dropdownRef = useRef(null);
    const notificationRef = useRef(null);
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

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch('/api/notifications?limit=10');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Sort notifications: unread first, then by date (newest first)
                    // Note: is_read can be 0/1 or false/true from database
                    const sortedNotifications = (data.notifications || []).sort((a, b) => {
                        const aRead = a.is_read === 1 || a.is_read === true;
                        const bRead = b.is_read === 1 || b.is_read === true;
                        
                        // First sort by read status (unread first)
                        if (aRead !== bRead) {
                            return aRead ? 1 : -1;
                        }
                        // Then sort by date (newest first)
                        return new Date(b.created_at) - new Date(a.created_at);
                    });
                    setNotifications(sortedNotifications);
                    setUnreadCount(data.unread_count || 0);
                }
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Show welcome modal on login if there are unread notifications
    useEffect(() => {
        if (!hasCheckedWelcome && unreadCount > 0 && notifications.length > 0) {
            // Check if modal was already shown this session
            const modalShown = sessionStorage.getItem('welcomeModalShown');
            if (!modalShown) {
                setShowWelcomeModal(true);
                sessionStorage.setItem('welcomeModalShown', 'true');
            }
            setHasCheckedWelcome(true);
        }
    }, [hasCheckedWelcome, unreadCount, notifications]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showWelcomeModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showWelcomeModal]);

    // Close welcome modal
    const closeWelcomeModal = () => {
        setShowWelcomeModal(false);
    };

    // Get unread notifications for welcome modal
    const unreadNotifications = notifications.filter(
        n => n.is_read === 0 || n.is_read === false
    );

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_id: notificationId })
            });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mark_all: true })
            });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'vehicle_pending':
            case 'vehicle_approved':
            case 'vehicle_rejected':
            case 'sticker_assigned':
                return (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                );
            case 'appeal_pending':
            case 'appeal_resolved':
                return (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'violation_issued':
                return (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'account_status_changed':
                return (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                );
            default:
                return (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                );
        }
    };

    // Get notification icon color based on type
    const getNotificationIconColor = (type) => {
        switch (type) {
            case 'vehicle_approved':
            case 'appeal_resolved':
            case 'sticker_assigned':
                return 'bg-green-100 text-green-600';
            case 'vehicle_rejected':
            case 'violation_issued':
                return 'bg-red-100 text-red-600';
            case 'vehicle_pending':
            case 'appeal_pending':
                return 'bg-yellow-100 text-yellow-600';
            case 'account_status_changed':
                return 'bg-blue-100 text-blue-600';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
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
                                className="hover:opacity-80 transition-opacity duration-200 focus:outline-none rounded-full p-1 cursor-pointer"
                                aria-label="Navigate to main dashboard"
                                type="button"
                            >
                                <div className="bg-white rounded-full p-2 shadow-sm">
                                    <Image
                                        src="/images/USC_seal.svg"
                                        alt="USC Seal"
                                        width={32}
                                        height={32}
                                        className="h-20 w-20 sm:h-20 sm:w-20 object-contain shrink-0"
                                    />
                                </div>
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

                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className={`relative flex items-center justify-center h-10 w-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 hover:ring-2 hover:ring-[#FFD700] active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFD700] cursor-pointer ${isNotificationOpen ? 'bg-white/20 ring-2 ring-[#FFD700]' : ''}`}
                                aria-label="Notifications"
                                title="Notifications"
                            >
                                <svg className={`h-5 w-5 text-white transition-transform duration-200 ${unreadCount > 0 ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full animate-bounce shadow-lg">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[28rem] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#355E3B] to-[#4a7c52]">
                                        <div className="flex items-center gap-2">
                                            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            <h3 className="font-semibold text-white">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-[#FFD700] text-[#355E3B] rounded-full">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-xs text-white/80 hover:text-white font-medium hover:underline cursor-pointer transition-colors"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Notifications List */}
                                    <div className="overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-12 text-center">
                                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-medium text-gray-600">No notifications yet</p>
                                                <p className="text-xs text-gray-400 mt-1">We&apos;ll notify you when something arrives</p>
                                            </div>
                                        ) : (
                                            <>
                                                {notifications.map((notification, index) => {
                                                    // Handle is_read as 0/1 or boolean
                                                    const isRead = notification.is_read === 1 || notification.is_read === true;
                                                    const prevIsRead = index > 0 ? (notifications[index - 1].is_read === 1 || notifications[index - 1].is_read === true) : true;
                                                    
                                                    // Check if this is the first read notification (to show separator)
                                                    const showSeparator = isRead && index > 0 && !prevIsRead;
                                                    
                                                    return (
                                                        <div key={notification.id}>
                                                            {showSeparator && (
                                                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100">
                                                                    <div className="flex-1 h-px bg-gray-300"></div>
                                                                    <span className="text-xs text-gray-500 font-medium">Earlier</span>
                                                                    <div className="flex-1 h-px bg-gray-300"></div>
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => !isRead && markAsRead(notification.id)}
                                                                className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                                                                    !isRead 
                                                                        ? 'bg-blue-50/70 hover:bg-blue-100/70 cursor-pointer' 
                                                                        : 'bg-white cursor-default'
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    {/* Icon */}
                                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationIconColor(notification.type)}`}>
                                                                        {getNotificationIcon(notification.type)}
                                                                    </div>
                                                                    
                                                                    {/* Content */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className={`text-sm ${!isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                                                {notification.title}
                                                                            </p>
                                                                            {!isRead && (
                                                                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                                            {notification.message}
                                                                        </p>
                                                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                            {formatTimeAgo(notification.created_at)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
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
                                            sessionStorage.removeItem('welcomeModalShown');
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

            {/* Welcome Notification Modal */}
            {showWelcomeModal && unreadNotifications.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Blurred backdrop - click disabled */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/40 backdrop-blur-md" />
                    
                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-[#355E3B]/20 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* Decorative top accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#355E3B] via-[#FFD700] to-[#355E3B]" />
                        
                        {/* Header */}
                        <div className="relative px-6 py-5 bg-gradient-to-br from-[#355E3B] via-[#3d6b44] to-[#355E3B]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center shadow-lg">
                                            <svg className="h-6 w-6 text-[#355E3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
                                            <p className="text-sm text-[#FFD700] font-medium mt-0.5">
                                                {user?.fullName || user?.full_name || 'User'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                                            <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                                            <span className="text-sm font-semibold text-white">
                                                {unreadNotifications.length} New Update{unreadNotifications.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={closeWelcomeModal}
                                    className="flex-shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all duration-200 text-white border border-white/20 hover:border-white/40 group"
                                    aria-label="Close modal"
                                >
                                    <svg className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Section Header */}
                        <div className="px-6 py-4 bg-white border-b border-gray-200">
                            <p className="text-xs text-gray-600 uppercase font-bold tracking-wider flex items-center gap-2">
                                <svg className="h-4 w-4 text-[#355E3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                While you were away
                            </p>
                        </div>
                        
                        {/* Notification List */}
                        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50">
                            <div className="p-4 space-y-3">
                                {unreadNotifications.map((notification, index) => (
                                    <div
                                        key={notification.id}
                                        className="group relative bg-white rounded-xl p-4 border border-gray-200 hover:border-[#355E3B]/30 hover:shadow-lg transition-all duration-200"
                                        style={{
                                            animationDelay: `${index * 50}ms`,
                                            animation: 'slideInRight 0.3s ease-out forwards'
                                        }}
                                    >
                                        {/* Unread indicator */}
                                        <div className="absolute top-4 right-4">
                                            <span className="flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FFD700]"></span>
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-start gap-3 pr-6">
                                            {/* Icon */}
                                            <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${getNotificationIconColor(notification.type)}`}>
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 mb-1">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        {formatTimeAgo(notification.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Slide-in animation */}
                        <style jsx>{`
                            @keyframes slideInRight {
                                from {
                                    opacity: 0;
                                    transform: translateX(20px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateX(0);
                                }
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </header>
    );
}