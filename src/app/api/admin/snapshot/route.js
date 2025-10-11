import { queryMany } from '@/lib/database';

export async function GET() {
    try {
        // Get entry/exit activity (last 5)
        const accessLogsQuery = `
            SELECT 
                al.id,
                al.entry_type,
                al.timestamp,
                al.gate_location as location,
                al.created_at,
                v.plate_number,
                v.make as vehicle_make,
                v.model as vehicle_model,
                up.full_name as owner_name
            FROM access_logs al
            LEFT JOIN vehicles v ON al.vehicle_id = v.vehicle_id
            LEFT JOIN users u ON v.usc_id = u.usc_id
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            ORDER BY al.timestamp DESC, al.created_at DESC
            LIMIT 5
        `;

        const entryExit = await queryMany(accessLogsQuery);

        // Get pending vehicle approvals count and items
        const pendingVehiclesQuery = `
            SELECT 
                v.vehicle_id as id,
                v.make,
                v.model,
                v.plate_number,
                v.approval_status,
                v.sticker_status,
                v.created_at,
                v.updated_at,
                up.full_name as owner_name,
                CASE 
                    WHEN v.approval_status = 'pending' THEN 'Needs Approval'
                    WHEN v.approval_status = 'approved' AND v.sticker_status = 'unassigned' THEN 'Needs RFID Assignment'
                    ELSE 'Other Action Required'
                END as pending_reason
            FROM vehicles v
            LEFT JOIN user_profiles up ON v.usc_id = up.usc_id
            WHERE v.approval_status = 'pending' 
               OR (v.approval_status = 'approved' AND v.sticker_status = 'unassigned')
            ORDER BY v.created_at DESC
            LIMIT 5
        `;

        const pendingVehicleApprovals = await queryMany(pendingVehiclesQuery);

        // Get count of all pending approvals
        const countQuery = `
            SELECT COUNT(*) as count
            FROM vehicles v
            WHERE v.approval_status = 'pending' 
               OR (v.approval_status = 'approved' AND v.sticker_status = 'unassigned')
        `;

        const countResult = await queryMany(countQuery);
        const pendingApprovalsCount = parseInt(countResult[0]?.count || 0);

        return Response.json({
            success: true,
            entryExit,
            pendingVehicleApprovals,
            pendingApprovalsCount
        });

    } catch (error) {
        console.error('Admin snapshot API error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch admin snapshot data',
            entryExit: [],
            pendingVehicleApprovals: [],
            pendingApprovalsCount: 0
        }, { status: 500 });
    }
}