import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Checking for related_id column in notifications table...');

        // Check if column exists
        const columns = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'notifications' 
            AND COLUMN_NAME = 'related_id'
        `);

        if (columns.length === 0) {
            console.log('Adding related_id column to notifications table...');
            await executeQuery(`
                ALTER TABLE notifications 
                ADD COLUMN related_id INT NULL AFTER type
            `);
            console.log('✅ related_id column added successfully!');
            
            return Response.json({
                success: true,
                message: 'related_id column added to notifications table'
            });
        } else {
            return Response.json({
                success: true,
                message: 'related_id column already exists'
            });
        }

    } catch (error) {
        console.error('Migration error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
