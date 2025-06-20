import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

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
            JOIN vehicles v ON al.vehicle_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
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