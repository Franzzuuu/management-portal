import { queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        console.log('Session:', session);

        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!session.uscId) {
            console.error('Missing uscId in session');
            return Response.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Get the user's database ID from their USC ID
        const userResult = await executeQuery(
            'SELECT id FROM users WHERE usc_id = ?',
            [session.uscId]
        );

        if (userResult.length === 0) {
            console.error('User not found for uscId:', session.uscId);
            return Response.json({ error: 'User not found' }, { status: 401 });
        }

        const userId = userResult[0].id;
        console.log('Found user ID:', userId, 'for USC ID:', session.uscId);

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

        // Log all values before insertion
        console.log('Inserting violation with values:', {
            vehicleId,
            violationTypeId,
            description,
            hasImageData: !!imageData,
            imageFilename,
            imageMimeType,
            uscId: session.uscId,
            userId: userId
        });

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

        // Ensure null is used for optional parameters instead of undefined
        const params = [
            vehicleId,
            violationTypeId,
            description || '',
            imageData || null,
            imageFilename || null,
            imageMimeType || null,
            userId  // Use the database user ID instead of uscId
        ];

        console.log('Query parameters:', params.map(p => p === null ? 'null' : typeof p));

        // Execute the query with the parameters
        await executeQuery(insertQuery, params);

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