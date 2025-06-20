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
        v.*,
        up.full_name as owner_name,
        u.email as owner_email,
        u.designation as owner_designation
      FROM vehicles v
      JOIN users u ON v.user_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
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