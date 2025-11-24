'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';

export default function DatabaseMigrationPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const runMigration = async () => {
        setIsRunning(true);
        setResult('');
        setError('');

        try {
            const response = await fetch('/api/admin/migrate-violations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setResult('✅ Migration completed successfully!\n\n' + data.details.join('\n'));
            } else {
                setError('❌ Migration failed: ' + data.error);
            }
        } catch (err) {
            setError('❌ Migration failed: ' + err.message);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={{ designation: 'Admin' }} onLogout={handleLogout} />
            
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* Navigation */}
                <div className="mb-6">
                    <BackButton text="Back to Dashboard" fallbackPath="/admin" />
                </div>
                
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-4" style={{ color: '#355E3B' }}>
                            Database Migration
                        </h1>
                        <p className="text-gray-600">
                            Run this migration to add enhanced violations system features
                        </p>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4" style={{ color: '#355E3B' }}>
                            What this migration will do:
                        </h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-700">
                            <li>Add new tables: violation_status_history, violation_contests, notifications</li>
                            <li>Add new columns to violations table for images and enhanced tracking</li>
                            <li>Create performance indexes for faster queries</li>
                            <li>Add database triggers for automatic updates</li>
                            <li>Create stored procedures for statistics generation</li>
                            <li>Insert default violation types and user preferences</li>
                        </ul>
                    </div>

                    <div className="text-center mb-8">
                        <button
                            onClick={runMigration}
                            disabled={isRunning}
                            className={`px-8 py-4 rounded-lg font-semibold text-white transition-all duration-200 ${isRunning
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'hover:shadow-xl transform hover:scale-105'
                                }`}
                            style={{ backgroundColor: isRunning ? undefined : '#355E3B' }}
                        >
                            {isRunning ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Running Migration...</span>
                                </div>
                            ) : (
                                'Run Database Migration'
                            )}
                        </button>
                    </div>

                    {result && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                            <h3 className="text-green-800 font-semibold mb-2">Migration Results:</h3>
                            <pre className="text-green-700 text-sm whitespace-pre-wrap">{result}</pre>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                            <h3 className="text-red-800 font-semibold mb-2">Migration Error:</h3>
                            <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
                        </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <h3 className="text-yellow-800 font-semibold mb-2">⚠️ Important Notes:</h3>
                        <ul className="text-yellow-700 text-sm space-y-1">
                            <li>• This migration is safe and wont delete existing data</li>
                            <li>• You can run this migration multiple times safely</li>
                            <li>• Make sure your MySQL server is running</li>
                            <li>• After successful migration, you can access enhanced violations features</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}