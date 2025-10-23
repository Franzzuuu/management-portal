// src/lib/xlsx-exporter.js
import ExcelJS from 'exceljs';
import { ColumnMappings, FileUtils, DateUtils } from './export-utils.js';

export class XLSXExporter {
    constructor(reportType, options = {}) {
        this.reportType = reportType;
        this.options = options;
        this.workbook = new ExcelJS.Workbook();
        this.setupWorkbook();
    }

    setupWorkbook() {
        // Set workbook properties
        this.workbook.creator = this.options.user || 'RFID Management System';
        this.workbook.lastModifiedBy = this.options.user || 'RFID Management System';
        this.workbook.created = new Date();
        this.workbook.modified = new Date();
        this.workbook.subject = `${this.reportType} Export`;
        this.workbook.description = `RFID Vehicle Management System - ${this.reportType} report`;
    }

    // Create summary sheet with KPIs and metadata
    createSummarySheet(summaryData) {
        const sheet = this.workbook.addWorksheet('Summary', {
            pageSetup: { orientation: 'landscape', paperSize: 9 }
        });

        // Set column widths
        sheet.columns = [
            { width: 30 },
            { width: 20 },
            { width: 15 }
        ];

        // Title
        sheet.addRow(['RFID Vehicle Management System']);
        sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: '355E3B' } };
        sheet.mergeCells('A1:C1');

        // Report info
        sheet.addRow([`Report Type: ${this.reportType.toUpperCase()}`]);
        sheet.addRow([`Generated: ${DateUtils.toManilaTime(new Date())}`]);
        sheet.addRow([`Timezone: Asia/Manila`]);
        sheet.addRow([`User: ${this.options.anonymize ? 'Anonymous' : this.options.user || 'Unknown'}`]);
        sheet.addRow([]);

        // Filters
        if (this.options.filters && Object.keys(this.options.filters).length > 0) {
            sheet.addRow(['Applied Filters:']);
            sheet.getCell('A7').font = { bold: true };
            Object.entries(this.options.filters).forEach(([key, value]) => {
                if (value) {
                    sheet.addRow([`  ${key}:`, value]);
                }
            });
            sheet.addRow([]);
        }

        // Summary data
        if (summaryData) {
            const currentRow = sheet.rowCount + 1;
            sheet.addRow(['Summary Statistics:']);
            sheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: '355E3B' } };

            Object.entries(summaryData).forEach(([key, value]) => {
                const row = sheet.addRow([key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value]);
                row.getCell(2).numFmt = typeof value === 'number' ? '#,##0' : '@';
            });
        }

        // Style the summary section
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 6) {
                row.eachCell(cell => {
                    cell.font = { ...cell.font, color: { argb: '355E3B' } };
                });
            }
        });

        return sheet;
    }

    // Create data sheet with actual records
    createDataSheet(data, columns) {
        const columnMappings = ColumnMappings[this.reportType] || {};
        const sheet = this.workbook.addWorksheet('Data');

        if (!data || data.length === 0) {
            sheet.addRow(['No data available for the selected criteria']);
            return sheet;
        }

        // Set up columns with proper widths and headers
        const excelColumns = columns.map(col => {
            const mapping = columnMappings[col];
            return {
                header: mapping?.label || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                key: col,
                width: this.getColumnWidth(col, mapping?.type)
            };
        });

        sheet.columns = excelColumns;

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '355E3B' }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Add data rows
        data.forEach(row => {
            const excelRow = sheet.addRow(row);

            // Format cells based on data type
            columns.forEach((col, index) => {
                const cell = excelRow.getCell(index + 1);
                const mapping = columnMappings[col];

                if (mapping) {
                    switch (mapping.type) {
                        case 'datetime':
                            if (row[col]) {
                                cell.value = new Date(row[col]);
                                cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
                            }
                            break;
                        case 'date':
                            if (row[col]) {
                                cell.value = new Date(row[col]);
                                cell.numFmt = 'yyyy-mm-dd';
                            }
                            break;
                        case 'number':
                            if (typeof row[col] === 'number') {
                                cell.numFmt = '#,##0';
                            }
                            break;
                        case 'boolean':
                            cell.value = row[col] ? 'Yes' : 'No';
                            break;
                    }
                }
            });
        });

        // Freeze header row
        sheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Auto-filter
        sheet.autoFilter = {
            from: 'A1',
            to: sheet.getCell(1, columns.length).address
        };

        return sheet;
    }

    // Create notes sheet with metadata and field definitions
    createNotesSheet() {
        const sheet = this.workbook.addWorksheet('Notes');

        sheet.columns = [
            { width: 30 },
            { width: 50 }
        ];

        // Title
        sheet.addRow(['Export Information']);
        sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: '355E3B' } };
        sheet.addRow([]);

        // Export details
        sheet.addRow(['Export Details:']);
        sheet.getCell('A3').font = { bold: true };
        sheet.addRow(['Report Type:', this.reportType]);
        sheet.addRow(['Format:', 'XLSX']);
        sheet.addRow(['Mode:', this.options.mode || 'view']);
        sheet.addRow(['Anonymized:', this.options.anonymize ? 'Yes' : 'No']);
        sheet.addRow(['Generated:', DateUtils.toManilaTime(new Date())]);
        sheet.addRow(['Row Count:', this.options.rowCount || 0]);
        sheet.addRow([]);

        // Column definitions
        const columnMappings = ColumnMappings[this.reportType];
        if (columnMappings) {
            sheet.addRow(['Field Definitions:']);
            sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
            sheet.addRow(['Field Name', 'Description']);

            const headerRow = sheet.getRow(sheet.rowCount);
            headerRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD700' } };
            });

            Object.entries(columnMappings).forEach(([field, def]) => {
                const description = `${def.label} (${def.type})${def.pii ? ' - PII' : ''}${def.derived ? ' - Derived' : ''}`;
                sheet.addRow([field, description]);
            });
        }

        // Anonymization note
        if (this.options.anonymize) {
            sheet.addRow([]);
            sheet.addRow(['Anonymization Notice:']);
            sheet.getCell(`A${sheet.rowCount}`).font = { bold: true, color: { argb: 'FF0000' } };
            sheet.addRow(['', 'Personal information has been anonymized for privacy protection.']);
            sheet.addRow(['', 'Original stable IDs are preserved for referential integrity.']);
        }

        return sheet;
    }

    // Get appropriate column width based on field type
    getColumnWidth(columnName, type) {
        switch (type) {
            case 'datetime':
                return 20;
            case 'date':
                return 12;
            case 'number':
                return 12;
            case 'boolean':
                return 8;
            default:
                // Estimate based on column name
                if (columnName.includes('description') || columnName.includes('message')) {
                    return 40;
                } else if (columnName.includes('name') || columnName.includes('email')) {
                    return 25;
                } else if (columnName.includes('id')) {
                    return 10;
                }
                return 15;
        }
    }

    // Generate the complete XLSX file
    async generateFile(data, columns, summaryData = null) {
        try {
            // Create all sheets
            this.createSummarySheet(summaryData);
            this.createDataSheet(data, columns);
            this.createNotesSheet();

            // Return buffer
            return await this.workbook.xlsx.writeBuffer();
        } catch (error) {
            console.error('Error generating XLSX file:', error);
            throw error;
        }
    }

    // Generate aggregation data for overview reports
    static generateAggregations(data, reportType) {
        if (!data || data.length === 0) return {};

        const aggregations = {};

        switch (reportType) {
            case 'users':
                aggregations.total_users = data.length;
                aggregations.by_designation = data.reduce((acc, user) => {
                    acc[user.designation] = (acc[user.designation] || 0) + 1;
                    return acc;
                }, {});
                aggregations.by_status = data.reduce((acc, user) => {
                    acc[user.status] = (acc[user.status] || 0) + 1;
                    return acc;
                }, {});
                break;

            case 'vehicles':
                aggregations.total_vehicles = data.length;
                aggregations.by_type = data.reduce((acc, vehicle) => {
                    acc[vehicle.vehicle_type] = (acc[vehicle.vehicle_type] || 0) + 1;
                    return acc;
                }, {});
                aggregations.by_status = data.reduce((acc, vehicle) => {
                    acc[vehicle.approval_status] = (acc[vehicle.approval_status] || 0) + 1;
                    return acc;
                }, {});
                break;

            case 'access':
                aggregations.total_logs = data.length;
                aggregations.by_entry_type = data.reduce((acc, log) => {
                    acc[log.entry_type] = (acc[log.entry_type] || 0) + 1;
                    return acc;
                }, {});
                aggregations.success_rate = data.filter(log => log.success).length / data.length;
                break;

            case 'violations':
                aggregations.total_violations = data.length;
                aggregations.by_status = data.reduce((acc, violation) => {
                    acc[violation.status] = (acc[violation.status] || 0) + 1;
                    return acc;
                }, {});
                aggregations.by_type = data.reduce((acc, violation) => {
                    acc[violation.violation_type] = (acc[violation.violation_type] || 0) + 1;
                    return acc;
                }, {});
                break;
        }

        return aggregations;
    }
}

export default XLSXExporter;