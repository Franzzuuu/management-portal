export function ViolationFilters({ statusFilter, onStatusChange, dateRange, onDateRangeChange }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg 
                                 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                        style={{ '--tw-ring-color': '#355E3B' }}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="disputed">Disputed</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg 
                                 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                        style={{ '--tw-ring-color': '#355E3B' }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg 
                                 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                        style={{ '--tw-ring-color': '#355E3B' }}
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <button
                    onClick={() => {
                        onStatusChange('all');
                        onDateRangeChange({ start: '', end: '' });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                             transition-colors text-sm font-medium"
                >
                    Clear Filters
                </button>
            </div>
        </div>
    );
}