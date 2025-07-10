import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

// GET /api/violations/[id]/image - Serve violation images
export async function GET(request, { params }) {
    try {
        const session = await getSession();
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const violationId = params.id;

        // Check if user has permission to view this image
        const violation = await queryMany(`
            SELECT 
                v.image_data,
                v.image_mime_type,
                v.image_filename,
                ve.user_id as vehicle_owner_id
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.id
            WHERE v.id = ?
        `, [violationId]);

        if (violation.length === 0) {
            return new Response('Violation not found', { status: 404 });
        }

        const violationData = violation[0];

        // Check permissions: Admin/Staff can view all, users can only view their own
        const hasPermission = ['Admin', 'Staff'].includes(session.userRole) ||
            violationData.vehicle_owner_id === session.userId;

        if (!hasPermission) {
            return new Response('Forbidden', { status: 403 });
        }

        if (!violationData.image_data) {
            return new Response('No image found', { status: 404 });
        }

        // Serve the image
        return new Response(violationData.image_data, {
            headers: {
                'Content-Type': violationData.image_mime_type || 'image/jpeg',
                'Content-Disposition': `inline; filename="${violationData.image_filename || `violation_${violationId}.jpg`}"`,
                'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
            },
        });

    } catch (error) {
        console.error('Violation image API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}