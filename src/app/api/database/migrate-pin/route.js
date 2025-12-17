import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        console.log('Running migration: Add PIN column...');

        // Check if column exists
        const columnExists = await executeQuery(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'pin'
        `);
        
        if (columnExists.length > 0) {
            console.log('✅ pin column already exists');
            return Response.json({
                success: true,
                message: 'PIN column already exists'
            });
        }
        
        // Add pin column
        console.log('Adding pin column to users table...');
        await executeQuery(`
            ALTER TABLE users
            ADD COLUMN pin VARCHAR(4) UNIQUE NULL
            AFTER password_hash
        `);
        
        console.log('✅ PIN column added successfully');

        return Response.json({
            success: true,
            message: 'PIN column added successfully'
        });

    } catch (error) {
        console.error('Migration error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Migration failed'
        }, { status: 500 });
    }
}
