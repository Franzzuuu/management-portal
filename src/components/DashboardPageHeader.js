// Redesigned PageHeader.js component
import { useRouter } from 'next/navigation';

export default function PageHeader({
    title,
    user = null,
    onLogout = null
}) {
    const router = useRouter();

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
    };

    const handleBackToDashboard = () => {
        router.push('/admin');
    };

    return (
        <header className="bg-green-800 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">

                    {/* Left Section - USC Logo and System Name */}
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                            <img
                                src="/images/usclogo.png"
                                alt="USC Logo"
                                className="h-12 w-12 object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">
                                RFID Vehicle Management Portal
                            </h1>
                            <p className="text-sm text-yellow-400">
                                University of San Carlos - Talamban Campus
                            </p>
                        </div>
                    </div>


                    {/* Right Section - User Info and Actions */}
                    <div className="flex items-center space-x-4">
                        {/* User Information */}
                        {user && (
                            <div className="hidden sm:flex items-center">
                                <div className="text-right">
                                    <p className="text-sm text-white font-medium">
                                        {user?.fullName || user?.email}
                                    </p>
                                    <p className="text-xs text-yellow-400">
                                        Logged in
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleBackToDashboard}
                                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-green-800 bg-yellow-400 rounded-md hover:bg-yellow-500 transition-colors duration-200"
                            >
                                Dashboard
                            </button>

                            {onLogout && (
                                <button
                                    onClick={handleLogout}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200"
                                >
                                    Logout
                                </button>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="sm:hidden">
                            <button
                                onClick={handleBackToDashboard}
                                className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Page Title */}
                <div className="md:hidden pb-3">
                    <h2 className="text-base font-medium text-white text-center">
                        {title}
                    </h2>
                </div>
            </div>
        </header>
    );
}

// Alternative compact version for simpler pages
export function CompactPageHeader({ title, user = null, onLogout = null }) {
    const router = useRouter();

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
    };

    const handleBackToDashboard = () => {
        router.push('/admin');
    };

    return (
        <header className="bg-green-800 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">

                    {/* Left - Logo and Title */}
                    <div className="flex items-center space-x-3">
                        <img
                            src="/images/usclogo.png"
                            alt="USC Logo"
                            className="h-10 w-10 object-contain"
                        />
                        <div>
                            <h1 className="text-base font-bold text-white">
                                {title}
                            </h1>
                            <p className="text-xs text-yellow-400">
                                USC - Talamban Campus
                            </p>
                        </div>
                    </div>

                    {/* Right - User and Actions */}
                    <div className="flex items-center space-x-3">
                        {user && (
                            <div className="hidden sm:block text-right">
                                <p className="text-sm text-white font-medium">
                                    {user?.fullName || user?.email}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleBackToDashboard}
                                className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                                title="Back to Dashboard"
                            >
                                Dashboard
                            </button>

                            {onLogout && (
                                <button
                                    onClick={handleLogout}
                                    className="text-red-400 hover:text-red-300 transition-colors duration-200"
                                    title="Logout"
                                >
                                    Logout
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
