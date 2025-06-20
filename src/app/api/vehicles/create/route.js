import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vehicleData = await request.json();

        // Validate required fields
        const { userId, vehicleType, make, model, color, plateNumber, registrationDate } = vehicleData;
        if (!userId || !vehicleType || !make || !model || !color || !plateNumber) {
            return Response.json(
                { error: 'All vehicle fields are required' },
                { status: 400 }
            );
        }

        // Check if plate number already exists
        const existingVehicle = await executeQuery(
            'SELECT id FROM vehicles WHERE plate_number = ?',
            [plateNumber]
        );

        if (existingVehicle.length > 0) {
            return Response.json(
                { error: 'A vehicle with this plate number already exists' },
                { status: 409 }
            );
        }

        // Insert vehicle
        const result = await executeQuery(
            `INSERT INTO vehicles 
       (user_id, vehicle_type, make, model, color, plate_number, registration_date, approval_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, vehicleType, make, model, color, plateNumber, registrationDate || new Date().toISOString().split('T')[0], 'pending']
        );

        return Response.json({
            success: true,
            message: 'Vehicle registered successfully',
            vehicleId: result.insertId
        });

    } catch (error) {
        console.error('Create vehicle error:', error);
        return Response.json(
            { error: 'Failed to register vehicle. Please try again.' },
            { status: 500 }
        );
    }
}