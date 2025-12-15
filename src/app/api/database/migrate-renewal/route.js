import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        console.log('Running migration: Add renewal_requested status...');

        // Step 1: Modify sticker_status enum to include 'renewal_requested'
        console.log('Step 1: Modifying sticker_status enum...');
        
        await executeQuery(`
            ALTER TABLE vehicles 
            MODIFY COLUMN sticker_status ENUM('renewed', 'expired', 'pending', 'renewal_requested') DEFAULT 'pending'
        `);
        console.log('✓ Added renewal_requested to sticker_status enum');

        // Step 2: Add sticker_rejection_reason column if it doesn't exist
        console.log('Step 2: Adding sticker_rejection_reason column...');
        
        const columnExists = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'vehicles' 
            AND COLUMN_NAME = 'sticker_rejection_reason'
        `);

        if (columnExists.length === 0) {
            await executeQuery(`
                ALTER TABLE vehicles 
                ADD COLUMN sticker_rejection_reason VARCHAR(255) NULL AFTER sticker_status
            `);
            console.log('✓ Added sticker_rejection_reason column');
        } else {
            console.log('→ sticker_rejection_reason column already exists, skipping');
        }

        // Step 3: Add index for faster queries on sticker_status
        console.log('Step 3: Adding index for sticker_status...');
        
        const indexExists = await executeQuery(`
            SHOW INDEX FROM vehicles WHERE Key_name = 'idx_sticker_status'
        `);

        if (indexExists.length === 0) {
            await executeQuery(`
                ALTER TABLE vehicles ADD INDEX idx_sticker_status (sticker_status)
            `);
            console.log('✓ Added index idx_sticker_status');
        } else {
            console.log('→ Index idx_sticker_status already exists, skipping');
        }

        console.log('✅ Migration completed successfully!');

        return Response.json({
            success: true,
            message: 'Renewal status migration completed successfully'
        });

    } catch (error) {
        console.error('Migration error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Migration failed'
        }, { status: 500 });
    }
}
