import { queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

// Upload profile picture
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const data = await request.json();
        const { image_data, image_type } = data;

        if (!image_data || !image_type) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Image data and type are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(image_data, 'base64');

        // Update user's profile picture in user_profiles table
        await executeQuery(
            'UPDATE user_profiles SET profile_picture = ?, profile_picture_type = ? WHERE usc_id = ?',
            [imageBuffer, image_type, session.uscId]
        );

        return new Response(JSON.stringify({
            success: true,
            message: 'Profile picture updated successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Profile picture upload error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to upload profile picture'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get profile picture
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const result = await queryOne(
            'SELECT profile_picture, profile_picture_type FROM user_profiles WHERE usc_id = ?',
            [session.uscId]
        );

        if (!result || !result.profile_picture) {
            return new Response('No profile picture found', { status: 404 });
        }

        // Convert buffer to base64
        const base64Image = result.profile_picture.toString('base64');

        return new Response(JSON.stringify({
            success: true,
            image_data: base64Image,
            image_type: result.profile_picture_type
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Profile picture fetch error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch profile picture'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
