import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all RFID tags with vehicle and owner information
        const tags = await queryMany(`
      SELECT 
        rt.*,
        v.plate_number as vehicle_plate,
        v.make as vehicle_make,
        v.model as vehicle_model,
        up.full_name as owner_name
      FROM rfid_tags rt
      LEFT JOIN vehicles v ON rt.vehicle_id = v.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ORDER BY rt.created_at DESC
    `);

        return Response.json({
            success: true,
            tags: tags || []
        });

    } catch (error) {
        console.error('Fetch RFID tags error:', error);
        return Response.json(
            { error: 'Failed to fetch RFID tags' },
            { status: 500 }
        );
    }
}