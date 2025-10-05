import { addProfilePictureColumns } from '@/lib/migrations/add_profile_picture_columns';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Run the profile picture columns migration
        await addProfilePictureColumns();

        return Response.json({
            success: true,
            message: 'Profile picture columns added successfully'
        });

    } catch (error) {
        console.error('Migration API error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Migration failed'
        }, { status: 500 });
    }
}