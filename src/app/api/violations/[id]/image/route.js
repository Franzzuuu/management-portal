import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

// GET /api/violations/[id]/image - Serve violation images
export async function GET(request, context) {
    try {
        const session = await getSession();
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const params = await context.params;
        const violationId = params.id;

        // Check if user has permission to view this image
        const violation = await queryMany(`
            SELECT 
                v.image_data,
                v.image_mime_type,
                v.image_filename,
                ve.user_id as vehicle_owner_id,
                u.email as updated_by_email,
                u.designation as updated_by_designation
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.id
            LEFT JOIN users u ON v.updated_by = u.id
            WHERE v.id = ?
        `, [violationId]);

        if (violation.length === 0) {
            return new Response('Violation not found', { status: 404 });
        }

        const violationData = violation[0];

        // Check permissions: Admin/Security/Staff can view all images
        const hasPermission = ['Admin', 'Security', 'Staff'].includes(session.userRole) ||
            violationData.vehicle_owner_id === session.userId;

        if (!hasPermission) {
            console.log('Access denied. User role:', session.userRole, 'User ID:', session.userId);
            return new Response('Forbidden', { status: 403 });
        }

        if (!violationData.image_data) {
            return new Response('No image found', { status: 404 });
        }

        // Convert Buffer to Base64 and serve the image
        const base64Image = violationData.image_data.toString('base64');
        return new Response(base64Image, {
            headers: {
                'Content-Type': 'text/plain', // Send as base64 text
                'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
            },
        });

    } catch (error) {
        console.error('Violation image API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}