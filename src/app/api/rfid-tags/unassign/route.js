import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tagId } = await request.json();

        // Validate input
        if (!tagId) {
            return Response.json(
                { error: 'Tag ID is required' },
                { status: 400 }
            );
        }

        // Check if tag exists and is assigned
        const tag = await executeQuery(
            'SELECT * FROM rfid_tags WHERE id = ? AND status = "active"',
            [tagId]
        );

        if (tag.length === 0) {
            return Response.json(
                { error: 'RFID tag not found or not assigned' },
                { status: 404 }
            );
        }

        // Unassign RFID tag
        await executeQuery(
            'UPDATE rfid_tags SET vehicle_id = NULL, status = "unassigned", assigned_date = NULL WHERE id = ?',
            [tagId]
        );

        return Response.json({
            success: true,
            message: 'RFID tag unassigned successfully'
        });

    } catch (error) {
        console.error('Unassign RFID tag error:', error);
        return Response.json(
            { error: 'Failed to unassign RFID tag. Please try again.' },
            { status: 500 }
        );
    }
}