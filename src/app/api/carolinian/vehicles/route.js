import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied. Students and Faculty only.' }, { status: 403 });
        }

        const userId = session.userId;

        // Get user's vehicles with RFID tag information (using correct column names)
        const vehicles = await queryMany(`
            SELECT 
                v.id,
                v.plate_number,
                v.make,
                v.model,
                v.color,
                v.registration_date,
                v.sticker_status as registration_status,
                v.created_at,
                rt.tag_uid as rfid_tag_uid,
                rt.status as rfid_status
            FROM vehicles v
            LEFT JOIN rfid_tags rt ON v.id = rt.vehicle_id
            WHERE v.user_id = ?
            ORDER BY v.created_at DESC
        `, [userId]);

        // Format the response
        const formattedVehicles = vehicles.map(vehicle => ({
            ...vehicle,
            year: new Date(vehicle.registration_date).getFullYear(), // Extract year from registration_date
            registration_status: vehicle.registration_status || 'pending'
        }));

        return Response.json({
            success: true,
            vehicles: formattedVehicles
        });

    } catch (error) {
        console.error('Carolinian vehicles API error:', error);
        return Response.json(
            { error: 'Failed to fetch vehicles' },
            { status: 500 }
        );
    }
}