// src/lib/migrations/add_analytics_indexes.js
import { executeQuery } from '../database.js';

// Helper function to create index only if it doesn't exist (MySQL compatible)
async function createIndexIfNotExists(tableName, indexName, columns) {
    try {
        const [existingIndex] = await executeQuery(`
            SHOW INDEX FROM ${tableName} WHERE Key_name = ?
        `, [indexName]);
        
        if (!existingIndex || existingIndex.length === 0) {
            await executeQuery(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
            console.log(`  ✓ Created index ${indexName}`);
            return true;
        } else {
            console.log(`  → Index ${indexName} already exists`);
            return false;
        }
    } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
            console.log(`  → Index ${indexName} already exists`);
            return false;
        }
        console.log(`  → Could not create index ${indexName}: ${error.message}`);
        return false;
    }
}

export async function up() {
    try {
        console.log('Adding analytics performance indexes...');

        // Access logs analytics indexes
        await createIndexIfNotExists('access_logs', 'idx_access_logs_analytics_timestamp', 'timestamp');
        await createIndexIfNotExists('access_logs', 'idx_access_logs_analytics_entry_type', 'entry_type, timestamp');
        
        // Note: Functional indexes on expressions like HOUR() are not well supported in older MySQL
        // Skipping those functional indexes for compatibility

        // Vehicle analytics indexes
        await createIndexIfNotExists('vehicles', 'idx_vehicles_analytics_type', 'vehicle_type');
        await createIndexIfNotExists('vehicles', 'idx_vehicles_analytics_created', 'created_at');

        // User analytics indexes
        await createIndexIfNotExists('users', 'idx_users_analytics_designation', 'designation, status');
        await createIndexIfNotExists('users', 'idx_users_analytics_active', 'status, created_at');

        // Join optimization indexes
        await createIndexIfNotExists('users', 'idx_users_usc_id_status', 'usc_id, status');
        await createIndexIfNotExists('vehicles', 'idx_vehicles_usc_vehicle_id', 'usc_id, vehicle_id');
        await createIndexIfNotExists('access_logs', 'idx_access_logs_vehicle_timestamp', 'vehicle_id, timestamp');

        console.log('Analytics performance indexes migration completed');

    } catch (error) {
        console.error('Error creating analytics indexes:', error);
        throw error;
    }
}

export async function down() {
    try {
        console.log('Dropping analytics performance indexes...');

        const indexMappings = [
            { table: 'access_logs', index: 'idx_access_logs_analytics_timestamp' },
            { table: 'access_logs', index: 'idx_access_logs_analytics_entry_type' },
            { table: 'access_logs', index: 'idx_access_logs_vehicle_timestamp' },
            { table: 'vehicles', index: 'idx_vehicles_analytics_type' },
            { table: 'vehicles', index: 'idx_vehicles_analytics_created' },
            { table: 'vehicles', index: 'idx_vehicles_usc_vehicle_id' },
            { table: 'users', index: 'idx_users_analytics_designation' },
            { table: 'users', index: 'idx_users_analytics_active' },
            { table: 'users', index: 'idx_users_usc_id_status' },
        ];

        for (const { table, index } of indexMappings) {
            try {
                await executeQuery(`DROP INDEX ${index} ON ${table}`);
                console.log(`  ✓ Dropped index ${index}`);
            } catch (error) {
                console.log(`  → Index ${index} does not exist or could not be dropped`);
            }
        }

        console.log('Analytics performance indexes dropped successfully');

    } catch (error) {
        console.error('Error dropping analytics indexes:', error);
        throw error;
    }
}