import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { executeQuery } from '@/lib/database';

export async function GET(request, { params }) {
    try {
        // Check for session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');
        if (!sessionCookie) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get specific vehicle by ID
        const vehicles = await executeQuery(
            `SELECT 
                v.vehicle_id,
                v.plate_number,
                v.make,
                v.model,
                v.color,
                v.vehicle_type,
                v.year,
                v.approval_status,
                v.sticker_status,
                v.usc_id,
                up.full_name as owner_name,
                rt.tag_uid,
                rt.status as tag_status,
                CASE 
                    WHEN rt.tag_uid IS NULL THEN 'untagged'
                    ELSE 'tagged'
                END as rfid_status
            FROM vehicles v
            JOIN users u ON v.usc_id = u.usc_id
            JOIN user_profiles up ON v.usc_id = up.usc_id
            LEFT JOIN rfid_vehicle_system.rfid_tags rt ON v.vehicle_id = rt.vehicle_id
            WHERE v.vehicle_id = ?
            LIMIT 1`,
            [id]
        );

        if (vehicles.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, vehicle: vehicles[0] });

    } catch (error) {
        console.error('Failed to fetch vehicle:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        // Check for session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');
        if (!sessionCookie) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // First check if the vehicle exists
        const vehicleCheck = await executeQuery(
            'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
            [id]
        );

        if (vehicleCheck.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        // First, get all violations associated with this vehicle
        const violationResults = await executeQuery(
            'SELECT id FROM violations WHERE vehicle_id = ?',
            [id]
        );
        const violationIds = violationResults.map(v => v.id);

        if (violationIds.length > 0) {
            console.log(`Found ${violationIds.length} violations for vehicle ${id}, deleting them...`);

            // Helper function for IN queries
            const executeInQuery = async (query, values) => {
                if (values.length === 0) return { affectedRows: 0 };
                const placeholders = values.map(() => '?').join(',');
                const finalQuery = query.replace('IN ?', `IN (${placeholders})`);
                return await executeQuery(finalQuery, values);
            };

            // Delete violation contests
            const contestsResult = await executeInQuery(
                'DELETE FROM violation_contests WHERE violation_id IN ?',
                violationIds
            );
            console.log(`Deleted ${contestsResult.affectedRows} violation contests`);

            // Delete violation history
            const historyResult = await executeInQuery(
                'DELETE FROM violation_history WHERE violation_id IN ?',
                violationIds
            );
            console.log(`Deleted ${historyResult.affectedRows} violation history records`);

            // Delete violation status history
            const statusHistoryResult = await executeInQuery(
                'DELETE FROM violation_status_history WHERE violation_id IN ?',
                violationIds
            );
            console.log(`Deleted ${statusHistoryResult.affectedRows} violation status history records`);

            // Finally, delete the violations themselves
            const violationsResult = await executeInQuery(
                'DELETE FROM violations WHERE id IN ?',
                violationIds
            );
            console.log(`Deleted ${violationsResult.affectedRows} violations`);
        }

        // Check for any related RFID tags and delete them
        await executeQuery(
            'DELETE FROM rfid_vehicle_system.rfid_tags WHERE vehicle_id = ?',
            [id]
        );

        // Delete the vehicle
        await executeQuery(
            'DELETE FROM vehicles WHERE vehicle_id = ?',
            [id]
        );

        return NextResponse.json({
            success: true,
            message: 'Vehicle deleted successfully'
        });

    } catch (error) {
        console.error('Failed to delete vehicle:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}