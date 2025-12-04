import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied. Students and Faculty only.' }, { status: 403 });
        }

        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit') || '50';
        const uscId = session.uscId;

        // Get access logs for user's vehicles (using correct column names)
        // Remove LIMIT from prepared statement and use string interpolation for the limit
        const logs = await queryMany(`
            SELECT 
                al.id,
                al.timestamp,
                al.entry_type as access_type,
                al.gate_location,
                al.tag_uid as rfid_tag_scanned,
                v.plate_number,
                v.make as vehicle_make,
                v.model as vehicle_model,
                v.color as vehicle_color
            FROM access_logs al
            JOIN vehicles v ON al.vehicle_id = v.vehicle_id
            WHERE v.usc_id = ?
            ORDER BY al.timestamp DESC
            LIMIT ${parseInt(limitParam, 10)}
        `, [uscId]);

        return Response.json({
            success: true,
            logs: logs || []
        });

    } catch (error) {
        console.error('Carolinian access logs API error:', error);
        return Response.json(
            { error: 'Failed to fetch access logs' },
            { status: 500 }
        );
    }
}