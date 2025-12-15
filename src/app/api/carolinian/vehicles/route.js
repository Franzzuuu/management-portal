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

        const uscId = session.uscId;

        // Get user's vehicles with RFID tag information (using approval_status for consistency)
        // Note: sticker_rejection_reason column may not exist if migration hasn't run
        let vehicles;
        try {
            vehicles = await queryMany(`
                SELECT 
                    v.vehicle_id,
                    v.plate_number,
                    v.make,
                    v.model,
                    v.year,
                    v.color,
                    v.vehicle_type,
                    v.approval_status as registration_status,
                    v.sticker_status,
                    v.sticker_rejection_reason,
                    v.created_at,
                    rt.tag_uid as rfid_tag_uid,
                    rt.status as rfid_status
                FROM vehicles v
                LEFT JOIN rfid_tags rt ON v.vehicle_id = rt.vehicle_id
                WHERE v.usc_id = ?
                ORDER BY v.created_at DESC
            `, [uscId]);
        } catch (columnError) {
            // Fallback if sticker_rejection_reason column doesn't exist yet
            if (columnError.code === 'ER_BAD_FIELD_ERROR') {
                vehicles = await queryMany(`
                    SELECT 
                        v.vehicle_id,
                        v.plate_number,
                        v.make,
                        v.model,
                        v.year,
                        v.color,
                        v.vehicle_type,
                        v.approval_status as registration_status,
                        v.sticker_status,
                        NULL as sticker_rejection_reason,
                        v.created_at,
                        rt.tag_uid as rfid_tag_uid,
                        rt.status as rfid_status
                    FROM vehicles v
                    LEFT JOIN rfid_tags rt ON v.vehicle_id = rt.vehicle_id
                    WHERE v.usc_id = ?
                    ORDER BY v.created_at DESC
                `, [uscId]);
            } else {
                throw columnError;
            }
        }

        // Format the response
        const formattedVehicles = vehicles.map(vehicle => ({
            ...vehicle,
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