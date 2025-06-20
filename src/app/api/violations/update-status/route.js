import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

        // Update violation status
        const updateQuery = `
            UPDATE violations 
            SET status = ?, updated_at = NOW() 
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [status, violationId]);

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