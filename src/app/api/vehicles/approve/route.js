import { executeQuery, queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';
import { createNotification, NotificationTypes } from '@/lib/notifications';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Received request body:', body);
        const { vehicleId, status, rejectionReason } = body;

        // Validate input
        if (!vehicleId || !status || !['approved', 'rejected'].includes(status)) {
            console.log('Validation failed:', { vehicleId, status });
            return Response.json(
                { error: 'Vehicle ID and valid status (approved/rejected) are required' },
                { status: 400 }
            );
        }

        // First check if vehicle exists
        const existingVehicle = await executeQuery(
            'SELECT * FROM vehicles WHERE vehicle_id = ?',
            [vehicleId]
        );

        console.log('Found vehicle:', existingVehicle);

        if (existingVehicle.length === 0) {
            return Response.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        // Update vehicle approval status only
        // Sticker status is managed separately through RFID tag assignment
        let updateQuery, updateParams;

        if (status === 'approved') {
            // When approved, set registration_date to current timestamp
            updateQuery = 'UPDATE vehicles SET approval_status = ?, rejection_reason = NULL, registration_date = NOW(), updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?';
            updateParams = [status, vehicleId];
        } else {
            // When rejected, store the rejection reason (optional)
            updateQuery = 'UPDATE vehicles SET approval_status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?';
            updateParams = [status, rejectionReason || null, vehicleId];
        }

        console.log('Updating vehicle with:', { status, vehicleId });

        const updateResult = await executeQuery(updateQuery, updateParams);

        console.log('Update result:', updateResult);

        // Emit real-time update for vehicle pending status change
        try {
            // Get updated count of pending vehicles
            const countQuery = `
                SELECT COUNT(*) as count
                FROM vehicles v
                WHERE v.approval_status = 'pending' 
                   OR (v.approval_status = 'approved' AND v.sticker_status = 'unassigned')
            `;
            const countResult = await executeQuery(countQuery);
            const pendingCount = countResult[0]?.count || 0;

            // Get the vehicle owner USC ID
            const ownerQuery = `
                SELECT v.usc_id 
                FROM vehicles v 
                WHERE v.vehicle_id = ?
            `;
            const ownerResult = await executeQuery(ownerQuery, [vehicleId]);
            const ownerUscId = ownerResult[0]?.usc_id;

            emit('vehicles:pending_update', {
                action: 'approval_update',
                vehicleId,
                approval_status: status,
                owner_id: ownerUscId,
                count: pendingCount
            });
        } catch (emitError) {
            console.warn('Failed to emit real-time update:', emitError);
        }

        // Create notification for vehicle owner
        try {
            const owner = await queryOne(
                `SELECT u.id, v.plate_number FROM vehicles v 
                 JOIN users u ON v.usc_id = u.usc_id 
                 WHERE v.vehicle_id = ?`,
                [vehicleId]
            );
            
            if (owner) {
                const notifType = status === 'approved' 
                    ? NotificationTypes.VEHICLE_APPROVED 
                    : NotificationTypes.VEHICLE_REJECTED;
                const title = status === 'approved' 
                    ? 'Vehicle Approved' 
                    : 'Vehicle Rejected';
                const message = status === 'approved'
                    ? `Your vehicle (${owner.plate_number}) has been approved.`
                    : `Your vehicle (${owner.plate_number}) was rejected. ${rejectionReason || ''}`;
                
                await createNotification({
                    userId: owner.id,
                    title,
                    message,
                    type: notifType,
                    relatedId: vehicleId
                });
            }
        } catch (notifError) {
            console.warn('Failed to create notification:', notifError);
        }

        return Response.json({
            success: true,
            message: `Vehicle ${status} successfully`
        });

    } catch (error) {
        console.error('Approve vehicle error:', error);
        return Response.json(
            { error: 'Failed to update vehicle status. Please try again.' },
            { status: 500 }
        );
    }
}