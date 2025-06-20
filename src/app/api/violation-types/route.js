import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        // Check if user is authenticated
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all violation types
        const types = await queryMany(`
            SELECT id, name, description, created_at
            FROM violation_types
            ORDER BY name ASC
        `);

        return Response.json({
            success: true,
            types: types || []
        });

    } catch (error) {
        console.error('Fetch violation types error:', error);
        return Response.json(
            { error: 'Failed to fetch violation types' },
            { status: 500 }
        );
    }
}