// src/lib/export-utils.js
import { v4 as uuidv4 } from 'uuid';

// Date utilities for Asia/Manila timezone
export const DateUtils = {
    // Convert to Asia/Manila timezone
    toManilaTime: (date) => {
        return new Date(date).toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },

    // Make end date inclusive (set to 23:59:59 Manila time)
    makeEndDateInclusive: (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr + 'T23:59:59');
        return date.toISOString();
    },

    // Get formatted date range for file naming
    getDateRangeString: (startDate, endDate) => {
        if (!startDate && !endDate) return 'all-time';

        const formatDate = (date) => {
            return new Date(date).toISOString().split('T')[0].replace(/-/g, '');
        };

        if (startDate && endDate) {
            return `${formatDate(startDate)}_to_${formatDate(endDate)}`;
        } else if (startDate) {
            return `from_${formatDate(startDate)}`;
        } else {
            return `until_${formatDate(endDate)}`;
        }
    },

    // Quick date range presets
    getQuickRanges: () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const formatDate = (date) => date.toISOString().split('T')[0];

        return {
            today: {
                start: formatDate(today),
                end: formatDate(today),
                label: 'Today'
            },
            yesterday: {
                start: formatDate(yesterday),
                end: formatDate(yesterday),
                label: 'Yesterday'
            },
            last7days: {
                start: formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)),
                end: formatDate(today),
                label: 'Last 7 days'
            },
            last30days: {
                start: formatDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)),
                end: formatDate(today),
                label: 'Last 30 days'
            },
            thisMonth: {
                start: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
                end: formatDate(today),
                label: 'This Month'
            },
            lastMonth: (() => {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                return {
                    start: formatDate(lastMonth),
                    end: formatDate(lastDayOfLastMonth),
                    label: 'Last Month'
                };
            })(),
            allTime: {
                start: null,
                end: null,
                label: 'All-time'
            }
        };
    }
};

// Column definitions for each report type
export const ColumnMappings = {
    overview: {
        kpis: {
            total_users: { label: 'Total Users', type: 'number' },
            new_users_this_month: { label: 'New Users This Month', type: 'number' },
            total_vehicles: { label: 'Total Vehicles', type: 'number' },
            approved_vehicles: { label: 'Approved Vehicles', type: 'number' },
            access_logs_last_30_days: { label: 'Access Logs (Last 30 Days)', type: 'number' },
            total_violations: { label: 'Total Violations', type: 'number' },
            pending_violations: { label: 'Pending Violations', type: 'number' }
        },
        trends: {
            period: { label: 'Period', type: 'string' },
            users_added: { label: 'Users Added', type: 'number' },
            vehicles_added: { label: 'Vehicles Added', type: 'number' },
            access_count: { label: 'Access Count', type: 'number' },
            violations_count: { label: 'Violations Count', type: 'number' }
        }
    },
    users: {
        id: { label: 'User ID', type: 'number' },
        full_name: { label: 'Full Name', type: 'string', pii: true },
        email: { label: 'Email', type: 'string', pii: true },
        designation: { label: 'Designation', type: 'string' },
        status: { label: 'Status', type: 'string' },
        phone_number: { label: 'Phone Number', type: 'string', pii: true },
        gender: { label: 'Gender', type: 'string' },
        department: { label: 'Department', type: 'string' },
        created_at: { label: 'Registration Date', type: 'datetime' },
        last_login: { label: 'Last Login', type: 'datetime' },
        must_change_password: { label: 'Must Change Password', type: 'boolean' }
    },
    vehicles: {
        id: { label: 'Vehicle ID', type: 'number' },
        plate_number: { label: 'Plate Number', type: 'string', pii: true },
        vehicle_type: { label: 'Vehicle Type', type: 'string' },
        make: { label: 'Make', type: 'string' },
        model: { label: 'Model', type: 'string' },
        color: { label: 'Color', type: 'string' },
        year: { label: 'Year', type: 'number' },
        approval_status: { label: 'Approval Status', type: 'string' },
        owner_name: { label: 'Owner Name', type: 'string', pii: true },
        owner_designation: { label: 'Owner Designation', type: 'string' },
        registration_date: { label: 'Registration Date', type: 'datetime' },
        created_at: { label: 'Created At', type: 'datetime' }
    },
    access: {
        id: { label: 'Log ID', type: 'number' },
        timestamp: { label: 'Timestamp', type: 'datetime' },
        entry_type: { label: 'Entry Type', type: 'string' },
        location: { label: 'Location', type: 'string' },
        gate_location: { label: 'Gate Location', type: 'string' },
        plate_number: { label: 'Plate Number', type: 'string', pii: true },
        user_name: { label: 'User Name', type: 'string', pii: true },
        user_designation: { label: 'User Designation', type: 'string' },
        success: { label: 'Success', type: 'boolean' },
        source: { label: 'Source', type: 'string' },
        date_only: { label: 'Date', type: 'date', derived: true },
        hour_of_day: { label: 'Hour of Day', type: 'number', derived: true },
        weekday: { label: 'Weekday', type: 'string', derived: true }
    },
    violations: {
        id: { label: 'Violation ID', type: 'number' },
        created_at: { label: 'Created At', type: 'datetime' },
        description: { label: 'Description', type: 'string' },
        status: { label: 'Status', type: 'string' },
        violation_type: { label: 'Violation Type', type: 'string' },
        plate_number: { label: 'Plate Number', type: 'string', pii: true },
        violator_name: { label: 'Violator Name', type: 'string', pii: true },
        violator_designation: { label: 'Violator Designation', type: 'string' },
        reported_by: { label: 'Reported By', type: 'string', pii: true },
        resolved_by: { label: 'Resolved By', type: 'string', pii: true },
        resolved_at: { label: 'Resolved At', type: 'datetime' },
        evidence_links: { label: 'Evidence Links', type: 'string' },
        time_to_resolve: { label: 'Time to Resolve (Days)', type: 'number', derived: true }
    }
};

// Anonymization utilities
export const AnonymizationUtils = {
    // Generate consistent hash for stable IDs
    hashString: (str) => {
        let hash = 0;
        for (let i = 0; str && i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    },

    // Anonymize different data types
    anonymize: (value, type, fieldName) => {
        if (!value || value === null || value === undefined) return value;

        const columnDef = Object.values(ColumnMappings).flat()
            .find(mapping => Object.keys(mapping).includes(fieldName));

        if (!columnDef?.[fieldName]?.pii) return value; // Not PII, return as is

        switch (type) {
            case 'name':
                const hash = AnonymizationUtils.hashString(value);
                return `User_${hash.toString().slice(-6)}`;

            case 'email':
                const emailHash = AnonymizationUtils.hashString(value);
                return `user${emailHash.toString().slice(-6)}@example.com`;

            case 'plate':
                const plateHash = AnonymizationUtils.hashString(value);
                return `***${plateHash.toString().slice(-3)}`;

            case 'phone':
                return '***-***-' + value.slice(-4);

            default:
                // Generic anonymization
                if (typeof value === 'string' && value.length > 3) {
                    return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
                }
                return '***';
        }
    },

    // Apply anonymization to a data row
    anonymizeRow: (row, reportType) => {
        const columns = ColumnMappings[reportType];
        if (!columns) return row;

        const anonymizedRow = { ...row };

        Object.keys(row).forEach(key => {
            const columnDef = columns[key];
            if (columnDef?.pii) {
                // Determine anonymization type based on field name
                let type = 'default';
                if (key.includes('name')) type = 'name';
                else if (key.includes('email')) type = 'email';
                else if (key.includes('plate')) type = 'plate';
                else if (key.includes('phone')) type = 'phone';

                anonymizedRow[key] = AnonymizationUtils.anonymize(row[key], type, key);
            }
        });

        return anonymizedRow;
    }
};

// File naming utilities
export const FileUtils = {
    generateFileName: (reportType, format, startDate, endDate, generatedBy, anonymized = false) => {
        const timestamp = new Date().toISOString()
            .replace(/[-:]/g, '')
            .replace(/\..+/, '')
            .replace('T', '_');

        const dateRange = DateUtils.getDateRangeString(startDate, endDate);
        const userHash = AnonymizationUtils.hashString(generatedBy).toString().slice(-4);
        const anonSuffix = anonymized ? '_anon' : '';

        return `${reportType}-${timestamp}_Manila-${dateRange}-user${userHash}${anonSuffix}.${format}`;
    },

    // Generate CSV metadata header
    generateCSVMetadata: (reportType, user, filters, columns, mode, sort, rowCount, anonymized) => {
        const lines = [
            `# RFID Vehicle Management System Export`,
            `# Report: ${reportType}`,
            `# User: ${anonymized ? 'Anonymous' : user}`,
            `# Generated: ${new Date().toISOString()}`,
            `# Timezone: Asia/Manila`,
            `# App Version: ${process.env.npm_package_version || '1.0.0'}`,
            `# Filters: ${JSON.stringify(filters)}`,
            `# Columns: ${columns.join(', ')}`,
            `# Mode: ${mode}`,
            `# Sort: ${sort.by} ${sort.dir}`,
            `# Row Count: ${rowCount}`,
            `# Anonymized: ${anonymized}`,
            `#`
        ];
        return lines.join('\n') + '\n';
    }
};

// Export job management
export const ExportJobUtils = {
    createJob: (reportType, format, options = {}) => {
        return {
            id: uuidv4(),
            report_type: reportType,
            format,
            filters: options.filters || {},
            columns: options.columns || [],
            mode: options.mode || 'view',
            sort_by: options.sortBy || 'id',
            sort_dir: options.sortDir || 'desc',
            anonymize: options.anonymize || false,
            status: 'queued',
            row_count: 0,
            error_message: null,
            file_path: null,
            created_at: new Date(),
            started_at: null,
            completed_at: null
        };
    },

    // Estimate processing time based on row count and format
    estimateProcessingTime: (rowCount, format) => {
        const baseTime = 1000; // 1 second base
        const perRowTime = {
            csv: 0.1,   // 0.1ms per row
            xlsx: 2,    // 2ms per row 
            pdf: 5      // 5ms per row
        };

        return Math.min(baseTime + (rowCount * (perRowTime[format] || 1)), 300000); // Max 5 minutes
    }
};

// Default column selections for each report type
export const DefaultColumns = {
    overview: {
        kpis: ['total_users', 'total_vehicles', 'access_logs_last_30_days', 'total_violations'],
        trends: ['period', 'users_added', 'vehicles_added', 'access_count', 'violations_count']
    },
    users: ['id', 'full_name', 'email', 'designation', 'status', 'created_at'],
    vehicles: ['id', 'plate_number', 'vehicle_type', 'make', 'model', 'approval_status', 'owner_name'],
    access: ['timestamp', 'entry_type', 'location', 'plate_number', 'user_name', 'success'],
    violations: ['created_at', 'violation_type', 'description', 'status', 'plate_number', 'violator_name']
};

const ExportUtils = {
    DateUtils,
    ColumnMappings,
    AnonymizationUtils,
    FileUtils,
    ExportJobUtils,
    DefaultColumns
};

export default ExportUtils;