// src/app/api/reports/export/jobs/route.js
import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 10;
        const status = searchParams.get('status'); // optional filter

        // Build query with optional status filter
        let whereClause = 'WHERE user_id = ?';
        let params = [session.userId];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Get recent export jobs for the user
        const jobs = await queryMany(`
            SELECT 
                id,
                report_type,
                format,
                status,
                row_count,
                error_message,
                created_at,
                started_at,
                completed_at
            FROM export_jobs 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ?
        `, [...params, limit]);

        return Response.json({
            success: true,
            jobs: jobs || []
        });

    } catch (error) {
        console.error('Export jobs list error:', error);
        return Response.json(
            { error: 'Failed to fetch export jobs' },
            { status: 500 }
        );
    }
}