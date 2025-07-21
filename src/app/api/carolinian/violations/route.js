import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied. Students and Faculty only.' }, { status: 403 });
        }

        const url = new URL(request.url);
        const view = url.searchParams.get('view') || 'current';
        const userId = session.userId;

        let violations = [];

        // Base query to get violations for user's vehicles
        // Check if contest columns exist
        let contestColumns = '';
        try {
            // Try to access contest columns
            await queryMany('SELECT contest_status FROM violations LIMIT 1');
            contestColumns = `
                v.contest_status,
                v.contest_explanation,
                v.contest_submitted_at,
            `;
        } catch (error) {
            // Contest columns don't exist yet
            console.warn('Contest columns not found in violations table');
            contestColumns = `
                NULL as contest_status,
                NULL as contest_explanation,
                NULL as contest_submitted_at,
            `;
        }

        const baseQuery = `
            SELECT 
                v.id,
                v.created_at,
                v.description,
                v.status,
                ${contestColumns}
                v.location,
                v.image_data IS NOT NULL as has_image,
                vt.name as violation_type,
                vt.description as violation_description,
                ve.plate_number,
                ve.make as vehicle_make,
                ve.model as vehicle_model,
                ve.color as vehicle_color
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.id
            JOIN violation_types vt ON v.violation_type_id = vt.id
            WHERE ve.user_id = ?
        `;

        switch (view) {
            case 'current':
                // Show only pending violations
                violations = await queryMany(`
                    ${baseQuery}
                    AND v.status = 'pending'
                    ORDER BY v.created_at DESC
                `, [userId]);
                break;

            case 'history':
                // Show all violations
                violations = await queryMany(`
                    ${baseQuery}
                    ORDER BY v.created_at DESC
                `, [userId]);
                break;

            case 'appeals':
                // Show only violations with contest submissions
                violations = await queryMany(`
                    ${baseQuery}
                    AND v.contest_status IS NOT NULL
                    ORDER BY v.contest_submitted_at DESC
                `, [userId]);
                break;

            default:
                violations = await queryMany(`
                    ${baseQuery}
                    ORDER BY v.created_at DESC
                `, [userId]);
        }

        return Response.json({
            success: true,
            violations: violations || []
        });

    } catch (error) {
        console.error('Carolinian violations API error:', error);
        return Response.json(
            { error: 'Failed to fetch violations' },
            { status: 500 }
        );
    }
}