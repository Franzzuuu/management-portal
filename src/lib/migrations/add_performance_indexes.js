// src/lib/migrations/add_performance_indexes.js
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
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log(`  → Table ${tableName} does not exist, skipping ${indexName}`);
            return false;
        }
        console.log(`  → Could not create index ${indexName}: ${error.message}`);
        return false;
    }
}

export async function up() {
    try {
        console.log('Adding performance indexes for export and reporting system...');

        // Export jobs performance indexes
        await createIndexIfNotExists('export_jobs', 'idx_export_jobs_user_status', 'user_id, status');
        await createIndexIfNotExists('export_jobs', 'idx_export_jobs_created_at', 'created_at');
        await createIndexIfNotExists('export_jobs', 'idx_export_jobs_status_created', 'status, created_at');

        // Audit log performance indexes (if table exists)
        await createIndexIfNotExists('audit_log', 'idx_audit_log_user_created', 'user_id, created_at');
        await createIndexIfNotExists('audit_log', 'idx_audit_log_resource', 'resource_type, resource_id');
        await createIndexIfNotExists('audit_log', 'idx_audit_log_action_created', 'action, created_at');

        // Access logs performance indexes for reporting
        await createIndexIfNotExists('access_logs', 'idx_access_logs_timestamp_vehicle', 'timestamp, vehicle_id');
        await createIndexIfNotExists('access_logs', 'idx_access_logs_success_timestamp', 'success, timestamp');

        // Violations performance indexes for reporting
        await createIndexIfNotExists('violations', 'idx_violations_created_status', 'created_at, status');
        await createIndexIfNotExists('violations', 'idx_violations_vehicle_created', 'vehicle_id, created_at');
        await createIndexIfNotExists('violations', 'idx_violations_type_created', 'violation_type_id, created_at');

        // Users performance indexes for reporting
        await createIndexIfNotExists('users', 'idx_users_status_created', 'status, created_at');
        await createIndexIfNotExists('users', 'idx_users_designation_status', 'designation, status');

        // Vehicles performance indexes for reporting
        await createIndexIfNotExists('vehicles', 'idx_vehicles_approval_created', 'approval_status, created_at');
        await createIndexIfNotExists('vehicles', 'idx_vehicles_type_approval', 'vehicle_type, approval_status');
        await createIndexIfNotExists('vehicles', 'idx_vehicles_usc_id', 'usc_id');

        // User profiles performance index (if table exists)
        await createIndexIfNotExists('user_profiles', 'idx_user_profiles_usc_id', 'usc_id');

        console.log('Performance indexes migration completed');

    } catch (error) {
        console.error('Error creating performance indexes:', error);
        throw error;
    }
}

export async function down() {
    try {
        console.log('Dropping performance indexes...');

        const indexMappings = [
            { table: 'export_jobs', index: 'idx_export_jobs_user_status' },
            { table: 'export_jobs', index: 'idx_export_jobs_created_at' },
            { table: 'export_jobs', index: 'idx_export_jobs_status_created' },
            { table: 'audit_log', index: 'idx_audit_log_user_created' },
            { table: 'audit_log', index: 'idx_audit_log_resource' },
            { table: 'audit_log', index: 'idx_audit_log_action_created' },
            { table: 'access_logs', index: 'idx_access_logs_timestamp_vehicle' },
            { table: 'access_logs', index: 'idx_access_logs_success_timestamp' },
            { table: 'violations', index: 'idx_violations_created_status' },
            { table: 'violations', index: 'idx_violations_vehicle_created' },
            { table: 'violations', index: 'idx_violations_type_created' },
            { table: 'users', index: 'idx_users_status_created' },
            { table: 'users', index: 'idx_users_designation_status' },
            { table: 'vehicles', index: 'idx_vehicles_approval_created' },
            { table: 'vehicles', index: 'idx_vehicles_type_approval' },
            { table: 'vehicles', index: 'idx_vehicles_usc_id' },
            { table: 'user_profiles', index: 'idx_user_profiles_usc_id' },
        ];

        for (const { table, index } of indexMappings) {
            try {
                await executeQuery(`DROP INDEX ${index} ON ${table}`);
                console.log(`  ✓ Dropped index ${index}`);
            } catch (error) {
                console.log(`  → Index ${index} does not exist or could not be dropped`);
            }
        }

        console.log('Performance indexes dropped successfully');

    } catch (error) {
        console.error('Error dropping performance indexes:', error);
        throw error;
    }
}