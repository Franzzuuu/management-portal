import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated (allow any authenticated user)
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const vehicleData = await request.json();

        // Log received data for debugging
        console.log('Received vehicle data:', vehicleData);
        console.log('Session data:', session);

        // Validate required fields
        const { vehicleType, make, model, color, plateNumber, registrationDate, userId, year } = vehicleData;

        // Log extracted fields for debugging
        console.log('Extracted fields:', {
            vehicleType, make, model, color, plateNumber, registrationDate, userId, year
        });

        // Determine the owner: Admin can specify userId, others default to their own
        let ownerUscId;
        if (session.userRole === 'Admin' && userId) {
            // Admin is specifying a specific user - look up their USC ID
            const userInfo = await executeQuery(
                'SELECT usc_id FROM users WHERE id = ?',
                [userId]
            );

            if (userInfo.length === 0) {
                return Response.json(
                    { error: 'Invalid vehicle owner. Specified user not found.' },
                    { status: 400 }
                );
            }
            ownerUscId = userInfo[0].usc_id;
        } else {
            // Use the current session user's USC ID
            ownerUscId = session.uscId;
        }

        console.log('Determined ownerUscId:', ownerUscId);

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

        // Check if plate number already exists with active status (pending or approved)
        const existingVehicle = await executeQuery(
            'SELECT vehicle_id FROM vehicles WHERE plate_number = ? AND approval_status IN (?, ?)',
            [plateNumber, 'pending', 'approved']
        );

        if (existingVehicle.length > 0) {
            return Response.json(
                { error: 'A vehicle with this plate number is already registered or pending approval' },
                { status: 409 }
            );
        }

        // For self-registration, set defaults for status and dates
        const approvalStatus = 'pending';
        const stickerStatus = 'pending'; // Use 'pending' which is allowed in the ENUM
        // Always provide a registration_date value to avoid NULL constraint issues
        // For admin: use provided date or current date
        // For self-registration: use a default date (1900-01-01) to indicate "not registered yet"
        const regDate = (session.userRole === 'Admin' && registrationDate)
            ? registrationDate
            : (session.userRole === 'Admin' ? new Date().toISOString().split('T')[0] : '1900-01-01');

        console.log('Registration date to be used:', regDate);

        // Insert vehicle with proper defaults
        const result = await executeQuery(
            `INSERT INTO vehicles 
            (usc_id, vehicle_type, make, model, color, plate_number, registration_date, 
             created_at, updated_at, approval_status, sticker_status, year) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
            [ownerUscId, vehicleType, make, model, color, plateNumber, regDate,
                approvalStatus, stickerStatus, yearValue]
        );

        return Response.json({
            success: true,
            message: session.userRole === 'Admin'
                ? 'Vehicle registered successfully'
                : 'Vehicle submitted for approval. You will be notified once reviewed.',
            vehicleId: result.insertId,
            uscId: ownerUscId
        });

    } catch (error) {
        console.error('Create vehicle error:', error);
        return Response.json(
            { error: 'Failed to register vehicle. Please try again.' },
            { status: 500 }
        );
    }
}