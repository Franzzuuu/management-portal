import { queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request, { params }) {
    try {
        const session = await getSession();
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const resolvedParams = await params;
        const violationId = resolvedParams.id;

        // Get violation data with image
        const violation = await queryOne(`
            SELECT 
                v.image_data,
                v.image_mime_type,
                v.image_filename,
                ve.user_id as vehicle_owner_id
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.id
            WHERE v.id = ? AND v.image_data IS NOT NULL
        `, [violationId]);

        if (!violation) {
            return new Response('Violation or image not found', { status: 404 });
        }

        // Check permissions: Admin/Security/Staff can view all images, users can view their own
        const hasPermission = ['Admin', 'Security', 'Staff'].includes(session.userRole) ||
            violation.vehicle_owner_id === session.userId;

        if (!hasPermission) {
            return new Response('Forbidden', { status: 403 });
        }

        // Get the blob data and convert it to proper image response
        const imageData = violation.image_data;
        const mimeType = violation.image_mime_type || 'image/jpeg';
        const filename = violation.image_filename || 'violation-image.jpg';

        // Ensure we have valid image data
        if (!imageData) {
            return new Response('No image data found', { status: 404 });
        }

        // Convert to Buffer if it's not already
        let imageBuffer;
        if (Buffer.isBuffer(imageData)) {
            imageBuffer = imageData;
        } else {
            // Handle different data formats
            imageBuffer = Buffer.from(imageData);
        }

        // Return the image with proper headers
        return new Response(imageBuffer, {
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `inline; filename="${filename}"`,
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'private, max-age=3600',
            },
        });

    } catch (error) {
        console.error('View image error:', error);
        return new Response('Failed to serve image', { status: 500 });
    }
}
