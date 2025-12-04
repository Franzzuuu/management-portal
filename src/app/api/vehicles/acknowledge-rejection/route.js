import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { vehicleId } = body;

        if (!vehicleId) {
            return Response.json(
                { error: 'Vehicle ID is required' },
                { status: 400 }
            );
        }

        // Check if the vehicle exists and belongs to the current user
        const vehicle = await executeQuery(
            `SELECT v.vehicle_id, v.usc_id, v.approval_status 
             FROM vehicles v 
             WHERE v.vehicle_id = ?`,
            [vehicleId]
        );

        if (vehicle.length === 0) {
            return Response.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        // Verify ownership - user can only acknowledge their own rejected vehicles
        if (vehicle[0].usc_id !== session.uscId) {
            return Response.json(
                { error: 'You can only acknowledge your own vehicles' },
                { status: 403 }
            );
        }

        // Verify vehicle is rejected
        if (vehicle[0].approval_status !== 'rejected') {
            return Response.json(
                { error: 'Only rejected vehicles can be acknowledged' },
                { status: 400 }
            );
        }

        // Delete the rejected vehicle
        await executeQuery(
            'DELETE FROM vehicles WHERE vehicle_id = ?',
            [vehicleId]
        );

        return Response.json({
            success: true,
            message: 'Rejected vehicle acknowledged and removed'
        });

    } catch (error) {
        console.error('Acknowledge rejected vehicle error:', error);
        return Response.json(
            { error: 'Failed to acknowledge rejected vehicle. Please try again.' },
            { status: 500 }
        );
    }
}
