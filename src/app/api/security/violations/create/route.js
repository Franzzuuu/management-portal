import { queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is security personnel
        const session = await getSession();
        if (!session || session.userRole !== 'Security') {
            return Response.json({ error: 'Unauthorized. Only Security personnel can create violations.' }, { status: 401 });
        }

        const formData = await request.formData();
        const vehicleId = formData.get('vehicleId');
        const violationTypeId = formData.get('violationTypeId');
        const description = formData.get('description') || '';
        const imageFile = formData.get('image');

        // Validate required fields
        if (!vehicleId || !violationTypeId) {
            return Response.json(
                { error: 'Vehicle and violation type are required' },
                { status: 400 }
            );
        }

        let imageData = null;
        let imageFilename = null;
        let imageMimeType = null;

        // Handle image upload if provided
        if (imageFile && imageFile.size > 0) {
            // Convert image to buffer for database storage
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            imageData = buffer;
            imageFilename = imageFile.name;
            imageMimeType = imageFile.type;

            // Validate image type
            if (!imageMimeType.startsWith('image/')) {
                return Response.json(
                    { error: 'Only image files are allowed' },
                    { status: 400 }
                );
            }

            // Check file size (limit to 5MB)
            if (imageFile.size > 5 * 1024 * 1024) {
                return Response.json(
                    { error: 'Image file too large. Maximum size is 5MB' },
                    { status: 400 }
                );
            }
        }

        // Insert violation record with image data
        const insertQuery = `
            INSERT INTO violations (
                vehicle_id, 
                violation_type_id, 
                description, 
                image_data,
                image_filename,
                image_mime_type,
                reported_by, 
                status, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `;

        await executeQuery(insertQuery, [
            vehicleId,
            violationTypeId,
            description,
            imageData,
            imageFilename,
            imageMimeType,
            session.userId
        ]);

        return Response.json({
            success: true,
            message: 'Violation reported successfully'
        });

    } catch (error) {
        console.error('Create violation error:', error);
        return Response.json(
            { error: 'Failed to create violation' },
            { status: 500 }
        );
    }
}
