import { useState, useCallback, useMemo } from 'react';

export function useFilters() {
    const [filters, setFilters] = useState({
        status: 'all',
        startDate: '',
        endDate: '',
        violationType: 'all',
        severity: 'all'
    });

    const updateFilter = useCallback((key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({
            status: 'all',
            startDate: '',
            endDate: '',
            violationType: 'all',
            severity: 'all'
        });
    }, []);

    const hasActiveFilters = useMemo(() => {
        return filters.status !== 'all' ||
            filters.startDate ||
            filters.endDate ||
            filters.violationType !== 'all' ||
            filters.severity !== 'all';
    }, [filters]);

    const filterViolations = useCallback((violations, searchQuery = '') => {
        return violations.filter(violation => {
            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const searchableText = [
                    violation.studentName,
                    violation.plateNumber,
                    violation.violationType,
                    violation.description,
                    violation.location
                ].join(' ').toLowerCase();

                if (!searchableText.includes(query)) {
                    return false;
                }
            }

            // Status filter
            if (filters.status !== 'all' && violation.status !== filters.status) {
                return false;
            }

            // Date range filter
            if (filters.startDate && filters.endDate) {
                const violationDate = new Date(violation.createdAt);
                const startDate = new Date(filters.startDate);
                const endDate = new Date(filters.endDate);

                if (violationDate < startDate || violationDate > endDate) {
                    return false;
                }
            }

            // Violation type filter
            if (filters.violationType !== 'all' && violation.violationType !== filters.violationType) {
                return false;
            }

            // Severity filter
            if (filters.severity !== 'all' && violation.severity !== filters.severity) {
                return false;
            }

            return true;
        });
    }, [filters]);

    return {
        filters,
        updateFilter,
        clearFilters,
        hasActiveFilters,
        filterViolations
    };
}