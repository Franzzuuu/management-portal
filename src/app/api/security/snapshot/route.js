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

        // Get ALL violations in the system for total count
        const totalViolationsQuery = `SELECT COUNT(*) as count FROM violations`;
        const totalResult = await queryMany(totalViolationsQuery, []);
        const totalViolations = totalResult[0]?.count || 0;

        // Convert uscId to database user ID
        const userIdQuery = `SELECT id FROM users WHERE usc_id = ?`;
        const userIdResult = await queryMany(userIdQuery, [userId]);
        
        if (userIdResult.length === 0) {
            console.error('User not found for uscId:', userId);
            return Response.json({
                success: false,
                error: 'User not found',
                stats: {
                    totalViolations: totalViolations,
                    selfIssuedViolations: 0,
                    contributionPercentage: 0
                },
                recentViolations: [],
                violations: []
            }, { status: 404 });
        }
        
        const databaseUserId = userIdResult[0].id;
        console.log('Security snapshot: Converting uscId', userId, 'to database ID', databaseUserId);

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

        const violations = await queryMany(violationsQuery, [databaseUserId]);

        const selfIssuedViolations = violations.length;
        const contributionPercentage = totalViolations > 0 
            ? ((selfIssuedViolations / totalViolations) * 100).toFixed(1)
            : 0;

        const stats = {
            totalViolations: totalViolations,
            selfIssuedViolations: selfIssuedViolations,
            contributionPercentage: contributionPercentage
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
                selfIssuedViolations: 0,
                contributionPercentage: 0
            },
            recentViolations: [],
            violations: []
        }, { status: 500 });
    }
}