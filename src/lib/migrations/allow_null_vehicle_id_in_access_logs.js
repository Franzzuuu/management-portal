import { executeQuery } from '../database.js';

/**
 * Migration: Allow NULL vehicle_id in access_logs table
 * 
 * Purpose: Support access logging for failed RFID reads where vehicle lookup fails.
 * When an RFID tag is scanned but no matching vehicle is found, we should still
 * record the attempt and mark it as failed (success = 0).
 */
export async function allowNullVehicleIdInAccessLogs() {
    try {
        console.log('Running migration: Allow NULL vehicle_id in access_logs table...');

        // First, check if the column is already nullable
        const checkQuery = `
            SELECT IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'access_logs' 
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
            AND TABLE_NAME = 'access_logs' 
            AND COLUMN_NAME = 'vehicle_id' 
            AND REFERENCED_TABLE_NAME = 'vehicles'
        `;
        
        const constraintResult = await executeQuery(constraintQuery);
        
        if (constraintResult.length > 0) {
            const constraintName = constraintResult[0].CONSTRAINT_NAME;
            console.log(`Dropping foreign key constraint: ${constraintName}`);
            
            await executeQuery(`
                ALTER TABLE access_logs 
                DROP FOREIGN KEY ${constraintName}
            `);
        }

        // Modify the vehicle_id column to allow NULL
        await executeQuery(`
            ALTER TABLE access_logs 
            MODIFY COLUMN vehicle_id INT NULL
        `);

        console.log('✓ Modified vehicle_id to allow NULL values');

        // Re-add the foreign key constraint with NULL support
        await executeQuery(`
            ALTER TABLE access_logs 
            ADD CONSTRAINT fk_access_logs_vehicle_id 
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) 
            ON DELETE SET NULL
        `);

        console.log('✓ Re-added foreign key constraint with ON DELETE SET NULL');

        // Add index for better query performance on vehicle_id lookups
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_vehicle_id 
            ON access_logs (vehicle_id)
        `);

        console.log('✓ Added index on vehicle_id');

        console.log('✓ Migration completed successfully!');

        return { 
            success: true, 
            message: 'vehicle_id in access_logs table now allows NULL values'
        };

    } catch (error) {
        console.error('Migration failed:', error);
        throw new Error(`Failed to allow NULL vehicle_id in access_logs: ${error.message}`);
    }
}

/**
 * Rollback function to revert the migration
 * WARNING: This will fail if there are any access logs with NULL vehicle_id
 */
export async function rollbackAllowNullVehicleIdInAccessLogs() {
    try {
        console.log('Rolling back migration: Disallow NULL vehicle_id in access_logs table...');

        // Check if any access logs have NULL vehicle_id
        const nullCheckQuery = `
            SELECT COUNT(*) as count 
            FROM access_logs 
            WHERE vehicle_id IS NULL
        `;
        
        const nullCheckResult = await executeQuery(nullCheckQuery);
        
        if (nullCheckResult[0].count > 0) {
            throw new Error(`Cannot rollback: ${nullCheckResult[0].count} access logs have NULL vehicle_id. Please fix these records first.`);
        }

        // Drop the existing foreign key constraint
        const constraintQuery = `
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'access_logs' 
            AND COLUMN_NAME = 'vehicle_id' 
            AND REFERENCED_TABLE_NAME = 'vehicles'
        `;
        
        const constraintResult = await executeQuery(constraintQuery);
        
        if (constraintResult.length > 0) {
            const constraintName = constraintResult[0].CONSTRAINT_NAME;
            
            await executeQuery(`
                ALTER TABLE access_logs 
                DROP FOREIGN KEY ${constraintName}
            `);
        }

        // Modify the vehicle_id column to NOT NULL
        await executeQuery(`
            ALTER TABLE access_logs 
            MODIFY COLUMN vehicle_id INT NOT NULL
        `);

        // Re-add the foreign key constraint
        await executeQuery(`
            ALTER TABLE access_logs 
            ADD CONSTRAINT fk_access_logs_vehicle_id 
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) 
            ON DELETE CASCADE
        `);

        console.log('✓ Rollback completed successfully!');

        return { 
            success: true, 
            message: 'vehicle_id in access_logs table is now NOT NULL'
        };

    } catch (error) {
        console.error('Rollback failed:', error);
        throw new Error(`Failed to rollback NULL vehicle_id in access_logs: ${error.message}`);
    }
}
