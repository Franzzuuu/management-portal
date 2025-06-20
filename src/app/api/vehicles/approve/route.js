import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vehicleId, status } = await request.json();

        // Validate input
        if (!vehicleId || !status || !['approved', 'rejected'].includes(status)) {
            return Response.json(
                { error: 'Vehicle ID and valid status (approved/rejected) are required' },
                { status: 400 }
            );
        }

        // Update vehicle approval status
        await executeQuery(
            'UPDATE vehicles SET approval_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, vehicleId]
        );

        return Response.json({
            success: true,
            message: `Vehicle ${status} successfully`
        });

    } catch (error) {
        console.error('Approve vehicle error:', error);
        return Response.json(
            { error: 'Failed to update vehicle status. Please try again.' },
            { status: 500 }
        );
    }
}