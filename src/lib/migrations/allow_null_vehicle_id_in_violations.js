import { executeQuery } from '../database.js';

/**
 * Migration: Allow NULL vehicle_id in violations table
 * 
 * Purpose: Support quick violation reporting by tag_uid when vehicle lookup fails.
 * The quick-report endpoint needs to create violations even when the vehicle
 * associated with a tag_uid is not found in the database.
 */
export async function allowNullVehicleIdInViolations() {
    try {
        console.log('Running migration: Allow NULL vehicle_id in violations table...');

        // First, check if the column is already nullable
        const checkQuery = `
            SELECT IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'vehicle_id'
        `;
        
        const result = await executeQuery(checkQuery);
        
        if (result.length > 0 && result[0].IS_NULLABLE === 'YES') {
            console.log('✓ vehicle_id is already nullable. Skipping migration.');
            return { success: true, skipped: true };
        }

        // Drop the foreign key constraint first
        // We need to get the constraint name dynamically
        const constraintQuery = `
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'vehicle_id' 
            AND REFERENCED_TABLE_NAME = 'vehicles'
        `;
        
        const constraintResult = await executeQuery(constraintQuery);
        
        if (constraintResult.length > 0) {
            const constraintName = constraintResult[0].CONSTRAINT_NAME;
            console.log(`Dropping foreign key constraint: ${constraintName}`);
            
            await executeQuery(`
                ALTER TABLE violations 
                DROP FOREIGN KEY ${constraintName}
            `);
        }

        // Modify the vehicle_id column to allow NULL
        await executeQuery(`
            ALTER TABLE violations 
            MODIFY COLUMN vehicle_id INT NULL
        `);

        console.log('✓ Modified vehicle_id to allow NULL values');

        // Re-add the foreign key constraint with NULL support
        await executeQuery(`
            ALTER TABLE violations 
            ADD CONSTRAINT fk_violations_vehicle_id 
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) 
            ON DELETE SET NULL
        `);

        console.log('✓ Re-added foreign key constraint with ON DELETE SET NULL');

        // Add index for better query performance on vehicle_id lookups (if not exists)
        try {
            // Check if index exists first
            const [indexes] = await executeQuery(`
                SHOW INDEX FROM violations WHERE Key_name = 'idx_violations_vehicle_id'
            `);
            
            if (!indexes || indexes.length === 0) {
                await executeQuery(`
                    ALTER TABLE violations 
                    ADD INDEX idx_violations_vehicle_id (vehicle_id)
                `);
                console.log('✓ Added index idx_violations_vehicle_id');
            } else {
                console.log('→ Index idx_violations_vehicle_id already exists');
            }
        } catch (indexError) {
            console.log('→ Index may already exist or failed:', indexError.message);
        }

        console.log('✓ Migration completed successfully!');

        return { 
            success: true, 
            message: 'vehicle_id in violations table now allows NULL values'
        };

    } catch (error) {
        console.error('Migration failed:', error);
        throw new Error(`Failed to allow NULL vehicle_id in violations: ${error.message}`);
    }
}

/**
 * Rollback function to revert the migration
 * WARNING: This will fail if there are any violations with NULL vehicle_id
 */
export async function rollbackAllowNullVehicleId() {
    try {
        console.log('Rolling back migration: Disallow NULL vehicle_id in violations table...');

        // Check if any violations have NULL vehicle_id
        const nullCheckQuery = `
            SELECT COUNT(*) as count 
            FROM violations 
            WHERE vehicle_id IS NULL
        `;
        
        const nullResult = await executeQuery(nullCheckQuery);
        
        if (nullResult[0].count > 0) {
            throw new Error(
                `Cannot rollback: ${nullResult[0].count} violations have NULL vehicle_id. ` +
                'Please delete or update these records before rolling back.'
            );
        }

        // Drop the existing foreign key
        const constraintQuery = `
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'vehicle_id'
        `;
        
        const constraintResult = await executeQuery(constraintQuery);
        
        if (constraintResult.length > 0) {
            const constraintName = constraintResult[0].CONSTRAINT_NAME;
            await executeQuery(`
                ALTER TABLE violations 
                DROP FOREIGN KEY ${constraintName}
            `);
        }

        // Modify the vehicle_id column to NOT NULL
        await executeQuery(`
            ALTER TABLE violations 
            MODIFY COLUMN vehicle_id INT NOT NULL
        `);

        // Re-add the foreign key constraint
        await executeQuery(`
            ALTER TABLE violations 
            ADD CONSTRAINT fk_violations_vehicle_id 
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) 
            ON DELETE CASCADE
        `);

        console.log('✓ Rollback completed successfully!');

        return { 
            success: true, 
            message: 'vehicle_id in violations table is now NOT NULL again'
        };

    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}
