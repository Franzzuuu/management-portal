import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';

/**
 * POST /api/carolinian/request-renewal
 * Request sticker renewal for a vehicle with expired status
 */
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty', 'Staff'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied' }, { status: 403 });
        }

        const { vehicleId } = await request.json();

        if (!vehicleId) {
            return Response.json({ error: 'Vehicle ID is required' }, { status: 400 });
        }

        // Verify the vehicle belongs to this user and has expired sticker
        const vehicle = await executeQuery(`
            SELECT v.vehicle_id, v.plate_number, v.make, v.model, v.sticker_status, v.usc_id
            FROM vehicles v
            WHERE v.vehicle_id = ? AND v.usc_id = ?
        `, [vehicleId, session.uscId]);

        if (vehicle.length === 0) {
            return Response.json({ error: 'Vehicle not found or access denied' }, { status: 404 });
        }

        const vehicleData = vehicle[0];

        // Check if sticker is expired
        if (vehicleData.sticker_status !== 'expired') {
            return Response.json({ 
                error: vehicleData.sticker_status === 'renewal_requested' 
                    ? 'Renewal already requested for this vehicle' 
                    : 'Only vehicles with expired stickers can request renewal'
            }, { status: 400 });
        }

        // Update sticker status to renewal_requested
        // Try to clear rejection reason if column exists, otherwise just update status
        try {
            await executeQuery(`
                UPDATE vehicles 
                SET sticker_status = 'renewal_requested', 
                    sticker_rejection_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE vehicle_id = ?
            `, [vehicleId]);
        } catch (columnError) {
            // Fallback if sticker_rejection_reason column doesn't exist yet
            if (columnError.code === 'ER_BAD_FIELD_ERROR') {
                await executeQuery(`
                    UPDATE vehicles 
                    SET sticker_status = 'renewal_requested', 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE vehicle_id = ?
                `, [vehicleId]);
            } else {
                throw columnError;
            }
        }

        // Create notification for admins
        const admins = await executeQuery(`
            SELECT id FROM users WHERE designation = 'Admin'
        `);

        for (const admin of admins) {
            await executeQuery(`
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    message,
                    created_at
                ) VALUES (?, ?, ?, ?, NOW())
            `, [
                admin.id,
                'sticker_renewal_request',
                'New Sticker Renewal Request',
                `${session.fullName || session.uscId} has requested sticker renewal for vehicle ${vehicleData.plate_number} (${vehicleData.make} ${vehicleData.model})`
            ]);
        }

        // Emit real-time update
        emit('vehicles:sticker_update', {
            vehicleId,
            stickerStatus: 'renewal_requested',
            ownerId: session.uscId
        });

        return Response.json({
            success: true,
            message: 'Renewal request submitted successfully'
        });

    } catch (error) {
        console.error('Request renewal error:', error);
        return Response.json(
            { error: 'Failed to submit renewal request. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/carolinian/request-renewal
 * Get renewal request status for user's vehicles
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all vehicles with their sticker status
        const vehicles = await executeQuery(`
            SELECT vehicle_id, plate_number, make, model, sticker_status, sticker_rejection_reason
            FROM vehicles
            WHERE usc_id = ? AND approval_status = 'approved'
        `, [session.uscId]);

        return Response.json({
            success: true,
            vehicles: vehicles.map(v => ({
                vehicleId: v.vehicle_id,
                plateNumber: v.plate_number,
                make: v.make,
                model: v.model,
                stickerStatus: v.sticker_status,
                rejectionReason: v.sticker_rejection_reason
            }))
        });

    } catch (error) {
        console.error('Get renewal status error:', error);
        return Response.json(
            { error: 'Failed to fetch renewal status' },
            { status: 500 }
        );
    }
}
