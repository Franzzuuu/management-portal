import { executeQuery, queryOne, queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function PUT(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, status } = await request.json();

        // Validate input
        if (!userId || !status) {
            return Response.json(
                { error: 'User ID and status are required' },
                { status: 400 }
            );
        }

        // Validate status values
        const validStatuses = ['active', 'inactive', 'pending'];
        if (!validStatuses.includes(status)) {
            return Response.json(
                { error: 'Invalid status. Must be active, inactive, or pending' },
                { status: 400 }
            );
        }

        // Prevent admin from deactivating themselves
        if (session.userId == userId && status === 'inactive') {
            return Response.json(
                { error: 'You cannot deactivate your own account' },
                { status: 400 }
            );
        }

        // Update user status
        const result = await executeQuery(
            'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, userId]
        );

        if (result.affectedRows === 0) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // If deactivating user, also set their vehicles' RFID tags to inactive and vehicles to pending
        if (status === 'inactive') {
            // Get user's usc_id
            const user = await queryOne('SELECT usc_id FROM users WHERE id = ?', [userId]);
            
            if (user?.usc_id) {
                // Get all vehicle IDs owned by this user
                const vehicles = await queryMany(
                    'SELECT vehicle_id FROM vehicles WHERE usc_id = ?',
                    [user.usc_id]
                );
                
                if (vehicles && vehicles.length > 0) {
                    const vehicleIds = vehicles.map(v => v.vehicle_id);
                    const placeholders = vehicleIds.map(() => '?').join(',');
                    
                    // Set all RFID tags for these vehicles to inactive
                    await executeQuery(
                        `UPDATE rfid_tags SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
                         WHERE vehicle_id IN (${placeholders})`,
                        vehicleIds
                    );
                    
                    // Set all vehicles' sticker_status to pending
                    await executeQuery(
                        `UPDATE vehicles SET sticker_status = 'pending', updated_at = CURRENT_TIMESTAMP 
                         WHERE vehicle_id IN (${placeholders})`,
                        vehicleIds
                    );
                }
            }
        }

        // If reactivating user, also reactivate their vehicles' RFID tags
        if (status === 'active') {
            const user = await queryOne('SELECT usc_id FROM users WHERE id = ?', [userId]);
            
            if (user?.usc_id) {
                const vehicles = await queryMany(
                    'SELECT vehicle_id FROM vehicles WHERE usc_id = ?',
                    [user.usc_id]
                );
                
                if (vehicles && vehicles.length > 0) {
                    const vehicleIds = vehicles.map(v => v.vehicle_id);
                    const placeholders = vehicleIds.map(() => '?').join(',');
                    
                    // Reactivate RFID tags that were inactive
                    await executeQuery(
                        `UPDATE rfid_tags SET status = 'active', updated_at = CURRENT_TIMESTAMP 
                         WHERE vehicle_id IN (${placeholders}) AND status = 'inactive'`,
                        vehicleIds
                    );

                    await executeQuery(
                        `UPDATE vehicles SET sticker_status = 'active', updated_at = CURRENT_TIMESTAMP 
                         WHERE vehicle_id IN (${placeholders}) AND status = 'pending'`,
                        vehicleIds
                    );
                }
            }
        }

        return Response.json({
            success: true,
            message: `User status updated to ${status}`
        });

    } catch (error) {
        console.error('Update user status error:', error);
        return Response.json(
            { error: 'Failed to update user status' },
            { status: 500 }
        );
    }
}
