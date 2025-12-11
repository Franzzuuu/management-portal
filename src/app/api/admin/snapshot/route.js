import { queryMany } from '@/lib/database';

export async function GET() {
    try {
        // Use Promise.allSettled to prevent one query failure from breaking all
        const [accessLogsResult, pendingVehiclesResult, countResult] = await Promise.allSettled([
            // Get entry/exit activity (last 5)
            queryMany(`
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
            `),
            
            // Get pending vehicle approvals
            queryMany(`
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
            `),
            
            // Get count of all pending approvals
            queryMany(`
                SELECT COUNT(*) as count
                FROM vehicles v
                WHERE v.approval_status = 'pending' 
                   OR (v.approval_status = 'approved' AND v.sticker_status = 'unassigned')
            `)
        ]);

        const entryExit = accessLogsResult.status === 'fulfilled' ? accessLogsResult.value : [];
        const pendingVehicleApprovals = pendingVehiclesResult.status === 'fulfilled' ? pendingVehiclesResult.value : [];
        const pendingApprovalsCount = countResult.status === 'fulfilled' 
            ? parseInt(countResult.value[0]?.count || 0) 
            : 0;

        // Log any failures
        if (accessLogsResult.status === 'rejected') {
            console.error('Failed to fetch access logs:', accessLogsResult.reason);
        }
        if (pendingVehiclesResult.status === 'rejected') {
            console.error('Failed to fetch pending vehicles:', pendingVehiclesResult.reason);
        }
        if (countResult.status === 'rejected') {
            console.error('Failed to fetch count:', countResult.reason);
        }

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