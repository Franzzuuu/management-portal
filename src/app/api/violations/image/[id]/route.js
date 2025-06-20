import { queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request, { params }) {
    try {
        // Check if user is authenticated
        const session = await getSession();
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const violationId = params.id;

        // Get image data from database
        const violation = await queryOne(
            'SELECT image_data, image_filename, image_mime_type FROM violations WHERE id = ? AND image_data IS NOT NULL',
            [violationId]
        );

        if (!violation || !violation.image_data) {
            return new Response('Image not found', { status: 404 });
        }

        // Return image with proper headers
        return new Response(violation.image_data, {
            headers: {
                'Content-Type': violation.image_mime_type || 'image/jpeg',
                'Content-Disposition': `inline; filename="${violation.image_filename || 'violation.jpg'}"`,
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
            },
        });

    } catch (error) {
        console.error('Serve image error:', error);
        return new Response('Failed to serve image', { status: 500 });
    }
}