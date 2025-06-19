'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Base64 encoded background image - replace with your image
    const backgroundImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNzA5MGE2O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM0Yjc2ODg7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNncmFkaWVudCkiIC8+Cjwvc3ZnPgo=";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                // Redirect based on user role
                const role = data.user.designation;
                if (role === 'Admin') {
                    router.push('/admin');
                } else if (role === 'Staff') {
                    router.push('/security');
                } else {
                    router.push('/student');
                }
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        }

        setLoading(false);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8"
            style={{
                backgroundColor: '#355E3B', // Fallback color
                backgroundImage: "url('/images/ismisbg.jpg'), linear-gradient(135deg, #355E3B 0%, #2d4f32 50%, #1e3322 100%)",
                backgroundSize: 'cover, cover',
                backgroundPosition: 'center, center',
                backgroundRepeat: 'no-repeat, no-repeat'
            }}
        >

            <div className="max-w-sm w-full space-y-4">
                <div className="text-center">

                    <div>
                        <img src="/images/logousc.png" alt="Logo" className="mx-auto h-32 w-auto" />
                    </div>

                    <h2 className="mt-4 text-3xl font-bold text-white drop-shadow-lg">
                        Management Portal
                    </h2>
                    <p className="mt-1 text-base text-gray-200 drop-shadow">
                        University of San Carlos - Talamban Campus
                    </p>
                    <p className="text-sm text-gray-300 drop-shadow">
                        Integrated Sticker System for Seamless Vehicle Identification
                    </p>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="bg-white/95 backdrop-blur-sm py-6 px-5 shadow-2xl rounded-xl border border-white/20">
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium" style={{ color: '#355E3B' }}>
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                                    style={{
                                        focusRingColor: '#355E3B',
                                        '--tw-ring-color': '#355E3B'
                                    }}
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#355E3B' }}>
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                                    style={{
                                        focusRingColor: '#355E3B',
                                        '--tw-ring-color': '#355E3B'
                                    }}
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="mt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:-translate-y-0.5"
                                style={{
                                    backgroundColor: '#355E3B',
                                    ':hover': { backgroundColor: '#2d4f32' }
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2d4f32'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#355E3B'}
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="text-center">
                    <div className="mt-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                        <p className="text-sm text-white">
                            <span style={{ color: '#FFD700' }}>Test Credentials:</span><br />
                            <span className="font-mono">admin@test.com</span><br />
                            <span className="font-mono">Admin123!</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}