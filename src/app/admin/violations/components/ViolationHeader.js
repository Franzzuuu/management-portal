export function ViolationHeader({ router, onExport, totalViolations }) {
    return (
        <header className="shadow-lg border-b-2" style={{ backgroundColor: '#355E3B', borderBottomColor: '#FFD700' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center">
                        <button
                            onClick={() => router.push('/admin')}
                            className="mr-4 text-white hover:text-yellow-300 transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <img src="/images/usclogo.png" alt="USC Logo" className="h-16 w-auto" />
                        </div>
                        <div className="ml-4">
                            <h1 className="text-2xl font-bold text-white">Violation Management</h1>
                            <p className="text-sm" style={{ color: '#FFD700' }}>
                                University of San Carlos - RFID Vehicle System
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right text-white">
                            <p className="text-sm opacity-90">Total Violations</p>
                            <p className="text-xl font-bold" style={{ color: '#FFD700' }}>{totalViolations}</p>
                        </div>
                        <button
                            onClick={onExport}
                            className="bg-white text-green-700 px-4 py-2 rounded-lg font-medium 
                                     hover:bg-gray-100 transition-colors flex items-center space-x-2"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}