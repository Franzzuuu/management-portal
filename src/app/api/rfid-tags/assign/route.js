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

        // Check if tag is available for assignment
        const tag = await executeQuery(
            'SELECT * FROM rfid_tags WHERE id = ? AND status = "unassigned"',
            [tagId]
        );

        if (tag.length === 0) {
            return Response.json(
                { error: 'RFID tag not found or already assigned' },
                { status: 404 }
            );
        }

        // Check if vehicle exists and is approved
        const vehicle = await executeQuery(
            'SELECT * FROM vehicles WHERE id = ? AND approval_status = "approved"',
            [vehicleId]
        );

        if (vehicle.length === 0) {
            return Response.json(
                { error: 'Vehicle not found or not approved' },
                { status: 404 }
            );
        }

        // Update RFID tag with vehicle assignment
        await executeQuery(
            'UPDATE rfid_tags SET vehicle_id = ?, status = "active", assigned_date = CURRENT_TIMESTAMP WHERE id = ?',
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