import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tagUid, description } = await request.json();

        // Validate required fields
        if (!tagUid) {
            return Response.json(
                { error: 'Tag UID is required' },
                { status: 400 }
            );
        }

        // Check if tag UID already exists
        const existingTag = await executeQuery(
            'SELECT id FROM rfid_tags WHERE tag_uid = ?',
            [tagUid]
        );

        if (existingTag.length > 0) {
            return Response.json(
                { error: 'An RFID tag with this UID already exists' },
                { status: 409 }
            );
        }

        // Insert RFID tag
        const result = await executeQuery(
            `INSERT INTO rfid_tags (tag_uid, status, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [tagUid, 'unassigned']
        );

        return Response.json({
            success: true,
            message: 'RFID tag created successfully',
            tagId: result.insertId
        });

    } catch (error) {
        console.error('Create RFID tag error:', error);
        return Response.json(
            { error: 'Failed to create RFID tag. Please try again.' },
            { status: 500 }
        );
    }
}