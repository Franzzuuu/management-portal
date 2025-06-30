import { useState, useCallback } from 'react';

export function useExport() {
    const [isExporting, setIsExporting] = useState(false);

    const exportToCSV = useCallback(async (violations, filename = 'violations-export') => {
        try {
            setIsExporting(true);

            const headers = [
                'ID',
                'Student Name',
                'Student ID',
                'Plate Number',
                'Vehicle Type',
                'Violation Type',
                'Description',
                'Status',
                'Severity',
                'Location',
                'Fine Amount',
                'Date Created',
                'Date Resolved'
            ];

            const csvContent = [
                headers.join(','),
                ...violations.map(violation => [
                    violation.id,
                    `"${violation.studentName || ''}"`,
                    violation.studentId || '',
                    violation.plateNumber || '',
                    violation.vehicleType || '',
                    `"${violation.violationType || ''}"`,
                    `"${violation.description || ''}"`,
                    violation.status || '',
                    violation.severity || '',
                    `"${violation.location || ''}"`,
                    violation.fineAmount || 0,
                    violation.createdAt ? new Date(violation.createdAt).toLocaleDateString() : '',
                    violation.resolvedAt ? new Date(violation.resolvedAt).toLocaleDateString() : ''
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Error exporting violations:', error);
            throw error;
        } finally {
            setIsExporting(false);
        }
    }, []);

    const exportToJSON = useCallback(async (violations, filename = 'violations-export') => {
        try {
            setIsExporting(true);

            const jsonContent = JSON.stringify(violations, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Error exporting violations:', error);
            throw error;
        } finally {
            setIsExporting(false);
        }
    }, []);

    return {
        isExporting,
        exportToCSV,
        exportToJSON
    };
}