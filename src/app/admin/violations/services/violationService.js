class ViolationService {
    constructor() {
        this.baseUrl = '/api/violations';
    }

    async getViolations() {
        try {
            const response = await fetch(this.baseUrl);
            if (!response.ok) throw new Error('Failed to fetch violations');
            return await response.json();
        } catch (error) {
            console.error('Error fetching violations:', error);
            throw error;
        }
    }

    async updateViolation(violation) {
        try {
            const response = await fetch(`${this.baseUrl}/${violation.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(violation),
            });
            if (!response.ok) throw new Error('Failed to update violation');
            return await response.json();
        } catch (error) {
            console.error('Error updating violation:', error);
            throw error;
        }
    }

    async createViolation(violationData) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(violationData),
            });
            if (!response.ok) throw new Error('Failed to create violation');
            return await response.json();
        } catch (error) {
            console.error('Error creating violation:', error);
            throw error;
        }
    }

    async deleteViolation(violationId) {
        try {
            const response = await fetch(`${this.baseUrl}/${violationId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete violation');
            return await response.json();
        } catch (error) {
            console.error('Error deleting violation:', error);
            throw error;
        }
    }

    // Smart search suggestions with autocomplete functionality
    getSearchSuggestions(violations, query) {
        if (!query || query.length < 2) return [];

        const queryLower = query.toLowerCase();
        const suggestions = new Set();
        const maxSuggestions = 8;

        violations.forEach(violation => {
            // Search in student names
            if (violation.studentName && violation.studentName.toLowerCase().includes(queryLower)) {
                suggestions.add({
                    value: violation.studentName,
                    type: 'name',
                    count: 1
                });
            }

            // Search in plate numbers
            if (violation.plateNumber && violation.plateNumber.toLowerCase().includes(queryLower)) {
                suggestions.add({
                    value: violation.plateNumber,
                    type: 'plate',
                    count: 1
                });
            }

            // Search in violation types
            if (violation.violationType && violation.violationType.toLowerCase().includes(queryLower)) {
                suggestions.add({
                    value: violation.violationType,
                    type: 'violation',
                    count: 1
                });
            }

            // Search in descriptions
            if (violation.description && violation.description.toLowerCase().includes(queryLower)) {
                // Extract relevant keywords from description
                const words = violation.description.toLowerCase().split(' ');
                words.forEach(word => {
                    if (word.includes(queryLower) && word.length > 2) {
                        suggestions.add({
                            value: word,
                            type: 'keyword',
                            count: 1
                        });
                    }
                });
            }
        });

        // Convert Set to Array and sort by relevance
        return Array.from(suggestions)
            .sort((a, b) => {
                // Prioritize exact matches
                const aExact = a.value.toLowerCase() === queryLower;
                const bExact = b.value.toLowerCase() === queryLower;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                // Prioritize matches that start with query
                const aStarts = a.value.toLowerCase().startsWith(queryLower);
                const bStarts = b.value.toLowerCase().startsWith(queryLower);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                // Sort by type priority: names > plates > violations > keywords
                const typePriority = { name: 1, plate: 2, violation: 3, keyword: 4 };
                const aPriority = typePriority[a.type] || 5;
                const bPriority = typePriority[b.type] || 5;
                if (aPriority !== bPriority) return aPriority - bPriority;

                // Sort alphabetically
                return a.value.localeCompare(b.value);
            })
            .slice(0, maxSuggestions);
    }

    // Advanced filtering with multiple criteria
    filterViolations(violations, filters) {
        return violations.filter(violation => {
            // Text search
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const searchableText = [
                    violation.studentName,
                    violation.plateNumber,
                    violation.violationType,
                    violation.description,
                    violation.location
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchLower)) {
                    return false;
                }
            }

            // Status filter
            if (filters.status && filters.status !== 'all' && violation.status !== filters.status) {
                return false;
            }

            // Date range filter
            if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
                const violationDate = new Date(violation.createdAt);
                const startDate = new Date(filters.dateRange.start);
                const endDate = new Date(filters.dateRange.end);

                if (violationDate < startDate || violationDate > endDate) {
                    return false;
                }
            }

            // Violation type filter
            if (filters.violationType && filters.violationType !== 'all' &&
                violation.violationType !== filters.violationType) {
                return false;
            }

            // Severity filter
            if (filters.severity && filters.severity !== 'all' &&
                violation.severity !== filters.severity) {
                return false;
            }

            return true;
        });
    }

    // Export violations to CSV
    async exportViolations(violations, format = 'csv') {
        try {
            const headers = [
                'ID',
                'Student Name',
                'Plate Number',
                'Violation Type',
                'Description',
                'Status',
                'Severity',
                'Location',
                'Date Created',
                'Date Resolved',
                'Fine Amount'
            ];

            let content = '';

            if (format === 'csv') {
                // CSV format
                content = headers.join(',') + '\n';
                violations.forEach(violation => {
                    const row = [
                        violation.id,
                        `"${violation.studentName || ''}"`,
                        violation.plateNumber || '',
                        `"${violation.violationType || ''}"`,
                        `"${violation.description || ''}"`,
                        violation.status || '',
                        violation.severity || '',
                        `"${violation.location || ''}"`,
                        violation.createdAt || '',
                        violation.resolvedAt || '',
                        violation.fineAmount || ''
                    ];
                    content += row.join(',') + '\n';
                });
            }

            // Download file
            const blob = new Blob([content], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `violations-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Error exporting violations:', error);
            throw error;
        }
    }

    // Get violation statistics
    getViolationStats(violations) {
        const stats = {
            total: violations.length,
            pending: 0,
            resolved: 0,
            disputed: 0,
            byType: {},
            bySeverity: {},
            recentTrend: this.getRecentTrend(violations)
        };

        violations.forEach(violation => {
            // Count by status
            switch (violation.status) {
                case 'pending':
                    stats.pending++;
                    break;
                case 'resolved':
                    stats.resolved++;
                    break;
                case 'disputed':
                    stats.disputed++;
                    break;
            }

            // Count by type
            const type = violation.violationType || 'Unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            // Count by severity
            const severity = violation.severity || 'Medium';
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        });

        return stats;
    }

    // Get recent trend data (last 7 days)
    getRecentTrend(violations) {
        const days = 7;
        const today = new Date();
        const trend = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayViolations = violations.filter(violation => {
                const violationDate = new Date(violation.createdAt).toISOString().split('T')[0];
                return violationDate === dateStr;
            });

            trend.push({
                date: dateStr,
                count: dayViolations.length,
                pending: dayViolations.filter(v => v.status === 'pending').length,
                resolved: dayViolations.filter(v => v.status === 'resolved').length
            });
        }

        return trend;
    }

    // Validate violation data
    validateViolation(violationData) {
        const errors = [];

        if (!violationData.studentName?.trim()) {
            errors.push('Student name is required');
        }

        if (!violationData.plateNumber?.trim()) {
            errors.push('Plate number is required');
        }

        if (!violationData.violationType?.trim()) {
            errors.push('Violation type is required');
        }

        if (!violationData.description?.trim()) {
            errors.push('Description is required');
        }

        if (violationData.fineAmount && isNaN(violationData.fineAmount)) {
            errors.push('Fine amount must be a valid number');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export singleton instance
export const violationService = new ViolationService();