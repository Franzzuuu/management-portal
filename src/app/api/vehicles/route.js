import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get all vehicles with owner information
        const vehicles = await queryMany(`
      SELECT 
        v.vehicle_id,
        v.plate_number,
        v.make,
        v.model,
        v.color,
        v.vehicle_type as type,
        v.approval_status,
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