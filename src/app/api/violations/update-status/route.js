import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and has proper role
        const session = await getSession();
        console.log('Update status session:', session);

        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Allow both Admin and Security roles to update status
        if (!['Admin', 'Security'].includes(session.userRole)) {
            return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { violationId, status } = await request.json();

        // Validate input
        if (!violationId || !status) {
            return Response.json(
                { error: 'Violation ID and status are required' },
                { status: 400 }
            );
        }

        // Validate status
        if (!['pending', 'resolved', 'contested'].includes(status)) {
            return Response.json(
                { error: 'Invalid status value' },
                { status: 400 }
            );
        }

        console.log('Updating violation:', { violationId, status });

        // Verify violation exists and user has permission
        const checkQuery = `
            SELECT id, reported_by 
            FROM violations 
            WHERE id = ?
        `;
        const violation = await executeQuery(checkQuery, [violationId]);

        if (!violation || violation.length === 0) {
            return Response.json({ error: 'Violation not found' }, { status: 404 });
        }

        // Update violation status and track who made the change
        const updateQuery = `
            UPDATE violations 
            SET status = ?, 
                updated_at = NOW(),
                updated_by = ?
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [status, session.userId, violationId]);
        console.log('Status updated successfully');

        return Response.json({
            success: true,
            message: `Violation status updated to ${status}`
        });

    } catch (error) {
        console.error('Update violation status error:', error);
        return Response.json(
            { error: 'Failed to update violation status' },
            { status: 500 }
        );
    }
}