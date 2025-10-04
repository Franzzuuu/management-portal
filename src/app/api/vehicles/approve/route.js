import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Received request body:', body);
        const { vehicleId, status } = body;

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

        // Update vehicle approval status and sticker status
        // When approved, set sticker_status to 'renewed' 
        // When rejected, keep sticker_status as 'pending'
        const stickerStatus = status === 'approved' ? 'renewed' : 'pending';

        console.log('Updating vehicle with:', { status, stickerStatus, vehicleId });

        const updateResult = await executeQuery(
            'UPDATE vehicles SET approval_status = ?, sticker_status = ?, updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?',
            [status, stickerStatus, vehicleId]
        );

        console.log('Update result:', updateResult);

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