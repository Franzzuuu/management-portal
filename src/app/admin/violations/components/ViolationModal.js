export function ViolationModal({ violation, onClose, onUpdate }) {
    const [editedViolation, setEditedViolation] = useState(violation);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(editedViolation);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Violation Details</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Student Name</label>
                            <input
                                type="text"
                                value={editedViolation.studentName}
                                readOnly
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Plate Number</label>
                            <input
                                type="text"
                                value={editedViolation.plateNumber}
                                readOnly
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                value={editedViolation.status}
                                onChange={(e) => setEditedViolation({ ...editedViolation, status: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="pending">Pending</option>
                                <option value="resolved">Resolved</option>
                                <option value="disputed">Disputed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Severity</label>
                            <select
                                value={editedViolation.severity}
                                onChange={(e) => setEditedViolation({ ...editedViolation, severity: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white rounded-lg"
                            style={{ backgroundColor: '#355E3B' }}
                        >
                            Update
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}