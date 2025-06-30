export function ViolationTable({ violations, onViolationClick, loading }) {
    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
            resolved: 'bg-green-100 text-green-800 border border-green-300',
            disputed: 'bg-red-100 text-red-800 border border-red-300'
        };
        return badges[status] || badges.pending;
    };

    const getSeverityBadge = (severity) => {
        const badges = {
            low: 'bg-blue-100 text-blue-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-red-100 text-red-800'
        };
        return badges[severity?.toLowerCase()] || badges.medium;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" style={{ color: '#355E3B' }} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Loading violations...</span>
                </div>
            </div>
        );
    }

    if (violations.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No violations found</h3>
                <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200" style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                <h3 className="text-lg font-semibold text-white">Violations List</h3>
                <p className="text-sm" style={{ color: '#FFD700' }}>
                    {violations.length} violation{violations.length !== 1 ? 's' : ''} found
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Vehicle
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Violation
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {violations.map((violation) => (
                            <tr key={violation.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700">
                                                {violation.studentName?.charAt(0)?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {violation.studentName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                ID: {violation.studentId}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{violation.plateNumber}</div>
                                    <div className="text-sm text-gray-500">{violation.vehicleType}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{violation.violationType}</div>
                                    <div className="text-sm text-gray-500 max-w-xs truncate">
                                        {violation.description}
                                    </div>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityBadge(violation.severity)}`}>
                                        {violation.severity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(violation.status)}`}>
                                        {violation.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(violation.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => onViolationClick(violation)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => onViolationClick(violation)}
                                        className="text-green-600 hover:text-green-900"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
