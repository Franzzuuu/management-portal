'use client';

import { useState, useEffect, useRef } from 'react';

export default function SearchableVehicleSelectForViolations({ value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const inputRef = useRef(null);
    const listboxRef = useRef(null);

    // Debounced search function
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    // Add query parameter to search based on plate number, make, model, or owner name
                    const response = await fetch(
                        `/api/vehicles/search?query=${encodeURIComponent(query)}`,
                        {
                            signal: controller.signal,
                            headers: {
                                'Accept': 'application/json'
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    if (isMounted) {
                        if (data.success && Array.isArray(data.vehicles)) {
                            // Filter for only approved vehicles (for violations, we don't care about RFID status)
                            const approvedVehicles = data.vehicles.filter(v =>
                                v.approval_status === 'approved'
                            );
                            setVehicles(approvedVehicles);
                            setHighlightedIndex(0);
                        } else {
                            setVehicles([]);
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return; // Request was aborted, ignore
                    }
                    console.error('Failed to fetch vehicles:', error);
                    if (isMounted) {
                        setVehicles([]);
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            } else {
                setVehicles([]);
            }
        }, 300); // 300ms debounce delay

        return () => {
            isMounted = false;
            controller.abort();
            clearTimeout(timer);
        };
    }, [query]);

    // Fetch initial vehicle data if value is provided
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchInitialVehicle = async () => {
            if (value) {
                try {
                    // Get specific vehicle by ID
                    const response = await fetch(
                        `/api/vehicles/${value}`,
                        {
                            signal: controller.signal,
                            headers: {
                                'Accept': 'application/json'
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    if (isMounted && data.success && data.vehicle) {
                        setSelectedVehicle(data.vehicle);
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return; // Request was aborted, ignore
                    }
                    console.error('Failed to fetch initial vehicle:', error);
                }
            } else if (isMounted) {
                setSelectedVehicle(null);
            }
        };

        fetchInitialVehicle();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [value]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev =>
                prev < vehicles.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        } else if (e.key === 'Enter' && isOpen) {
            e.preventDefault();
            const selectedVehicle = vehicles[highlightedIndex];
            if (selectedVehicle) {
                handleSelect(selectedVehicle);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelect = (vehicle) => {
        setSelectedVehicle(vehicle);
        setQuery('');
        setIsOpen(false);
        onChange(vehicle.vehicle_id.toString());
    };

    const handleClear = () => {
        setSelectedVehicle(null);
        setQuery('');
        onChange('');
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="vehicle-listbox"
                    aria-activedescendant={isOpen ? `vehicle-${highlightedIndex}` : undefined}
                    value={selectedVehicle ? `${selectedVehicle.plate_number} - ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.owner_name} - USC ID: ${selectedVehicle.usc_id}) ${selectedVehicle.tag_uid ? `[RFID: ${selectedVehicle.tag_uid}]` : ''}` : query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setSelectedVehicle(null);
                        onChange('');
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-900"
                    style={{ '--tw-ring-color': '#355E3B' }}
                    placeholder="Search for a vehicle..."
                />
                {(selectedVehicle || query) && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {isOpen && ((query.length >= 2 && vehicles.length > 0) || loading) && (
                <ul
                    ref={listboxRef}
                    role="listbox"
                    id="vehicle-listbox"
                    className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg border border-gray-200"
                >
                    {loading ? (
                        <li className="px-4 py-2 text-sm text-gray-500">
                            Loading...
                        </li>
                    ) : vehicles.length > 0 ? (
                        vehicles.map((vehicle, index) => (
                            <li
                                key={vehicle.vehicle_id}
                                id={`vehicle-${index}`}
                                role="option"
                                aria-selected={index === highlightedIndex}
                                onClick={() => handleSelect(vehicle)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`px-4 py-2 text-sm cursor-pointer ${index === highlightedIndex
                                    ? 'bg-green-50 text-green-900'
                                    : 'text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {vehicle.plate_number} - {vehicle.make} {vehicle.model} ({vehicle.owner_name} - USC ID: {vehicle.usc_id}) {vehicle.tag_uid ? `[RFID: ${vehicle.tag_uid}]` : ''}
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 text-sm text-gray-500">
                            No vehicles found
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}