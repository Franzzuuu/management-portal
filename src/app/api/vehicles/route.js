import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check if user is authenticated
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const mine = searchParams.get('mine');
        const pendingActions = searchParams.get('pendingActions');
        const limit = searchParams.get('limit');

        // If pendingActions=1, return vehicles needing admin action (approval or RFID assignment)
        if (pendingActions === '1') {
            // First get the count
            const countQuery = `
                SELECT COUNT(*) as count
                FROM vehicles v
                LEFT JOIN rfid_tags rt ON rt.vehicle_id = v.vehicle_id
                JOIN user_profiles up ON up.usc_id = v.usc_id
                WHERE v.approval_status = 'pending'
                   OR (v.approval_status = 'approved' AND (rt.vehicle_id IS NULL OR v.sticker_status = 'unassigned'))
            `;

            const countResult = await queryMany(countQuery);
            const totalCount = countResult[0]?.count || 0;

            // Then get the items
            const itemsQuery = `
                SELECT v.vehicle_id, v.make, v.model, v.plate_number, v.approval_status, v.sticker_status,
                       up.full_name AS owner_name, v.created_at, v.updated_at,
                       CASE 
                         WHEN v.approval_status = 'pending' THEN 'Needs Approval'
                         WHEN v.approval_status = 'approved' AND rt.vehicle_id IS NULL THEN 'Needs RFID'
                         WHEN v.approval_status = 'approved' AND v.sticker_status = 'unassigned' THEN 'Needs RFID'
                       END AS pending_reason
                FROM vehicles v
                LEFT JOIN rfid_tags rt ON rt.vehicle_id = v.vehicle_id
                JOIN user_profiles up ON up.usc_id = v.usc_id
                WHERE v.approval_status = 'pending'
                   OR (v.approval_status = 'approved' AND (rt.vehicle_id IS NULL OR v.sticker_status = 'unassigned'))
                ORDER BY v.updated_at DESC, v.created_at DESC
                ${limit ? `LIMIT ${parseInt(limit)}` : ''}
            `;

            const items = await queryMany(itemsQuery);

            return Response.json({
                success: true,
                count: totalCount,
                items: items || []
            });
        }

        // If mine=1, return user's own vehicles split by status
        if (mine === '1') {
            const vehicles = await queryMany(`
                SELECT 
                    v.vehicle_id,
                    v.plate_number,
                    v.make,
                    v.model,
                    v.year,
                    v.color,
                    v.vehicle_type,
                    v.approval_status,
                    v.sticker_status,
                    v.registration_date,
                    v.created_at,
                    v.updated_at,
                    rt.tag_uid as rfid_tag_uid,
                    rt.status as rfid_status
                FROM vehicles v
                LEFT JOIN rfid_tags rt ON v.vehicle_id = rt.vehicle_id
                WHERE v.usc_id = ?
                ORDER BY v.created_at DESC
            `, [session.uscId]);

            // Split vehicles by approval status
            const registered = vehicles.filter(v => v.approval_status === 'approved');
            const pending = vehicles.filter(v => v.approval_status === 'pending');

            return Response.json({
                success: true,
                registered,
                pending
            });
        }

        // Admin access to all vehicles
        if (session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
        }

        // Get all vehicles with owner information for admin
        const vehicles = await queryMany(`
            SELECT 
                v.vehicle_id,
                v.plate_number,
                v.make,
                v.model,
                v.year,
                v.color,
                v.vehicle_type as type,
                v.approval_status,
                v.sticker_status,
                v.registration_date,
                v.created_at,
                v.updated_at,
                up.full_name as owner_name,
                u.email as owner_email,
                u.designation as owner_designation,
                up.department as owner_department
            FROM vehicles v
            JOIN users u ON v.usc_id = u.usc_id
            JOIN user_profiles up ON u.usc_id = up.usc_id
            ORDER BY v.created_at DESC
        `);

        return Response.json({
            success: true,
            vehicles: vehicles || []
        });

    } catch (error) {
        console.error('Fetch vehicles error:', error);
        return Response.json(
            { error: 'Failed to fetch vehicles' },
            { status: 500 }
        );
    }
}