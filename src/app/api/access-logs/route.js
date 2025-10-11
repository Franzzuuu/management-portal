import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';

export async function GET(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // For now, let's use a simple query without complex filtering
        // We'll get all logs and let the frontend handle filtering
        const query = `
            SELECT 
                al.id,
                al.vehicle_id,
                al.tag_uid,
                al.entry_type,
                al.timestamp,
                al.gate_location,
                al.success,
                v.plate_number,
                v.make as vehicle_make,
                v.model as vehicle_model,
                v.color as vehicle_color,
                v.vehicle_type,
                up.full_name as user_name,
                u.designation,
                u.email
            FROM access_logs al
            JOIN vehicles v ON al.vehicle_id = v.vehicle_id
            JOIN users u ON v.usc_id = u.usc_id
            JOIN user_profiles up ON u.usc_id = up.usc_id
            ORDER BY al.timestamp DESC
            LIMIT 100
        `;

        // Execute query without parameters for now
        const logs = await queryMany(query);

        return Response.json({
            success: true,
            logs: logs || [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: logs?.length || 0,
                itemsPerPage: 100
            }
        });

    } catch (error) {
        console.error('Access logs fetch error:', error);
        return Response.json(
            { error: 'Failed to fetch access logs' },
            { status: 500 }
        );
    }
}

// POST endpoint for creating access logs (used by RFID hardware)
export async function POST(request) {
    try {
        const body = await request.json();
        const { vehicle_id, tag_uid, entry_type, gate_location } = body;

        // Validate required fields
        if (!vehicle_id || !tag_uid || !entry_type) {
            return Response.json(
                { error: 'Missing required fields: vehicle_id, tag_uid, entry_type' },
                { status: 400 }
            );
        }

        // Validate entry_type
        if (!['entry', 'exit'].includes(entry_type)) {
            return Response.json(
                { error: 'Invalid entry_type. Must be "entry" or "exit"' },
                { status: 400 }
            );
        }

        // Insert new access log
        const insertQuery = `
            INSERT INTO access_logs (
                vehicle_id, 
                tag_uid, 
                entry_type, 
                timestamp,
                location,
                gate_location,
                success
            ) VALUES (?, ?, ?, NOW(), ?, ?, TRUE)
        `;

        const locationValue = entry_type === 'entry' ? 'entrance' : 'exit';

        await queryMany(insertQuery, [
            vehicle_id,
            tag_uid,
            entry_type,
            locationValue,
            gate_location || 'Main Gate'
        ]);

        // Emit real-time update for entry/exit activity
        try {
            // Get vehicle details for the real-time payload
            const vehicleQuery = `
                SELECT 
                    v.plate_number,
                    v.make,
                    v.model,
                    v.owner_id,
                    up.full_name as owner_name
                FROM vehicles v
                LEFT JOIN users u ON v.owner_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE v.id = ?
            `;
            const vehicleResult = await queryMany(vehicleQuery, [vehicle_id]);
            const vehicle = vehicleResult?.[0];

            emit('entry_exit_updates', {
                id: Date.now(), // Temporary ID
                entry_type,
                timestamp: new Date().toISOString(),
                plate_number: vehicle?.plate_number || 'Unknown',
                location: gate_location || 'Main Gate',
                vehicle_make: vehicle?.make,
                vehicle_model: vehicle?.model,
                owner_id: vehicle?.owner_id,
                owner_name: vehicle?.owner_name,
                created_at: new Date().toISOString()
            });
        } catch (emitError) {
            console.warn('Failed to emit real-time update:', emitError);
        }

        return Response.json({
            success: true,
            message: 'Access log created successfully'
        });

    } catch (error) {
        console.error('Access log creation error:', error);
        return Response.json(
            { error: 'Failed to create access log' },
            { status: 500 }
        );
    }
}