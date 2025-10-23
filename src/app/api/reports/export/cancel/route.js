// src/app/api/reports/export/cancel/route.js
import { executeQuery, queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { jobId } = body;

        if (!jobId) {
            return Response.json({
                error: 'Missing required parameter: jobId'
            }, { status: 400 });
        }

        // Check if job exists and belongs to user
        const job = await queryOne(`
            SELECT id, status, user_id 
            FROM export_jobs 
            WHERE id = ? AND user_id = ?
        `, [jobId, session.userId]);

        if (!job) {
            return Response.json({
                error: 'Export job not found or access denied'
            }, { status: 404 });
        }

        // Check if job can be cancelled
        if (!['queued', 'running'].includes(job.status)) {
            return Response.json({
                error: `Cannot cancel job with status: ${job.status}`
            }, { status: 400 });
        }

        // Update job status to cancelled
        await executeQuery(`
            UPDATE export_jobs 
            SET status = 'cancelled', completed_at = NOW(), error_message = 'Cancelled by user'
            WHERE id = ?
        `, [jobId]);

        // Log audit trail
        await executeQuery(`
            INSERT INTO audit_log (
                user_id, action, resource_type, resource_id, details, 
                ip_address, user_agent, created_at
            ) VALUES (?, 'export_job_cancelled', 'export_job', ?, ?, ?, ?, NOW())
        `, [
            session.userId,
            jobId,
            JSON.stringify({
                previous_status: job.status,
                reason: 'user_requested'
            }),
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
            request.headers.get('user-agent') || 'unknown'
        ]);

        // Clean up any temporary files if they exist
        try {
            if (global.exportFiles && global.exportFiles.has(jobId)) {
                global.exportFiles.delete(jobId);
            }
        } catch (cleanupError) {
            console.warn('Failed to cleanup files for cancelled job:', cleanupError);
        }

        return Response.json({
            success: true,
            message: 'Export job cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel export job error:', error);
        return Response.json(
            { error: 'Failed to cancel export job' },
            { status: 500 }
        );
    }
}