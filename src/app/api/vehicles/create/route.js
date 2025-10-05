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

        // Log received data for debugging
        console.log('Received vehicle data:', vehicleData);

        // Validate required fields
        const { vehicleType, make, model, color, plateNumber, registrationDate, userId, year } = vehicleData;

        // Log extracted fields for debugging
        console.log('Extracted fields:', {
            vehicleType, make, model, color, plateNumber, registrationDate, userId, year
        });

        // Get the vehicle owner's user ID
        const ownerUserId = userId || session.userId;

        // Get the USC ID for the user
        const userInfo = await executeQuery(
            'SELECT usc_id FROM users WHERE id = ?',
            [ownerUserId]
        );

        if (userInfo.length === 0) {
            return Response.json(
                { error: 'Invalid vehicle owner' },
                { status: 400 }
            );
        }

        const ownerUscId = userInfo[0].usc_id;

        // Required fields validation including year
        if (!vehicleType || !make || !model || !color || !plateNumber || !year) {
            // Log which fields are missing
            const missingFields = [];
            if (!vehicleType) missingFields.push('vehicleType');
            if (!make) missingFields.push('make');
            if (!model) missingFields.push('model');
            if (!color) missingFields.push('color');
            if (!plateNumber) missingFields.push('plateNumber');
            if (!year) missingFields.push('year');

            console.log('Missing fields:', missingFields);

            return Response.json(
                { error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate year format
        const yearValue = parseInt(year, 10);
        const currentYear = new Date().getFullYear();

        if (isNaN(yearValue) || yearValue < 1900 || yearValue > currentYear + 1) {
            return Response.json(
                { error: `Invalid year. Must be a 4-digit year between 1900 and ${currentYear + 1}` },
                { status: 400 }
            );
        }

        // Check if plate number already exists
        const existingVehicle = await executeQuery(
            'SELECT vehicle_id FROM vehicles WHERE plate_number = ?',
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
       (usc_id, vehicle_type, make, model, color, plate_number, registration_date, created_at, approval_status, year) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [ownerUscId, vehicleType, make, model, color, plateNumber, registrationDate, 'pending', yearValue]
        );

        return Response.json({
            success: true,
            message: 'Vehicle registered successfully',
            vehicleId: result.insertId,
            userId: ownerUserId
        });

    } catch (error) {
        console.error('Create vehicle error:', error);
        return Response.json(
            { error: 'Failed to register vehicle. Please try again.' },
            { status: 500 }
        );
    }
}