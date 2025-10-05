'use client';

import { useState, useEffect, useRef } from 'react';

export default function SearchableUserSelect({ value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
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
                    const response = await fetch(
                        `/api/users?query=${encodeURIComponent(query)}`,
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
                        if (data.success && Array.isArray(data.users)) {
                            setUsers(data.users);
                            setHighlightedIndex(0);
                        } else {
                            setUsers([]);
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        // Request was aborted, ignore
                        return;
                    }
                    console.error('Failed to fetch users:', error);
                    if (isMounted) {
                        setUsers([]);
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            } else {
                setUsers([]);
            }
        }, 300);

        return () => {
            isMounted = false;
            controller.abort();
            clearTimeout(timer);
        };
    }, [query]);

    // Fetch initial user data if value is provided
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchInitialUser = async () => {
            if (value) {
                try {
                    const response = await fetch(
                        `/api/users`,
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

                    if (isMounted && data.success && Array.isArray(data.users)) {
                        const user = data.users.find(u => u.id.toString() === value.toString());
                        if (user) {
                            setSelectedUser(user);
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        // Request was aborted, ignore
                        return;
                    }
                    console.error('Failed to fetch initial user:', error);
                }
            } else if (isMounted) {
                setSelectedUser(null);
            }
        };

        fetchInitialUser();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [value]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev =>
                prev < users.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        } else if (e.key === 'Enter' && isOpen) {
            e.preventDefault();
            const selectedUser = users[highlightedIndex];
            if (selectedUser) {
                handleSelect(selectedUser);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelect = (user) => {
        setSelectedUser(user);
        setQuery('');
        setIsOpen(false);
        onChange(user.id.toString());
    };

    const handleClear = () => {
        setSelectedUser(null);
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
                    aria-controls="user-listbox"
                    aria-activedescendant={isOpen ? `user-${highlightedIndex}` : undefined}
                    value={selectedUser ? `${selectedUser.full_name} (${selectedUser.email}) - ${selectedUser.designation}` : query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setSelectedUser(null);
                        onChange('');
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:outline-none placeholder:text-gray-400 text-gray-700"
                    style={{ '--tw-ring-color': '#355E3B' }}
                    placeholder="Search for a user..."
                />
                {(selectedUser || query) && (
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

            {isOpen && ((query.length >= 2 && users.length > 0) || loading) && (
                <ul
                    ref={listboxRef}
                    role="listbox"
                    id="user-listbox"
                    className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg border border-gray-200"
                >
                    {loading ? (
                        <li className="px-4 py-2 text-sm text-gray-500">
                            Loading...
                        </li>
                    ) : users.length > 0 ? (
                        users.map((user, index) => (
                            <li
                                key={user.id}
                                id={`user-${index}`}
                                role="option"
                                aria-selected={index === highlightedIndex}
                                onClick={() => handleSelect(user)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`px-4 py-2 text-sm cursor-pointer ${index === highlightedIndex
                                    ? 'bg-green-50 text-green-900'
                                    : 'text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {user.full_name} ({user.email}) - {user.designation}
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 text-sm text-gray-500">
                            No users found
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
