import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

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
            'SELECT * FROM rfid_vehicle_system.rfid_tags WHERE id = ?',
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
            'SELECT v.*, rt.tag_uid, rt.status as tag_status FROM vehicles v LEFT JOIN rfid_vehicle_system.rfid_tags rt ON v.vehicle_id = rt.vehicle_id WHERE v.vehicle_id = ?',
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
        await executeQuery(
            'UPDATE rfid_vehicle_system.rfid_tags SET vehicle_id = ?, status = "active", assigned_date = CURRENT_TIMESTAMP WHERE id = ?',
            [vehicleId, tagId]
        );

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