import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all violations with joined data
        const violations = await queryMany(`
            SELECT 
                v.id,
                v.description,
                v.image_filename,
                v.image_mime_type,
                CASE WHEN v.image_data IS NOT NULL THEN 1 ELSE 0 END as has_image,
                v.status,
                v.created_at,
                v.updated_at,
                ve.plate_number,
                ve.make as vehicle_make,
                ve.model as vehicle_model,
                ve.color as vehicle_color,
                up.full_name as owner_name,
                u.designation as owner_designation,
                vt.name as violation_type,
                v.violation_type_id,
                reporter.full_name as reported_by_name
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.id
            JOIN users u ON ve.user_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            JOIN violation_types vt ON v.violation_type_id = vt.id
            JOIN users ru ON v.reported_by = ru.id
            JOIN user_profiles reporter ON ru.id = reporter.user_id
            ORDER BY v.created_at DESC
        `);

        return Response.json({
            success: true,
            violations: violations || []
        });

    } catch (error) {
        console.error('Fetch violations error:', error);
        return Response.json(
            { error: 'Failed to fetch violations' },
            { status: 500 }
        );
    }
}