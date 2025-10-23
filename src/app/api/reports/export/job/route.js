// src/app/api/reports/export/job/route.js
import { queryOne, queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            report,
            format,
            dateRange = {},
            mode = 'view',
            columns = [],
            sortBy = 'id',
            sortDir = 'desc',
            anonymize = false,
            filters = {}
        } = body;

        // Validate required fields
        if (!report || !format) {
            return Response.json({
                error: 'Missing required fields: report and format'
            }, { status: 400 });
        }

        // Validate enum values
        const validReports = ['overview', 'users', 'vehicles', 'access', 'violations'];
        const validFormats = ['csv', 'xlsx', 'pdf'];
        const validModes = ['view', 'full'];
        const validSortDirs = ['asc', 'desc'];

        if (!validReports.includes(report)) {
            return Response.json({
                error: `Invalid report type. Must be one of: ${validReports.join(', ')}`
            }, { status: 400 });
        }

        if (!validFormats.includes(format)) {
            return Response.json({
                error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
            }, { status: 400 });
        }

        if (!validModes.includes(mode)) {
            return Response.json({
                error: `Invalid mode. Must be one of: ${validModes.join(', ')}`
            }, { status: 400 });
        }

        if (!validSortDirs.includes(sortDir)) {
            return Response.json({
                error: `Invalid sort direction. Must be one of: ${validSortDirs.join(', ')}`
            }, { status: 400 });
        }

        // Check rate limiting - max 3 active jobs per user
        const activeJobs = await queryOne(`
            SELECT COUNT(*) as count 
            FROM export_jobs 
            WHERE user_id = ? AND status IN ('queued', 'running')
        `, [session.userId]);

        if (activeJobs.count >= 3) {
            return Response.json({
                error: 'Maximum number of active export jobs reached (3). Please wait for existing jobs to complete.'
            }, { status: 429 });
        }

        // Create job record
        const jobId = uuidv4();

        await executeQuery(`
            INSERT INTO export_jobs (
                id, user_id, report_type, format, filters, columns, mode, 
                sort_by, sort_dir, anonymize, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', NOW())
        `, [
            jobId,
            session.userId,
            report,
            format,
            JSON.stringify(filters),
            JSON.stringify(columns),
            mode,
            sortBy,
            sortDir,
            anonymize
        ]);

        // Log audit trail
        await executeQuery(`
            INSERT INTO audit_log (
                user_id, action, resource_type, resource_id, details, 
                ip_address, user_agent, created_at
            ) VALUES (?, 'export_job_created', 'export_job', ?, ?, ?, ?, NOW())
        `, [
            session.userId,
            jobId,
            JSON.stringify({
                report,
                format,
                mode,
                anonymize,
                filters,
                columns: columns.length
            }),
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
            request.headers.get('user-agent') || 'unknown'
        ]);

        // Start processing the job asynchronously
        processExportJobAsync(jobId);

        return Response.json({
            success: true,
            jobId: jobId,
            message: 'Export job created successfully'
        });

    } catch (error) {
        console.error('Create export job error:', error);
        return Response.json(
            { error: 'Failed to create export job' },
            { status: 500 }
        );
    }
}

// Async job processing function
async function processExportJobAsync(jobId) {
    const startTime = Date.now();
    let monitor;

    try {
        // Import performance monitor
        const { getPerformanceMonitor } = await import('@/lib/performance-monitor.js');
        monitor = getPerformanceMonitor();

        // Update job status to running
        await executeQuery(`
            UPDATE export_jobs 
            SET status = 'running', started_at = NOW() 
            WHERE id = ?
        `, [jobId]);

        // Get job details
        const job = await queryOne(`
            SELECT ej.*, u.email as user_email, up.full_name as user_name
            FROM export_jobs ej
            JOIN users u ON ej.user_id = u.id
            JOIN user_profiles up ON u.usc_id = up.usc_id
            WHERE ej.id = ?
        `, [jobId]);

        if (!job) {
            throw new Error('Job not found');
        }

        // Parse job parameters
        const filters = JSON.parse(job.filters || '{}');
        const columns = JSON.parse(job.columns || '[]');

        // Import export utilities (dynamic import to avoid circular dependencies)
        const { DateUtils, DefaultColumns, AnonymizationUtils, FileUtils } =
            await import('@/lib/export-utils.js');

        // Import file integrity validator
        const { FileIntegrityValidator } = await import('@/lib/file-integrity.js');

        // Get actual columns if not specified
        const actualColumns = columns.length > 0 ? columns : DefaultColumns[job.report_type] || [];

        // Build data query based on report type
        const { query, params } = buildDataQuery(job.report_type, filters, job.sort_by, job.sort_dir);

        // Execute query and get data
        console.log(`Executing query for job ${jobId}:`, query);
        const data = await queryMany(query, params);

        // Apply anonymization if requested
        const processedData = job.anonymize
            ? data.map(row => AnonymizationUtils.anonymizeRow(row, job.report_type))
            : data;

        // Generate file based on format
        let fileBuffer;
        let fileName;

        fileName = FileUtils.generateFileName(
            job.report_type,
            job.format,
            filters.startDate,
            filters.endDate,
            job.user_name,
            job.anonymize
        );

        switch (job.format) {
            case 'csv':
                const { CSVStreamer } = await import('@/lib/csv-stream.js');
                fileBuffer = CSVStreamer.arrayToCSV(
                    processedData,
                    actualColumns,
                    FileUtils.generateCSVMetadata(
                        job.report_type,
                        job.user_name,
                        filters,
                        actualColumns,
                        job.mode,
                        { by: job.sort_by, dir: job.sort_dir },
                        data.length,
                        job.anonymize
                    )
                );
                break;

            case 'xlsx':
                const { XLSXExporter } = await import('@/lib/xlsx-exporter.js');
                const xlsxExporter = new XLSXExporter(job.report_type, {
                    user: job.user_name,
                    anonymize: job.anonymize,
                    filters,
                    mode: job.mode,
                    rowCount: data.length
                });

                const summaryData = XLSXExporter.generateAggregations(processedData, job.report_type);
                fileBuffer = await xlsxExporter.generateFile(processedData, actualColumns, summaryData);
                break;

            case 'pdf':
                const { PDFExporter } = await import('@/lib/pdf-exporter.js');
                const pdfExporter = new PDFExporter(job.report_type, {
                    user: job.user_name,
                    anonymize: job.anonymize,
                    filters,
                    mode: job.mode
                });

                // For PDF, generate summary data and KPIs
                const pdfSummaryData = XLSXExporter.generateAggregations(processedData, job.report_type);
                fileBuffer = await pdfExporter.generatePDF(processedData, actualColumns, pdfSummaryData);
                break;

            default:
                throw new Error(`Unsupported format: ${job.format}`);
        }

        // Validate file integrity
        console.log(`Validating file integrity for job ${jobId}...`);
        const validationResult = await FileIntegrityValidator.validateExportFile(
            fileBuffer,
            job.format,
            { expectedRows: data.length }
        );

        if (!validationResult.valid) {
            throw new Error(`File integrity validation failed: ${validationResult.error}`);
        }

        // Log validation warnings if any
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            console.warn(`File validation warnings for job ${jobId}:`, validationResult.warnings);
        }

        // Create integrity report
        const integrityReport = FileIntegrityValidator.createIntegrityReport(
            validationResult,
            { jobId, reportType: job.report_type, rowCount: data.length }
        );

        // Save file (in a real implementation, save to cloud storage or file system)
        // For now, we'll store the file path and buffer temporarily
        const filePath = `/tmp/exports/${fileName}`;

        // Update job status to completed
        await executeQuery(`
            UPDATE export_jobs 
            SET status = 'done', completed_at = NOW(), row_count = ?, file_path = ?, file_hash = ?, validation_report = ?
            WHERE id = ?
        `, [data.length, filePath, validationResult.hash, JSON.stringify(integrityReport), jobId]);

        // Store file buffer temporarily (in production, use proper file storage)
        global.exportFiles = global.exportFiles || new Map();
        global.exportFiles.set(jobId, {
            buffer: fileBuffer,
            fileName,
            contentType: getContentType(job.format),
            integrity: integrityReport
        });

        console.log(`Export job ${jobId} completed successfully with ${data.length} rows`);

        // Record performance metrics
        if (monitor) {
            const duration = Date.now() - startTime;
            await monitor.recordExportJobMetric(
                jobId,
                job.report_type,
                job.format,
                duration,
                'done',
                data.length
            );
        }

    } catch (error) {
        console.error(`Export job ${jobId} failed:`, error);

        // Record failure metrics
        if (monitor) {
            const duration = Date.now() - startTime;
            await monitor.recordExportJobMetric(
                jobId,
                job?.report_type || 'unknown',
                job?.format || 'unknown',
                duration,
                'error',
                0,
                error.message
            );
        }

        // Update job status to error
        await executeQuery(`
            UPDATE export_jobs 
            SET status = 'error', completed_at = NOW(), error_message = ?
            WHERE id = ?
        `, [error.message, jobId]);
    }
}

// Helper function to build data query based on report type
function buildDataQuery(reportType, filters, sortBy, sortDir) {
    let query, params = [];

    // Date range handling
    const dateWhere = [];
    if (filters.startDate) {
        dateWhere.push(`DATE(timestamp) >= ?`);
        params.push(filters.startDate);
    }
    if (filters.endDate) {
        dateWhere.push(`DATE(timestamp) <= ?`);
        params.push(filters.endDate);
    }

    const dateFilter = dateWhere.length > 0 ? `WHERE ${dateWhere.join(' AND ')}` : '';

    switch (reportType) {
        case 'users':
            query = `
                SELECT 
                    u.id,
                    up.full_name,
                    u.email,
                    u.designation,
                    u.status,
                    up.phone_number,
                    up.gender,
                    up.department,
                    u.created_at,
                    u.last_login,
                    u.must_change_password
                FROM users u
                JOIN user_profiles up ON u.usc_id = up.usc_id
                ORDER BY ${sortBy} ${sortDir}
            `;
            break;

        case 'vehicles':
            query = `
                SELECT 
                    v.id,
                    v.plate_number,
                    v.vehicle_type,
                    v.make,
                    v.model,
                    v.color,
                    v.year,
                    v.approval_status,
                    up.full_name as owner_name,
                    u.designation as owner_designation,
                    v.registration_date,
                    v.created_at
                FROM vehicles v
                JOIN users u ON v.usc_id = u.usc_id
                JOIN user_profiles up ON u.usc_id = up.usc_id
                ORDER BY ${sortBy} ${sortDir}
            `;
            break;

        case 'access':
            // Reset params for access logs as we'll build the date filter differently
            params = [];
            let accessWhere = [];

            if (filters.startDate) {
                accessWhere.push(`DATE(al.timestamp) >= ?`);
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                accessWhere.push(`DATE(al.timestamp) <= ?`);
                params.push(filters.endDate);
            }
            if (filters.entryType) {
                accessWhere.push(`al.entry_type = ?`);
                params.push(filters.entryType);
            }
            if (filters.location) {
                accessWhere.push(`al.location = ?`);
                params.push(filters.location);
            }

            const accessFilter = accessWhere.length > 0 ? `WHERE ${accessWhere.join(' AND ')}` : '';

            query = `
                SELECT 
                    al.id,
                    al.timestamp,
                    al.entry_type,
                    al.location,
                    al.gate_location,
                    v.plate_number,
                    up.full_name as user_name,
                    u.designation as user_designation,
                    al.success,
                    al.source,
                    DATE(al.timestamp) as date_only,
                    HOUR(al.timestamp) as hour_of_day,
                    DAYNAME(al.timestamp) as weekday
                FROM access_logs al
                JOIN vehicles v ON al.vehicle_id = v.vehicle_id
                JOIN users u ON v.usc_id = u.usc_id
                JOIN user_profiles up ON u.usc_id = up.usc_id
                ${accessFilter}
                ORDER BY ${sortBy} ${sortDir}
            `;
            break;

        case 'violations':
            // Reset params for violations
            params = [];
            let violationWhere = [];

            if (filters.startDate) {
                violationWhere.push(`DATE(vi.created_at) >= ?`);
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                violationWhere.push(`DATE(vi.created_at) <= ?`);
                params.push(filters.endDate);
            }
            if (filters.status) {
                violationWhere.push(`vi.status = ?`);
                params.push(filters.status);
            }
            if (filters.violationType) {
                violationWhere.push(`vi.violation_type_id = ?`);
                params.push(filters.violationType);
            }

            const violationFilter = violationWhere.length > 0 ? `WHERE ${violationWhere.join(' AND ')}` : '';

            query = `
                SELECT 
                    vi.id,
                    vi.created_at,
                    vi.description,
                    vi.status,
                    vt.name as violation_type,
                    v.plate_number,
                    up.full_name as violator_name,
                    u.designation as violator_designation,
                    reporter.full_name as reported_by,
                    resolver.full_name as resolved_by,
                    vi.resolved_at,
                    vi.evidence_links,
                    DATEDIFF(COALESCE(vi.resolved_at, NOW()), vi.created_at) as time_to_resolve
                FROM violations vi
                JOIN violation_types vt ON vi.violation_type_id = vt.id
                JOIN vehicles v ON vi.vehicle_id = v.vehicle_id
                JOIN users u ON v.usc_id = u.usc_id
                JOIN user_profiles up ON u.usc_id = up.usc_id
                JOIN users ru ON vi.reported_by = ru.id
                JOIN user_profiles reporter ON ru.usc_id = reporter.usc_id
                LEFT JOIN users res ON vi.resolved_by = res.id
                LEFT JOIN user_profiles resolver ON res.usc_id = resolver.usc_id
                ${violationFilter}
                ORDER BY ${sortBy} ${sortDir}
            `;
            break;

        default:
            throw new Error(`Unsupported report type: ${reportType}`);
    }

    return { query, params };
}

// Helper function to get content type based on format
function getContentType(format) {
    switch (format) {
        case 'csv':
            return 'text/csv';
        case 'xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'pdf':
            return 'application/pdf';
        default:
            return 'application/octet-stream';
    }
}