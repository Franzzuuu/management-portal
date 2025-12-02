import { executeQuery } from '../database.js';

/**
 * Migration script to ensure violations table has all required columns
 * for the quick-report feature
 */
export async function ensureViolationsColumnsExist() {
    try {
        console.log('Running migration: Ensure violations table has all required columns...');

        const migrations = [];

        // Check if location column exists
        const locationCheck = await executeQuery(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'location'
        `);

        if (locationCheck[0].count === 0) {
            migrations.push({
                name: 'Add location column',
                query: `ALTER TABLE violations ADD COLUMN location VARCHAR(255) NULL AFTER description`
            });
        }

        // Check if contest_status column exists
        const contestStatusCheck = await executeQuery(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'contest_status'
        `);

        if (contestStatusCheck[0].count === 0) {
            migrations.push({
                name: 'Add contest_status column',
                query: `ALTER TABLE violations ADD COLUMN contest_status ENUM('pending', 'under_review', 'approved', 'denied') DEFAULT 'pending' AFTER status`
            });
        }

        // Check if contest_explanation column exists
        const contestExplanationCheck = await executeQuery(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'contest_explanation'
        `);

        if (contestExplanationCheck[0].count === 0) {
            migrations.push({
                name: 'Add contest_explanation column',
                query: `ALTER TABLE violations ADD COLUMN contest_explanation TEXT NULL AFTER contest_status`
            });
        }

        // Run all necessary migrations
        if (migrations.length === 0) {
            console.log('✓ All required columns already exist. No migration needed.');
            return { success: true, skipped: true };
        }

        for (const migration of migrations) {
            console.log(`Running: ${migration.name}...`);
            await executeQuery(migration.query);
            console.log(`✓ ${migration.name} completed`);
        }

        console.log(`✓ Migration completed successfully! ${migrations.length} column(s) added.`);

        return { 
            success: true, 
            message: `Added ${migrations.length} column(s) to violations table`,
            columnsAdded: migrations.map(m => m.name)
        };

    } catch (error) {
        console.error('Migration failed:', error);
        throw new Error(`Failed to ensure violations columns exist: ${error.message}`);
    }
}

// Export as default for easy execution
export default ensureViolationsColumnsExist;
