import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Add updated_by column to violations table
        const alterQuery = `
            ALTER TABLE violations
            ADD COLUMN updated_by BIGINT UNSIGNED DEFAULT NULL,
            ADD FOREIGN KEY (updated_by) REFERENCES users(id)
        `;

        await executeQuery(alterQuery);

        return Response.json({
            success: true,
            message: 'Successfully added updated_by field to violations table'
        });

    } catch (error) {
        console.error('Failed to add updated_by field:', error);
        return Response.json({
            error: 'Failed to modify database structure',
            details: error.message
        }, { status: 500 });
    }
}
