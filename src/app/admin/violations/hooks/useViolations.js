import { useState, useEffect, useCallback } from 'react';

export function useViolations() {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        resolved: 0,
        disputed: 0
    });
    const [pagination, setPagination] = useState({
        limit: 50,
        offset: 0,
        total: 0
    });

    const fetchViolations = useCallback(async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);

            const searchParams = new URLSearchParams();

            // Add filters to search params
            if (filters.search) searchParams.append('search', filters.search);
            if (filters.status && filters.status !== 'all') searchParams.append('status', filters.status);
            if (filters.startDate) searchParams.append('startDate', filters.startDate);
            if (filters.endDate) searchParams.append('endDate', filters.endDate);
            if (filters.limit) searchParams.append('limit', filters.limit.toString());
            if (filters.offset) searchParams.append('offset', filters.offset.toString());

            const response = await fetch(`/api/violations?${searchParams.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch violations');
            }

            const data = await response.json();

            setViolations(data.violations);
            setStats(data.stats);
            setPagination(data.pagination);

        } catch (err) {
            setError(err.message);
            console.error('Error fetching violations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateViolation = useCallback(async (violationId, updates) => {
        try {
            const response = await fetch(`/api/violations/${violationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error('Failed to update violation');
            }

            const updatedViolation = await response.json();

            // Update local state
            setViolations(prev =>
                prev.map(violation =>
                    violation.id === violationId ? updatedViolation : violation
                )
            );

            return updatedViolation;

        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const createViolation = useCallback(async (violationData) => {
        try {
            const response = await fetch('/api/violations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(violationData),
            });

            if (!response.ok) {
                throw new Error('Failed to create violation');
            }

            const newViolation = await response.json();

            // Add to local state
            setViolations(prev => [newViolation, ...prev]);
            setStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));

            return newViolation;

        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteViolation = useCallback(async (violationId) => {
        try {
            const response = await fetch(`/api/violations/${violationId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete violation');
            }

            // Remove from local state
            setViolations(prev => prev.filter(v => v.id !== violationId));
            setStats(prev => ({ ...prev, total: prev.total - 1 }));

        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    return {
        violations,
        loading,
        error,
        stats,
        pagination,
        fetchViolations,
        updateViolation,
        createViolation,
        deleteViolation
    };
}