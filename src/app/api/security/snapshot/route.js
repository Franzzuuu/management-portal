import { queryMany } from '@/lib/database';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return Response.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        // Get violations reported by this security user
        const violationsQuery = `
            SELECT 
                v.id,
                vt.name as violation_type,
                v.status,
                vh.plate_number as vehicle_plate,
                up.full_name as owner_name,
                v.created_at,
                v.reported_by
            FROM violations v
            LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
            LEFT JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
            LEFT JOIN users u ON vh.usc_id = u.usc_id
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            WHERE v.reported_by = ?
            ORDER BY v.created_at DESC
            LIMIT 10
        `;

        const violations = await queryMany(violationsQuery, [userId]); const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const stats = {
            totalViolations: violations.length,
            pendingViolations: violations.filter(v => v.status === 'pending').length,
            resolvedViolations: violations.filter(v => v.status === 'resolved').length,
            contestedViolations: violations.filter(v => v.status === 'contested').length,
            todayViolations: violations.filter(v => new Date(v.created_at) >= today).length,
            weeklyViolations: violations.filter(v => new Date(v.created_at) >= weekAgo).length,
            monthlyViolations: violations.filter(v => new Date(v.created_at) >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)).length
        };

        const recentViolations = violations.slice(0, 5);

        return Response.json({
            success: true,
            stats,
            recentViolations,
            violations: recentViolations
        });

    } catch (error) {
        console.error('Security snapshot API error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch security snapshot data',
            stats: {
                totalViolations: 0,
                pendingViolations: 0,
                resolvedViolations: 0,
                contestedViolations: 0,
                todayViolations: 0,
                weeklyViolations: 0,
                monthlyViolations: 0
            },
            recentViolations: [],
            violations: []
        }, { status: 500 });
    }
}