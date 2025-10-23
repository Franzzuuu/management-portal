// src/app/api/reports/export/status/route.js
import { queryOne } from '@/lib/database';
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
                started_at,
                completed_at
            FROM export_jobs 
            WHERE id = ? AND user_id = ?
        `, [jobId, session.userId]);

        if (!job) {
            return Response.json({
                error: 'Export job not found or access denied'
            }, { status: 404 });
        }

        // Calculate progress information
        let progress = null;

        if (job.status === 'running') {
            // Estimate progress based on elapsed time
            const startTime = new Date(job.started_at);
            const elapsed = Date.now() - startTime.getTime();

            // Rough estimation based on row count (if available) and elapsed time
            let estimatedProgress = 0;
            if (job.row_count > 0) {
                // If we know the final row count, calculate based on that
                estimatedProgress = Math.min(95, (elapsed / 1000) * 10); // 10% per second, max 95%
            } else {
                // Otherwise, use time-based estimation
                estimatedProgress = Math.min(90, elapsed / 100); // Slower progression
            }

            progress = {
                rowsProcessed: Math.floor((estimatedProgress / 100) * (job.row_count || 1000)),
                estimatedTotal: job.row_count || null,
                percentage: Math.floor(estimatedProgress)
            };
        }

        // Check if file is ready for download
        const fileReady = job.status === 'done' && job.file_path !== null;

        // Calculate processing time if completed
        let processingTime = null;
        if (job.completed_at && job.started_at) {
            processingTime = new Date(job.completed_at) - new Date(job.started_at);
        }

        return Response.json({
            success: true,
            jobId: job.id,
            status: job.status,
            reportType: job.report_type,
            format: job.format,
            rowCount: job.row_count,
            fileReady,
            progress,
            processingTime,
            errorMessage: job.error_message,
            createdAt: job.created_at,
            startedAt: job.started_at,
            completedAt: job.completed_at
        });

    } catch (error) {
        console.error('Export job status check error:', error);
        return Response.json(
            { error: 'Failed to check export job status' },
            { status: 500 }
        );
    }
}