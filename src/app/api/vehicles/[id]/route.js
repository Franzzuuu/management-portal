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
                v.approval_status,
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