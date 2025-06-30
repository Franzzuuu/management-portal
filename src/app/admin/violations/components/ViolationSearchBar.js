import { useState, useRef, useEffect } from 'react';

export default function ViolationSearchBar({
    searchQuery,
    onSearchChange,
    suggestions,
    showSuggestions,
    onSuggestionSelect,
    onSuggestionsClear
}) {
    const [isFocused, setIsFocused] = useState(false);
    const searchInputRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                onSuggestionsClear();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onSuggestionsClear]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        onSearchChange(value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onSuggestionsClear();
            searchInputRef.current?.blur();
        }
    };

    const handleSuggestionClick = (suggestion) => {
        onSuggestionSelect(suggestion);
        searchInputRef.current?.focus();
    };

    const clearSearch = () => {
        onSearchChange('');
        onSuggestionsClear();
        searchInputRef.current?.focus();
    };

    return (
        <div className="relative">
            <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 relative">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg
                                className="h-5 w-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg 
                                     focus:outline-none focus:ring-2 focus:border-transparent
                                     placeholder-gray-400 text-sm transition-all duration-200
                                     hover:border-gray-400"
                            style={{ '--tw-ring-color': '#355E3B' }}
                            placeholder="Search by student name, plate number, violation type, or description..."
                            autoComplete="off"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center 
                                         text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div
                            ref={suggestionsRef}
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 
                                     rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                            <div className="p-2">
                                <div className="text-xs text-gray-500 mb-2 px-2">
                                    {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
                                </div>
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion.value)}
                                        className="w-full text-left px-3 py-2 rounded-md 
                                                 hover:bg-gray-100 transition-colors duration-150
                                                 focus:outline-none focus:bg-gray-100"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0">
                                                {suggestion.type === 'name' && (
                                                    <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                )}
                                                {suggestion.type === 'plate' && (
                                                    <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                                {suggestion.type === 'violation' && (
                                                    <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {suggestion.value}
                                                </div>
                                                <div className="text-xs text-gray-500 capitalize">
                                                    {suggestion.type === 'name' ? 'Student Name' :
                                                        suggestion.type === 'plate' ? 'Plate Number' :
                                                            'Violation Type'}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Search Filters */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onSearchChange('')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                  ${!searchQuery ?
                                'bg-gradient-to-r from-green-700 to-green-600 text-white' :
                                'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => onSearchChange('pending')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                  ${searchQuery === 'pending' ?
                                'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => onSearchChange('resolved')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                  ${searchQuery === 'resolved' ?
                                'bg-green-100 text-green-800 border border-green-300' :
                                'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Resolved
                    </button>
                    <button
                        onClick={() => onSearchChange('disputed')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                  ${searchQuery === 'disputed' ?
                                'bg-red-100 text-red-800 border border-red-300' :
                                'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Disputed
                    </button>
                </div>
            </div>

            {/* Search Results Summary */}
            {searchQuery && (
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>
                        Search results for: <span className="font-medium">&quot{searchQuery}&quot</span>
                    </span>
                    <button
                        onClick={clearSearch}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Clear search
                    </button>
                </div>
            )}
        </div>
    );
}