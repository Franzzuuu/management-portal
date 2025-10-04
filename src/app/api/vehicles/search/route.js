import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { executeQuery } from '@/lib/database';
import mysql from 'mysql2/promise';

export async function GET(request) {
    try {
        // Get the search query
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query') || '';

        // Check for session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');
        if (!sessionCookie) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Perform the search query
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
            WHERE (
                v.plate_number LIKE ? OR
                v.make LIKE ? OR
                v.model LIKE ? OR
                up.full_name LIKE ? OR
                v.usc_id LIKE ?
            )
            ORDER BY v.plate_number ASC`,
            Array(5).fill(`%${mysql.escape(query.trim()).slice(1, -1)}%`) // Escape the query for each LIKE clause
        );

        return NextResponse.json({ success: true, vehicles });

    } catch (error) {
        console.error('Failed to search vehicles:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}