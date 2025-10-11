import { queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all RFID tags with vehicle and owner information
        const tags = await queryMany(`
      SELECT 
        rt.*,
        v.plate_number as vehicle_plate,
        v.make as vehicle_make,
        v.model as vehicle_model,
        up.full_name as owner_name
      FROM rfid_tags rt
      LEFT JOIN vehicles v ON rt.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON v.usc_id = u.usc_id
      LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
      ORDER BY rt.created_at DESC
    `);

        return Response.json({
            success: true,
            tags: tags || []
        });

    } catch (error) {
        console.error('Fetch RFID tags error:', error);
        return Response.json(
            { error: 'Failed to fetch RFID tags' },
            { status: 500 }
        );
    }
}

// POST endpoint for assigning RFID tags to vehicles
export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vehicleId, tagUid } = await request.json();

        // Validate input
        if (!vehicleId || !tagUid) {
            return Response.json(
                { error: 'Vehicle ID and RFID tag UID are required' },
                { status: 400 }
            );
        }

        // Check if vehicle exists and is approved
        const vehicleCheck = await executeQuery(
            'SELECT id, owner_id, approval_status FROM vehicles WHERE id = ?',
            [vehicleId]
        );

        if (vehicleCheck.length === 0) {
            return Response.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        if (vehicleCheck[0].approval_status !== 'approved') {
            return Response.json({ error: 'Vehicle must be approved before RFID assignment' }, { status: 400 });
        }

        // Insert or update RFID tag assignment
        const rfidInsertQuery = `
            INSERT INTO rfid_tags (vehicle_id, tag_uid, status, assigned_date)
            VALUES (?, ?, 'assigned', NOW())
            ON DUPLICATE KEY UPDATE 
                vehicle_id = VALUES(vehicle_id),
                status = 'assigned',
                assigned_date = NOW()
        `;

        await executeQuery(rfidInsertQuery, [vehicleId, tagUid]);

        // Update vehicle sticker status
        await executeQuery(
            'UPDATE vehicles SET sticker_status = "assigned", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [vehicleId]
        );

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

            // Get vehicle details for the update
            const vehicleDetailsQuery = `
                SELECT v.vehicle_id, v.plate_number, v.sticker_status, v.usc_id as owner_id, up.full_name as owner_name
                FROM vehicles v
                JOIN user_profiles up ON v.usc_id = up.usc_id
                WHERE v.vehicle_id = ?
            `;
            const vehicleDetails = await executeQuery(vehicleDetailsQuery, [vehicleId]);
            const vehicle = vehicleDetails[0];

            // Emit vehicle pending updates for admin dashboard
            emit('vehicle_pending_updates', {
                action: 'rfid_assigned',
                vehicleId,
                owner_id: vehicle?.owner_id,
                count: pendingCount
            });

            // Emit RFID updates for user dashboard
            emit('rfid_updates', {
                action: 'assigned',
                vehicle_id: vehicleId,
                plate_number: vehicle?.plate_number,
                sticker_status: 'assigned',
                rfid_tag_uid: tagUid,
                owner_id: vehicle?.owner_id,
                owner_name: vehicle?.owner_name
            });
        } catch (emitError) {
            console.warn('Failed to emit real-time update:', emitError);
        }

        return Response.json({
            success: true,
            message: 'RFID tag assigned successfully'
        });

    } catch (error) {
        console.error('RFID assignment error:', error);
        return Response.json(
            { error: 'Failed to assign RFID tag' },
            { status: 500 }
        );
    }
}