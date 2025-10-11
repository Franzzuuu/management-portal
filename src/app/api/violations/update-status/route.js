import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';

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
            SELECT id, status as old_status, reported_by 
            FROM violations 
            WHERE id = ?
        `;
        const violation = await executeQuery(checkQuery, [violationId]);

        if (!violation || violation.length === 0) {
            return Response.json({ error: 'Violation not found' }, { status: 404 });
        }

        const oldStatus = violation[0].old_status;

        // Update violation status and track who made the change
        const updateQuery = `
            UPDATE violations 
            SET status = ?, 
                updated_at = NOW(),
                updated_by = ?
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [status, session.uscId, violationId]);
        console.log('Status updated successfully');

        // Emit real-time update for violation status change
        try {
            // Get updated violation details
            const violationDetailsQuery = `
                SELECT 
                    v.id,
                    v.status,
                    v.reported_by,
                    vt.name as violation_type,
                    vh.plate_number as vehicle_plate,
                    vh.owner_id,
                    up.full_name as owner_name
                FROM violations v
                LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
                LEFT JOIN vehicles vh ON v.vehicle_id = vh.id
                LEFT JOIN users u ON vh.owner_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE v.id = ?
            `;
            const updatedViolation = await executeQuery(violationDetailsQuery, [violationId]);

            if (updatedViolation && updatedViolation[0]) {
                const viol = updatedViolation[0];
                emit('violations_update', {
                    action: 'update',
                    id: viol.id,
                    status: viol.status,
                    old_status: oldStatus,
                    violation_type: viol.violation_type,
                    vehicle_plate: viol.vehicle_plate,
                    owner_id: viol.owner_id,
                    owner_name: viol.owner_name,
                    reported_by: viol.reported_by,
                    updated_by: session.uscId
                });
            }
        } catch (emitError) {
            console.warn('Failed to emit real-time update:', emitError);
        }

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