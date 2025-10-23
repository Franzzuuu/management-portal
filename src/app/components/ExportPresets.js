'use client';

import { useState, useEffect, useCallback } from 'react';

export default function ExportPresets({
    selectedReport,
    dateRange,
    advancedFilters,
    onExport
}) {
    const [showModal, setShowModal] = useState(false);
    const [presets, setPresets] = useState([]);
    const [newPreset, setNewPreset] = useState({
        name: '',
        description: '',
        format: 'csv',
        mode: 'view',
        anonymize: false,
        includeFilters: true
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchPresets = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/reports/presets?reportType=${selectedReport}`);
            const data = await response.json();
            if (data.success) {
                setPresets(data.presets || []);
            }
        } catch (error) {
            console.error('Failed to fetch presets:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedReport]);

    useEffect(() => {
        if (showModal) {
            fetchPresets();
        }
    }, [showModal, fetchPresets]);

    const savePreset = async () => {
        setIsSaving(true);
        try {
            const presetData = {
                name: newPreset.name,
                description: newPreset.description,
                reportType: selectedReport,
                filters: newPreset.includeFilters ? {
                    ...advancedFilters,
                    dateRange
                } : {},
                format: newPreset.format,
                mode: newPreset.mode,
                anonymize: newPreset.anonymize
            };

            const response = await fetch('/api/reports/presets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(presetData)
            });

            const data = await response.json();
            if (data.success) {
                setNewPreset({
                    name: '',
                    description: '',
                    format: 'csv',
                    mode: 'view',
                    anonymize: false,
                    includeFilters: true
                });
                await fetchPresets();
                alert('Preset saved successfully!');
            } else {
                alert(data.error || 'Failed to save preset');
            }
        } catch (error) {
            console.error('Failed to save preset:', error);
            alert('Failed to save preset');
        } finally {
            setIsSaving(false);
        }
    };

    const applyPreset = (preset) => {
        const exportData = {
            reportType: selectedReport,
            format: preset.format,
            mode: preset.mode,
            anonymize: preset.anonymize,
            filters: preset.filters,
            dateRange: preset.filters.dateRange || dateRange
        };
        onExport(exportData);
        setShowModal(false);
    };

    const deletePreset = async (presetId) => {
        if (!confirm('Are you sure you want to delete this preset?')) return;

        try {
            const response = await fetch(`/api/reports/presets?id=${presetId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                await fetchPresets();
                alert('Preset deleted successfully!');
            } else {
                alert(data.error || 'Failed to delete preset');
            }
        } catch (error) {
            console.error('Failed to delete preset:', error);
            alert('Failed to delete preset');
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 flex items-center space-x-2"
                style={{ backgroundColor: '#355E3B' }}
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Export Presets</span>
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div
                        className="rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative"
                        style={{
                            backgroundImage: "url('/images/ismisbg.jpg')",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}
                    >
                        {/* Overlay for better text readability */}
                        <div className="absolute inset-0 bg-white bg-opacity-95 rounded-xl"></div>

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" style={{ backgroundColor: '#355E3B' }}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">Export Presets</h3>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-white hover:text-gray-200 transition-colors"
                                    >
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Existing Presets */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Saved Presets</h4>
                                        {isLoading ? (
                                            <div className="text-center py-8">
                                                <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#355E3B', borderTopColor: 'transparent' }}></div>
                                                <p className="text-gray-900 mt-2">Loading presets...</p>
                                            </div>
                                        ) : presets.length > 0 ? (
                                            <div className="space-y-3">
                                                {presets.map((preset) => (
                                                    <div key={preset.id} className="border border-gray-200 rounded-lg p-4 bg-white bg-opacity-80">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <h5 className="font-medium text-gray-900">{preset.name}</h5>
                                                                {preset.description && (
                                                                    <p className="text-sm text-gray-700 mt-1">{preset.description}</p>
                                                                )}
                                                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-700">
                                                                    <span className="px-2 py-1 rounded uppercase" style={{ backgroundColor: '#FFD700', color: '#355E3B' }}>
                                                                        {preset.format}
                                                                    </span>
                                                                    <span>{preset.mode === 'view' ? 'Summary' : 'Full Data'}</span>
                                                                    {preset.anonymize && (
                                                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                                            Anonymized
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2 ml-4">
                                                                <button
                                                                    onClick={() => applyPreset(preset)}
                                                                    className="px-3 py-1 text-white text-sm rounded hover:bg-opacity-90 transition-colors"
                                                                    style={{ backgroundColor: '#355E3B' }}
                                                                >
                                                                    Use
                                                                </button>
                                                                <button
                                                                    onClick={() => deletePreset(preset.id)}
                                                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-900">
                                                <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                </svg>
                                                <p>No presets saved yet</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Create New Preset */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New Preset</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                                    Preset Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newPreset.name}
                                                    onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                                                    placeholder="e.g., Monthly User Report"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none bg-white bg-opacity-90 text-gray-900"
                                                    style={{ '--tw-ring-color': '#355E3B' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={newPreset.description}
                                                    onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                                                    placeholder="Optional description..."
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none bg-white bg-opacity-90 text-gray-900"
                                                    style={{ '--tw-ring-color': '#355E3B' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                                    Export Format
                                                </label>
                                                <select
                                                    value={newPreset.format}
                                                    onChange={(e) => setNewPreset({ ...newPreset, format: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none bg-white bg-opacity-90 text-gray-900"
                                                    style={{ '--tw-ring-color': '#355E3B' }}
                                                >
                                                    <option value="csv">CSV</option>
                                                    <option value="xlsx">Excel (XLSX)</option>
                                                    <option value="pdf">PDF</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                                    Data Mode
                                                </label>
                                                <select
                                                    value={newPreset.mode}
                                                    onChange={(e) => setNewPreset({ ...newPreset, mode: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none bg-white bg-opacity-90 text-gray-900"
                                                    style={{ '--tw-ring-color': '#355E3B' }}
                                                >
                                                    <option value="view">Summary View</option>
                                                    <option value="full">Full Data Export</option>
                                                </select>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="includeFilters"
                                                        checked={newPreset.includeFilters}
                                                        onChange={(e) => setNewPreset({ ...newPreset, includeFilters: e.target.checked })}
                                                        className="h-4 w-4 border-gray-300 rounded focus:ring-2"
                                                        style={{ accentColor: '#355E3B' }}
                                                    />
                                                    <label htmlFor="includeFilters" className="ml-2 text-sm text-gray-900">
                                                        Save current filters and date range
                                                    </label>
                                                </div>

                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="anonymize"
                                                        checked={newPreset.anonymize}
                                                        onChange={(e) => setNewPreset({ ...newPreset, anonymize: e.target.checked })}
                                                        className="h-4 w-4 border-gray-300 rounded focus:ring-2"
                                                        style={{ accentColor: '#355E3B' }}
                                                    />
                                                    <label htmlFor="anonymize" className="ml-2 text-sm text-gray-900">
                                                        Anonymize personal data
                                                    </label>
                                                </div>
                                            </div>

                                            <button
                                                onClick={savePreset}
                                                disabled={!newPreset.name.trim() || isSaving}
                                                className="w-full px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                                style={{ backgroundColor: '#355E3B' }}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                        <span>Saving...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>Save Preset</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}