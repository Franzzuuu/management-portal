import { executeQuery } from '@/lib/database';

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { status, notes } = await request.json();

        // Validate status
        if (!['pending', 'resolved', 'contested'].includes(status)) {
            return Response.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Update violation status
        await executeQuery(`
            UPDATE violations 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [status, id]);

        return Response.json({
            success: true,
            message: 'Violation status updated successfully'
        });

    } catch (error) {
        console.error('Update violation error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}