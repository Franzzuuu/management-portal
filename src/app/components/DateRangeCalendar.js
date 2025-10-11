import { useState, useEffect } from 'react';

export default function DateRangeCalendar({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    className = '',
    showTime = true
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedView, setSelectedView] = useState('start'); // 'start' or 'end'

    // Format date for input[type="datetime-local"]
    const formatForDateTimeLocal = (date) => {
        if (!date) return '';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return ''; // Check for invalid date
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            return d.toISOString().slice(0, 16);
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    // Parse datetime-local value back to Date
    const parseFromDateTimeLocal = (value) => {
        if (!value) return null;
        return new Date(value);
    };

    const today = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startCalendar = new Date(firstDayOfMonth);
    startCalendar.setDate(startCalendar.getDate() - firstDayOfMonth.getDay());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const generateCalendarDays = () => {
        const days = [];
        const current = new Date(startCalendar);

        for (let i = 0; i < 42; i++) { // 6 weeks x 7 days
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    const calendarDays = generateCalendarDays();

    const isDateInRange = (date) => {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return date >= start && date <= end;
    };

    const isDateSelected = (date) => {
        const dateStr = date.toDateString();
        const startStr = startDate ? new Date(startDate).toDateString() : null;
        const endStr = endDate ? new Date(endDate).toDateString() : null;
        return dateStr === startStr || dateStr === endStr;
    };

    const handleDateClick = (date) => {
        const newDate = new Date(date);

        if (selectedView === 'start') {
            // If setting start date and it's after end date, clear end date
            if (endDate && newDate > new Date(endDate)) {
                onEndDateChange(null);
            }
            onStartDateChange(newDate);
            setSelectedView('end');
        } else {
            // If setting end date and it's before start date, set as start date instead
            if (startDate && newDate < new Date(startDate)) {
                onStartDateChange(newDate);
                onEndDateChange(null);
                setSelectedView('end');
            } else {
                onEndDateChange(newDate);
            }
        }
    };

    const navigateMonth = (direction) => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            newMonth.setMonth(newMonth.getMonth() + direction);
            return newMonth;
        });
    };

    const quickPresets = [
        {
            label: 'Today',
            start: new Date(new Date().setHours(0, 0, 0, 0)),
            end: new Date(new Date().setHours(23, 59, 59, 999))
        },
        {
            label: 'Yesterday',
            start: (() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                return yesterday;
            })(),
            end: (() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(23, 59, 59, 999);
                return yesterday;
            })()
        },
        {
            label: 'Last 7 Days',
            start: (() => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                return sevenDaysAgo;
            })(),
            end: new Date()
        },
        {
            label: 'Last 30 Days',
            start: (() => {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
                thirtyDaysAgo.setHours(0, 0, 0, 0);
                return thirtyDaysAgo;
            })(),
            end: new Date()
        },
    ];

    const applyPreset = (preset) => {
        onStartDateChange(preset.start);
        onEndDateChange(preset.end);
    };

    return (
        <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
            {/* Quick Presets */}
            <div className="p-4 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Select</h4>
                <div className="grid grid-cols-2 gap-2">
                    {quickPresets.map((preset, index) => (
                        <button
                            key={index}
                            onClick={() => applyPreset(preset)}
                            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Date/Time Inputs */}
            {showTime && (
                <div className="p-4 border-b border-gray-200 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={formatForDateTimeLocal(startDate)}
                            onChange={(e) => onStartDateChange(parseFromDateTimeLocal(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent text-sm text-gray-900"
                            style={{ '--tw-ring-color': '#355E3B' }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={formatForDateTimeLocal(endDate)}
                            onChange={(e) => onEndDateChange(parseFromDateTimeLocal(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent text-sm text-gray-900"
                            style={{ '--tw-ring-color': '#355E3B' }}
                            min={formatForDateTimeLocal(startDate)}
                        />
                    </div>
                </div>
            )}

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h3 className="text-lg font-semibold" style={{ color: '#355E3B' }}>
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>

                    <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Selection Mode Indicator */}
                <div className="flex justify-center mb-4">
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                        <button
                            onClick={() => setSelectedView('start')}
                            className={`px-3 py-1 text-sm font-medium transition-colors ${selectedView === 'start'
                                ? 'text-white'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            style={selectedView === 'start' ? { backgroundColor: '#355E3B' } : {}}
                        >
                            Start Date
                        </button>
                        <button
                            onClick={() => setSelectedView('end')}
                            className={`px-3 py-1 text-sm font-medium transition-colors ${selectedView === 'end'
                                ? 'text-white'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            style={selectedView === 'end' ? { backgroundColor: '#355E3B' } : {}}
                        >
                            End Date
                        </button>
                    </div>
                </div>

                {/* Day Names */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((date, index) => {
                        const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                        const isToday = date.toDateString() === today.toDateString();
                        const isSelected = isDateSelected(date);
                        const isInRange = isDateInRange(date);
                        const isPast = date < today && !isToday;

                        return (
                            <button
                                key={index}
                                onClick={() => handleDateClick(date)}
                                disabled={!isCurrentMonth}
                                className={`
                                    relative p-2 text-sm rounded-lg transition-all duration-200 hover:scale-105
                                    ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}
                                    ${isToday ? 'ring-2 ring-offset-2' : ''}
                                    ${isSelected ? 'text-white font-bold' : ''}
                                    ${isInRange && !isSelected ? 'bg-green-50 text-green-800' : ''}
                                    ${isPast && isCurrentMonth ? 'opacity-60' : ''}
                                `}
                                style={{
                                    backgroundColor: isSelected ? '#355E3B' : isInRange ? '#f0f9f0' : '',
                                    ringColor: isToday ? '#FFD700' : ''
                                }}
                            >
                                {date.getDate()}
                                {isToday && (
                                    <div
                                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                                        style={{ backgroundColor: isSelected ? '#FFD700' : '#355E3B' }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Range Display */}
            {(startDate || endDate) && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Selected Range:</span>
                        <div className="mt-1 text-xs">
                            <div>Start: {startDate ? startDate.toLocaleString() : 'Not selected'}</div>
                            <div>End: {endDate ? endDate.toLocaleString() : 'Not selected'}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}