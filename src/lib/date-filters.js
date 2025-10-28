// src/lib/date-filters.js
export const DATE_PRESETS = {
    ALL_TIME: 'all_time',
    TODAY: 'today',
    YESTERDAY: 'yesterday',
    THIS_WEEK: 'this_week',
    LAST_WEEK: 'last_week',
    THIS_MONTH: 'this_month',
    LAST_MONTH: 'last_month',
    LAST_30_DAYS: 'last_30_days'
};

/**
 * Get date range for filter presets in Asia/Manila timezone
 * Returns UTC timestamps for database queries
 */
export function getDateRange(preset) {
    const now = new Date();
    const phtOffset = 8 * 60; // PHT is UTC+8

    // Get current time in PHT
    const phtNow = new Date(now.getTime() + (phtOffset * 60 * 1000));

    let startDate, endDate;

    switch (preset) {
        case DATE_PRESETS.ALL_TIME:
            return { start: null, end: null }; // No bounds

        case DATE_PRESETS.TODAY:
            startDate = new Date(phtNow);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(phtNow);
            endDate.setHours(23, 59, 59, 999);
            break;

        case DATE_PRESETS.YESTERDAY:
            startDate = new Date(phtNow);
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(phtNow);
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;

        case DATE_PRESETS.THIS_WEEK:
            const dayOfWeek = phtNow.getDay();
            startDate = new Date(phtNow);
            startDate.setDate(startDate.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(phtNow);
            endDate.setHours(23, 59, 59, 999);
            break;

        case DATE_PRESETS.LAST_WEEK:
            const lastWeekStart = new Date(phtNow);
            const daysToLastWeekStart = phtNow.getDay() + 7;
            lastWeekStart.setDate(lastWeekStart.getDate() - daysToLastWeekStart);
            lastWeekStart.setHours(0, 0, 0, 0);

            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
            lastWeekEnd.setHours(23, 59, 59, 999);

            startDate = lastWeekStart;
            endDate = lastWeekEnd;
            break;

        case DATE_PRESETS.THIS_MONTH:
            startDate = new Date(phtNow.getFullYear(), phtNow.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(phtNow);
            endDate.setHours(23, 59, 59, 999);
            break;

        case DATE_PRESETS.LAST_MONTH:
            const lastMonth = new Date(phtNow);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            break;

        case DATE_PRESETS.LAST_30_DAYS:
            startDate = new Date(phtNow);
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(phtNow);
            endDate.setHours(23, 59, 59, 999);
            break;

        default:
            return { start: null, end: null };
    }

    // Convert PHT to UTC for database queries
    const startUTC = new Date(startDate.getTime() - (phtOffset * 60 * 1000));
    const endUTC = new Date(endDate.getTime() - (phtOffset * 60 * 1000));

    return {
        start: startUTC.toISOString(),
        end: endUTC.toISOString()
    };
}

export function formatDateLabel(preset) {
    switch (preset) {
        case DATE_PRESETS.ALL_TIME: return 'All Time';
        case DATE_PRESETS.TODAY: return 'Today';
        case DATE_PRESETS.YESTERDAY: return 'Yesterday';
        case DATE_PRESETS.THIS_WEEK: return 'This Week';
        case DATE_PRESETS.LAST_WEEK: return 'Last Week';
        case DATE_PRESETS.THIS_MONTH: return 'This Month';
        case DATE_PRESETS.LAST_MONTH: return 'Last Month';
        case DATE_PRESETS.LAST_30_DAYS: return 'Last 30 Days';
        default: return 'All Time';
    }
}