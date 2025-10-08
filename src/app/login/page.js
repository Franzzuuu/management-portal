'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
    const [formData, setFormData] = useState({
        identifier: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

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
                if (data.mustChangePassword) {
                    router.push('/change-password');
                } else {
                    const role = data.user.designation;
                    if (role === 'Admin') {
                        router.push('/admin');
                    } else if (role === 'Security') {
                        router.push('/security');
                    } else {
                        router.push('/carolinian');
                    }
                }
            } else if (data.mustChangePassword) {
                setError(data.message || 'Your password must be changed by an administrator before you can log in.');
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
            className="min-h-screen flex items-center justify-center py-4 px-4 sm:py-8 sm:px-6 lg:px-8"
            style={{
                backgroundColor: '#355E3B',
                backgroundImage: "url('/images/ismisbg.jpg'), linear-gradient(135deg, #355E3B 0%, #2d4f32 50%, #1e3322 100%)",
                backgroundSize: 'cover, cover',
                backgroundPosition: 'center, center',
                backgroundRepeat: 'no-repeat, no-repeat',
                backgroundAttachment: 'fixed'
            }}
        >
            <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                <div className="text-center mb-6 sm:mb-8">

                    <div className="flex justify-center items-center gap-4 mb-8">
                        <Image
                            src="/images/USC_seal.svg"
                            alt="USC Seal"
                            width={128}
                            height={128}
                            className="h-64 w-64 sm:h-36 sm:w-36 drop-shadow-lg"
                            priority
                        />
                    </div>

                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white drop-shadow-2xl mb-2">
                            Management Portal
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-200 drop-shadow opacity-90 px-4">
                            Integrated Sticker System for Seamless Vehicle Identification
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="bg-white/95 backdrop-blur-sm py-6 sm:py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/30">
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="identifier" className="block text-xs sm:text-sm font-medium mb-2" style={{ color: '#355E3B' }}>
                                    Email or USC ID
                                </label>
                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="text"
                                    required
                                    className="block w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg shadow-sm 
                                             text-sm text-black placeholder-gray-400 transition-all duration-200
                                             focus:outline-none focus:ring-2 focus:border-transparent"
                                    style={{
                                        '--tw-ring-color': '#355E3B'
                                    }}
                                    placeholder="Enter your email or USC ID"
                                    value={formData.identifier}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-xs sm:text-sm font-medium mb-2" style={{ color: '#355E3B' }}>
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="block w-full px-3 py-2.5 sm:py-3 pr-10 border border-gray-300 rounded-lg shadow-sm 
                                                 text-sm text-black placeholder-gray-400 transition-all duration-200
                                                 focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{
                                            '--tw-ring-color': '#355E3B'
                                        }}
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-sm">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-2">
                                        <p className="text-xs sm:text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 sm:py-3.5 px-4 border border-transparent rounded-lg shadow-lg text-sm sm:text-base font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-opacity-50 active:transform active:scale-95"
                                style={{
                                    backgroundColor: '#355E3B',
                                    focusRingColor: '#355E3B'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2d4f32'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#355E3B'}
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            </div>
        </div>
    );
}