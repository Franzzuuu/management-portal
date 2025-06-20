import { executeQuery, queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { violationId } = await request.json();

        // Validate input
        if (!violationId) {
            return Response.json(
                { error: 'Violation ID is required' },
                { status: 400 }
            );
        }

        // Check if violation exists
        const violation = await queryOne(
            'SELECT id FROM violations WHERE id = ?',
            [violationId]
        );

        if (!violation) {
            return Response.json(
                { error: 'Violation not found' },
                { status: 404 }
            );
        }

        // Delete violation record (image data will be deleted automatically)
        await executeQuery('DELETE FROM violations WHERE id = ?', [violationId]);

        return Response.json({
            success: true,
            message: 'Violation deleted successfully'
        });

    } catch (error) {
        console.error('Delete violation error:', error);
        return Response.json(
            { error: 'Failed to delete violation' },
            { status: 500 }
        );
    }
}