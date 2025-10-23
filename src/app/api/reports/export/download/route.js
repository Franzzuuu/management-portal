// src/app/api/reports/export/download/route.js
import { queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return Response.json({
                error: 'Missing required parameter: jobId'
            }, { status: 400 });
        }

        // Get job details
        const job = await queryOne(`
            SELECT 
                id,
                user_id,
                report_type,
                format,
                status,
                row_count,
                error_message,
                file_path,
                created_at,
                completed_at
            FROM export_jobs 
            WHERE id = ? AND user_id = ?
        `, [jobId, session.userId]);

        if (!job) {
            return Response.json({
                error: 'Export job not found or access denied'
            }, { status: 404 });
        }

        if (job.status !== 'done') {
            return Response.json({
                error: `Export job is not ready for download. Current status: ${job.status}`
            }, { status: 400 });
        }

        if (!job.file_path) {
            return Response.json({
                error: 'File not found for this export job'
            }, { status: 404 });
        }

        // Get file from temporary storage (in production, retrieve from cloud storage or file system)
        global.exportFiles = global.exportFiles || new Map();
        const fileData = global.exportFiles.get(jobId);

        if (!fileData) {
            return Response.json({
                error: 'File has expired or is no longer available'
            }, { status: 404 });
        }

        // Log download in audit trail
        await executeQuery(`
            INSERT INTO audit_log (
                user_id, action, resource_type, resource_id, details, 
                ip_address, user_agent, created_at
            ) VALUES (?, 'export_file_downloaded', 'export_job', ?, ?, ?, ?, NOW())
        `, [
            session.userId,
            jobId,
            JSON.stringify({
                report_type: job.report_type,
                format: job.format,
                row_count: job.row_count,
                file_size: fileData.buffer.length
            }),
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
            request.headers.get('user-agent') || 'unknown'
        ]);

        // Return file as response
        return new Response(fileData.buffer, {
            headers: {
                'Content-Type': fileData.contentType,
                'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
                'Content-Length': fileData.buffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('Export file download error:', error);
        return Response.json(
            { error: 'Failed to download export file' },
            { status: 500 }
        );
    }
}