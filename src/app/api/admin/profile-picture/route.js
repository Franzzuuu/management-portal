import { queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

// Upload profile picture
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is an Admin user
        if (session.userRole !== 'Admin') {
            return Response.json({ error: 'Access denied. Admin only.' }, { status: 403 });
        }

        const data = await request.json();
        const { image_data, image_type } = data;

        if (!image_data || !image_type) {
            return Response.json({
                success: false,
                error: 'Image data and type are required'
            }, { status: 400 });
        }

        try {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(image_data, 'base64');

            // Update admin's profile picture in user_profiles
            const existing = await queryOne(
                'SELECT id FROM user_profiles WHERE usc_id = ?',
                [session.uscId]
            );

            if (existing) {
                await executeQuery(
                    'UPDATE user_profiles SET profile_picture = ?, profile_picture_type = ? WHERE usc_id = ?',
                    [imageBuffer, image_type, session.uscId]
                );
            } else {
                await executeQuery(
                    'INSERT INTO user_profiles (usc_id, profile_picture, profile_picture_type) VALUES (?, ?, ?)',
                    [session.uscId, imageBuffer, image_type]
                );
            }

            return Response.json({
                success: true,
                message: 'Profile picture updated successfully'
            }, { status: 200 });

        } catch (dbError) {
            console.error('Database operation failed:', dbError);
            throw dbError; // Re-throw to be caught by outer try-catch
        }
    } catch (error) {
        console.error('Admin profile picture upload error:', error);
        return Response.json({
            success: false,
            error: 'Failed to upload profile picture'
        }, { status: 500 });
    }
}

// Get profile picture
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is an Admin user
        if (session.userRole !== 'Admin') {
            return Response.json({ error: 'Access denied. Admin only.' }, { status: 403 });
        }

        const details = await queryOne(
            'SELECT profile_picture, profile_picture_type FROM user_profiles WHERE usc_id = ?',
            [session.uscId]
        );

        if (!details || !details.profile_picture) {
            return Response.json({
                success: false,
                error: 'No profile picture found'
            }, { status: 404 });
        }

        // Convert buffer to base64
        const base64Image = details.profile_picture.toString('base64');

        return Response.json({
            success: true,
            image_data: base64Image,
            image_type: details.profile_picture_type || 'image/jpeg'
        }, { status: 200 });

    } catch (error) {
        console.error('Admin profile picture fetch error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch profile picture'
        }, { status: 500 });
    }
}
