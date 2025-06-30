import { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

export function useSearch(violations = []) {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Debounced function to fetch suggestions from API
    const debouncedFetchSuggestions = useCallback(
        debounce(async (query) => {
            if (query.length < 2) {
                setSuggestions([]);
                setShowSuggestions(false);
                setIsSearching(false);
                return;
            }

            try {
                setIsSearching(true);
                const response = await fetch(`/api/violations/search?q=${encodeURIComponent(query)}`);

                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data.suggestions || []);
                    setShowSuggestions(data.suggestions?.length > 0);
                }
            } catch (error) {
                console.error('Error fetching search suggestions:', error);
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsSearching(false);
            }
        }, 300),
        []
    );

    // Local suggestions based on current violations data
    const localSuggestions = useMemo(() => {
        if (!searchQuery || searchQuery.length < 2) return [];

        const query = searchQuery.toLowerCase();
        const suggestionSet = new Set();

        violations.forEach(violation => {
            // Student names
            if (violation.studentName?.toLowerCase().includes(query)) {
                suggestionSet.add(JSON.stringify({
                    value: violation.studentName,
                    type: 'name',
                    count: 1
                }));
            }

            // Plate numbers
            if (violation.plateNumber?.toLowerCase().includes(query)) {
                suggestionSet.add(JSON.stringify({
                    value: violation.plateNumber,
                    type: 'plate',
                    count: 1
                }));
            }

            // Violation types
            if (violation.violationType?.toLowerCase().includes(query)) {
                suggestionSet.add(JSON.stringify({
                    value: violation.violationType,
                    type: 'violation',
                    count: 1
                }));
            }
        });

        return Array.from(suggestionSet)
            .map(item => JSON.parse(item))
            .slice(0, 5);
    }, [violations, searchQuery]);

    // Combined suggestions (API + local)
    const combinedSuggestions = useMemo(() => {
        const apiSuggestions = suggestions || [];
        const combined = [...apiSuggestions, ...localSuggestions];

        // Remove duplicates based on value
        const unique = combined.filter((item, index, arr) =>
            arr.findIndex(i => i.value === item.value) === index
        );

        return unique.slice(0, 8);
    }, [suggestions, localSuggestions]);

    const handleSearchChange = useCallback((query) => {
        setSearchQuery(query);

        if (query.trim()) {
            debouncedFetchSuggestions(query);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setIsSearching(false);
        }
    }, [debouncedFetchSuggestions]);

    const handleSuggestionSelect = useCallback((suggestion) => {
        setSearchQuery(suggestion);
        setShowSuggestions(false);
        setSuggestions([]);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        setIsSearching(false);
    }, []);

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedFetchSuggestions.cancel();
        };
    }, [debouncedFetchSuggestions]);

    return {
        searchQuery,
        suggestions: combinedSuggestions,
        showSuggestions,
        isSearching,
        handleSearchChange,
        handleSuggestionSelect,
        clearSearch,
        setShowSuggestions
    };
}