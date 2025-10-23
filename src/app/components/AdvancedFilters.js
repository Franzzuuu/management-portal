'use client';

import { useState, useEffect } from 'react';

export default function AdvancedFilters({
    selectedReport,
    onFiltersChange,
    initialFilters = {},
    isVisible = false,
    onToggle
}) {
    const [filters, setFilters] = useState({
        searchTerm: '',
        status: '',
        designation: '',
        vehicleType: '',
        entryType: '',
        location: '',
        violationType: '',
        sortBy: 'id',
        sortDir: 'desc',
        ...initialFilters
    });

    useEffect(() => {
        onFiltersChange(filters);
    }, [filters, onFiltersChange]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            status: '',
            designation: '',
            vehicleType: '',
            entryType: '',
            location: '',
            violationType: '',
            sortBy: 'id',
            sortDir: 'desc'
        });
    };

    const getFilterCount = () => {
        const activeFilters = Object.entries(filters).filter(([key, value]) => {
            if (key === 'sortBy' || key === 'sortDir') return false;
            return value && value.trim() !== '';
        });
        return activeFilters.length;
    };

    if (!isVisible) return null;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                        {getFilterCount() > 0 && (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {getFilterCount()} active
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={clearFilters}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={onToggle}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Search Term */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search
                        </label>
                        <input
                            type="text"
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            placeholder="Search..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                            style={{ '--tw-ring-color': '#355E3B' }}
                        />
                    </div>

                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sort By
                        </label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                            style={{ '--tw-ring-color': '#355E3B' }}
                        >
                            <option value="id">ID</option>
                            <option value="created_at">Date Created</option>
                            <option value="updated_at">Last Updated</option>
                            {selectedReport === 'users' && (
                                <>
                                    <option value="full_name">Name</option>
                                    <option value="email">Email</option>
                                    <option value="designation">Designation</option>
                                </>
                            )}
                            {selectedReport === 'vehicles' && (
                                <>
                                    <option value="plate_number">Plate Number</option>
                                    <option value="make">Make</option>
                                    <option value="model">Model</option>
                                    <option value="vehicle_type">Type</option>
                                </>
                            )}
                            {selectedReport === 'access' && (
                                <>
                                    <option value="timestamp">Timestamp</option>
                                    <option value="entry_type">Entry Type</option>
                                    <option value="location">Location</option>
                                </>
                            )}
                            {selectedReport === 'violations' && (
                                <>
                                    <option value="violation_type">Violation Type</option>
                                    <option value="status">Status</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Sort Direction */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sort Direction
                        </label>
                        <select
                            value={filters.sortDir}
                            onChange={(e) => handleFilterChange('sortDir', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                            style={{ '--tw-ring-color': '#355E3B' }}
                        >
                            <option value="asc">Ascending (A-Z, 1-9)</option>
                            <option value="desc">Descending (Z-A, 9-1)</option>
                        </select>
                    </div>

                    {/* Report-specific filters */}
                    {selectedReport === 'users' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Designation
                                </label>
                                <select
                                    value={filters.designation}
                                    onChange={(e) => handleFilterChange('designation', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Designations</option>
                                    <option value="Student">Student</option>
                                    <option value="Faculty">Faculty</option>
                                    <option value="Staff">Staff</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </>
                    )}

                    {selectedReport === 'vehicles' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vehicle Type
                                </label>
                                <select
                                    value={filters.vehicleType}
                                    onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Types</option>
                                    <option value="2-wheel">2-Wheel</option>
                                    <option value="4-wheel">4-Wheel</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Approval Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </>
                    )}

                    {selectedReport === 'access' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Entry Type
                                </label>
                                <select
                                    value={filters.entryType}
                                    onChange={(e) => handleFilterChange('entryType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Types</option>
                                    <option value="entry">Entry</option>
                                    <option value="exit">Exit</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location
                                </label>
                                <select
                                    value={filters.location}
                                    onChange={(e) => handleFilterChange('location', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Locations</option>
                                    <option value="Main Gate">Main Gate</option>
                                    <option value="Side Gate">Side Gate</option>
                                    <option value="Admin Gate">Admin Gate</option>
                                    <option value="Faculty Gate">Faculty Gate</option>
                                </select>
                            </div>
                        </>
                    )}

                    {selectedReport === 'violations' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Violation Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="dismissed">Dismissed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Violation Type
                                </label>
                                <select
                                    value={filters.violationType}
                                    onChange={(e) => handleFilterChange('violationType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none text-gray-900"
                                    style={{ '--tw-ring-color': '#355E3B' }}
                                >
                                    <option value="">All Types</option>
                                    <option value="1">Unauthorized Parking</option>
                                    <option value="2">Speed Violation</option>
                                    <option value="3">No RFID Tag</option>
                                    <option value="4">Expired Registration</option>
                                    <option value="5">Other</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* Quick Filter Presets */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedReport === 'users' && (
                            <>
                                <button
                                    onClick={() => handleFilterChange('designation', 'Student')}
                                    className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                >
                                    Students Only
                                </button>
                                <button
                                    onClick={() => handleFilterChange('designation', 'Faculty')}
                                    className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                                >
                                    Faculty Only
                                </button>
                                <button
                                    onClick={() => handleFilterChange('status', 'active')}
                                    className="px-3 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                                >
                                    Active Users
                                </button>
                            </>
                        )}

                        {selectedReport === 'vehicles' && (
                            <>
                                <button
                                    onClick={() => handleFilterChange('status', 'approved')}
                                    className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                                >
                                    Approved Vehicles
                                </button>
                                <button
                                    onClick={() => handleFilterChange('status', 'pending')}
                                    className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                                >
                                    Pending Approval
                                </button>
                                <button
                                    onClick={() => handleFilterChange('vehicleType', '2-wheel')}
                                    className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                >
                                    2-Wheel Only
                                </button>
                            </>
                        )}

                        {selectedReport === 'access' && (
                            <>
                                <button
                                    onClick={() => handleFilterChange('entryType', 'entry')}
                                    className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                                >
                                    Entries Only
                                </button>
                                <button
                                    onClick={() => handleFilterChange('entryType', 'exit')}
                                    className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                                >
                                    Exits Only
                                </button>
                            </>
                        )}

                        {selectedReport === 'violations' && (
                            <>
                                <button
                                    onClick={() => handleFilterChange('status', 'pending')}
                                    className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                                >
                                    Pending Violations
                                </button>
                                <button
                                    onClick={() => handleFilterChange('status', 'resolved')}
                                    className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                                >
                                    Resolved Violations
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}