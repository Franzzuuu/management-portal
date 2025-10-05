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

        // Update vehicle approval status only
        // Sticker status is managed separately through RFID tag assignment
        let updateQuery, updateParams;

        if (status === 'approved') {
            // When approved, set registration_date to current timestamp
            updateQuery = 'UPDATE vehicles SET approval_status = ?, registration_date = NOW(), updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?';
            updateParams = [status, vehicleId];
        } else {
            // When rejected, only update approval_status
            updateQuery = 'UPDATE vehicles SET approval_status = ?, updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?';
            updateParams = [status, vehicleId];
        }

        console.log('Updating vehicle with:', { status, vehicleId });

        const updateResult = await executeQuery(updateQuery, updateParams);

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