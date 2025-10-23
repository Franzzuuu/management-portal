// src/lib/csv-stream.js
import { Readable } from 'stream';
import { FileUtils } from './export-utils.js';

export class CSVStreamer {
    constructor(reportType, columns, options = {}) {
        this.reportType = reportType;
        this.columns = columns;
        this.options = options;
        this.headerSent = false;
        this.metadataSent = false;
    }

    // Create a readable stream for CSV data
    createStream(dataProvider) {
        let rowIndex = 0;
        let isFirstChunk = true;

        const self = this;
        return new Readable({
            objectMode: false,
            async read() {
                try {
                    // Send metadata first
                    if (isFirstChunk && !self.metadataSent) {
                        const metadata = FileUtils.generateCSVMetadata(
                            self.reportType,
                            self.options.user || 'Unknown',
                            self.options.filters || {},
                            self.columns,
                            self.options.mode || 'view',
                            self.options.sort || { by: 'id', dir: 'desc' },
                            self.options.estimatedRowCount || 0,
                            self.options.anonymize || false
                        );
                        this.push(metadata);
                        self.metadataSent = true;
                        isFirstChunk = false;
                        return;
                    }

                    // Send headers
                    if (!self.headerSent) {
                        const header = self.columns.join(',') + '\n';
                        this.push(header);
                        self.headerSent = true;
                        return;
                    }

                    // Get next batch of data
                    const batchSize = 100;
                    const batch = await dataProvider(rowIndex, batchSize);

                    if (!batch || batch.length === 0) {
                        // End of data
                        this.push(null);
                        return;
                    }

                    // Convert rows to CSV
                    const csvData = batch.map(row => {
                        return self.columns.map(col => {
                            const value = row[col];
                            if (value === null || value === undefined) return '';

                            // Handle different data types
                            if (typeof value === 'string') {
                                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                                    return `"${value.replace(/"/g, '""')}"`;
                                }
                                return value;
                            }

                            if (value instanceof Date) {
                                return value.toISOString();
                            }

                            return String(value);
                        }).join(',');
                    }).join('\n') + '\n';

                    this.push(csvData);
                    rowIndex += batch.length;

                } catch (error) {
                    this.destroy(error);
                }
            }
        });
    }

    // Helper method to convert a single row to CSV format
    static rowToCSV(row, columns) {
        return columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return '';

            if (typeof value === 'string') {
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }

            if (value instanceof Date) {
                return value.toISOString();
            }

            return String(value);
        }).join(',');
    }

    // Create a simple CSV string from array of data (for smaller datasets)
    static arrayToCSV(data, columns, metadata = null) {
        let csv = '';

        // Add metadata if provided
        if (metadata) {
            csv += metadata + '\n';
        }

        // Add headers
        csv += columns.join(',') + '\n';

        // Add data rows
        data.forEach(row => {
            csv += CSVStreamer.rowToCSV(row, columns) + '\n';
        });

        return csv;
    }
}

export default CSVStreamer;