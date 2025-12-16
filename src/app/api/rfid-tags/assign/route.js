import { executeQuery, queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { createNotification, NotificationTypes } from '@/lib/notifications';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tagId, vehicleId } = await request.json();

        // Validate input
        if (!tagId || !vehicleId) {
            return Response.json(
                { error: 'Tag ID and Vehicle ID are required' },
                { status: 400 }
            );
        }

        console.log('Attempting to assign tag:', { tagId, vehicleId });

        // Check if tag is available for assignment
        console.log('Looking for tag with ID:', tagId);
        const tagResults = await executeQuery(
            'SELECT * FROM rfid_tags WHERE id = ?',
            [tagId]
        );

        console.log('Tag query results:', tagResults);

        if (tagResults.length === 0) {
            return Response.json(
                { error: 'RFID tag not found' },
                { status: 404 }
            );
        }

        const tagCheck = tagResults[0];
        console.log('Found tag:', tagCheck);

        if (tagCheck.status !== 'unassigned') {
            return Response.json(
                { error: 'RFID tag is already assigned' },
                { status: 400 }
            );
        }

        // Check if vehicle exists and is approved
        const [vehicleCheck] = await executeQuery(
            'SELECT v.*, rt.tag_uid, rt.status FROM vehicles v LEFT JOIN rfid_tags rt ON v.vehicle_id = rt.vehicle_id WHERE v.vehicle_id = ?',
            [vehicleId]
        );

        console.log('Found vehicle:', vehicleCheck);

        if (!vehicleCheck) {
            return Response.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        if (vehicleCheck.approval_status !== 'approved') {
            return Response.json(
                { error: 'Vehicle is not approved' },
                { status: 400 }
            );
        }

        if (vehicleCheck.tag_uid) {
            return Response.json(
                { error: 'Vehicle already has an RFID tag assigned' },
                { status: 400 }
            );
        }

        // Update RFID tag with vehicle assignment
        const tagUpdateResult = await executeQuery(
            'UPDATE rfid_tags SET vehicle_id = ?, status = "active", assigned_date = CURRENT_TIMESTAMP WHERE id = ?',
            [vehicleId, tagId]
        );

        console.log('Tag update result:', tagUpdateResult);

        // Update vehicle sticker_status to 'renewed' when RFID tag is assigned
        const vehicleUpdateResult = await executeQuery(
            'UPDATE vehicles SET sticker_status = "renewed", updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?',
            [vehicleId]
        );

        console.log('Vehicle sticker_status update result:', vehicleUpdateResult);

        // Notify vehicle owner about sticker assignment
        try {
            const owner = await queryOne(
                `SELECT u.id, v.plate_number FROM vehicles v 
                 JOIN users u ON v.usc_id = u.usc_id 
                 WHERE v.vehicle_id = ?`,
                [vehicleId]
            );
            
            if (owner) {
                await createNotification({
                    userId: owner.id,
                    title: 'RFID Sticker Assigned',
                    message: `An RFID sticker has been assigned to your vehicle (${owner.plate_number}). Your vehicle is now fully registered.`,
                    type: NotificationTypes.STICKER_ASSIGNED,
                    relatedId: vehicleId
                });
            }
        } catch (notifError) {
            console.warn('Failed to create notification:', notifError);
        }

        return Response.json({
            success: true,
            message: 'RFID tag assigned successfully'
        });

    } catch (error) {
        console.error('Assign RFID tag error:', error);
        return Response.json(
            { error: 'Failed to assign RFID tag. Please try again.' },
            { status: 500 }
        );
    }
}