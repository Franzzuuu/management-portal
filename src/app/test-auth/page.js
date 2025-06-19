'use client';

import { useState } from 'react';

export default function TestAuthPage() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const createTestUser = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/test-auth', {
                method: 'POST',
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: 'Failed to create test user' });
        }
        setLoading(false);
    };

    const testLogin = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'admin@test.com',
                    password: 'Admin123!'
                }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: 'Login test failed' });
        }
        setLoading(false);
    };

    const testCurrentUser = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: 'Failed to get current user' });
        }
        setLoading(false);
    };

    const testLogout = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: 'Logout test failed' });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    Authentication System Test
                </h1>

                <div className="space-y-4">
                    <button
                        onClick={createTestUser}
                        disabled={loading}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                        {loading ? 'Loading...' : '1. Create Test Admin User'}
                    </button>

                    <button
                        onClick={testLogin}
                        disabled={loading}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                        {loading ? 'Loading...' : '2. Test Login'}
                    </button>

                    <button
                        onClick={testCurrentUser}
                        disabled={loading}
                        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                        {loading ? 'Loading...' : '3. Get Current User'}
                    </button>

                    <button
                        onClick={testLogout}
                        disabled={loading}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                        {loading ? 'Loading...' : '4. Test Logout'}
                    </button>
                </div>

                {result && (
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Result:</h2>
                        <pre className="bg-gray-100 rounded-md p-4 text-sm overflow-auto">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                        <strong>Test Credentials:</strong><br />
                        Email: admin@test.com<br />
                        Password: Admin123!
                    </p>
                </div>
            </div>
        </div>
    );
}