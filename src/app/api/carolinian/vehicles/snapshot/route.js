import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const uscId = session.uscId;

        // Get registered vehicles (approved)
        const registeredQuery = `
            SELECT 
                v.vehicle_id,
                v.vehicle_type,
                v.make,
                v.model,
                v.year,
                v.color,
                v.plate_number,
                v.approval_status,
                v.sticker_status,
                v.registration_date,
                v.created_at,
                rt.tag_uid as rfid_tag_uid
            FROM vehicles v
            LEFT JOIN rfid_tags rt ON v.vehicle_id = rt.vehicle_id
            WHERE v.usc_id = ? AND v.approval_status = 'approved'
            ORDER BY v.created_at DESC
        `;
        const registered = await queryMany(registeredQuery, [uscId]);

        // Get pending vehicles 
        const pendingQuery = `
            SELECT 
                v.vehicle_id,
                v.vehicle_type,
                v.make,
                v.model,
                v.year,
                v.color,
                v.plate_number,
                v.approval_status,
                v.sticker_status,
                v.created_at
            FROM vehicles v
            WHERE v.usc_id = ? AND v.approval_status IN ('pending', 'rejected')
            ORDER BY v.created_at DESC
        `;
        const pending = await queryMany(pendingQuery, [uscId]);

        return Response.json({
            success: true,
            registered: registered || [],
            pending: pending || []
        });

    } catch (error) {
        console.error('Carolinian vehicles snapshot API error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch vehicles snapshot data',
            registered: [],
            pending: []
        }, { status: 500 });
    }
}