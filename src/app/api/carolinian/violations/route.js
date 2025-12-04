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
        const uscId = session.uscId;

        let violations = [];

        // Base query to get violations for user's vehicles with contest data
        const baseQuery = `
            SELECT 
                v.id,
                v.created_at,
                v.description,
                v.status,
                v.location,
                v.image_data IS NOT NULL as has_image,
                vt.name as violation_type,
                vt.description as violation_description,
                ve.plate_number,
                ve.make as vehicle_make,
                ve.model as vehicle_model,
                ve.color as vehicle_color,
                vc.contest_status,
                vc.contest_notes as contest_explanation,
                vc.created_at as contest_submitted_at,
                vc.review_notes as admin_review_notes,
                vc.reviewed_at as appeal_reviewed_at
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
            JOIN violation_types vt ON v.violation_type_id = vt.id
            JOIN users u ON ve.usc_id = u.usc_id
            LEFT JOIN violation_contests vc ON v.id = vc.violation_id
            WHERE u.usc_id = ?
        `;

        switch (view) {
            case 'current':
                // Show pending and contested violations (active violations)
                // Exclude 'closed' and 'resolved' violations
                violations = await queryMany(`
                    ${baseQuery}
                    AND v.status IN ('pending', 'contested')
                    ORDER BY v.created_at DESC
                `, [uscId]);
                break;

            case 'history':
                // Show all violations including closed ones
                violations = await queryMany(`
                    ${baseQuery}
                    ORDER BY v.created_at DESC
                `, [uscId]);
                break;

            case 'appeals':
                // Show only violations with contest submissions
                violations = await queryMany(`
                    ${baseQuery}
                    AND vc.id IS NOT NULL
                    ORDER BY vc.created_at DESC
                `, [uscId]);
                break;

            default:
                violations = await queryMany(`
                    ${baseQuery}
                    ORDER BY v.created_at DESC
                `, [uscId]);
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