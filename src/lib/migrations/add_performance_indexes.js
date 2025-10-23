// src/lib/migrations/add_performance_indexes.js
import { executeQuery } from '../database.js';

export async function up() {
    try {
        console.log('Adding performance indexes for export and reporting system...');

        // Export jobs performance indexes
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_user_status 
            ON export_jobs (user_id, status)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at 
            ON export_jobs (created_at DESC)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_status_created 
            ON export_jobs (status, created_at DESC)
        `);

        // Audit log performance indexes
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_audit_log_user_created 
            ON audit_log (user_id, created_at DESC)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_audit_log_resource 
            ON audit_log (resource_type, resource_id)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_audit_log_action_created 
            ON audit_log (action, created_at DESC)
        `);

        // Access logs performance indexes for reporting
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp_vehicle 
            ON access_logs (timestamp DESC, vehicle_id)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_date_entry_type 
            ON access_logs (DATE(timestamp), entry_type)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_success_timestamp 
            ON access_logs (success, timestamp DESC)
        `);

        // Violations performance indexes for reporting
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_violations_created_status 
            ON violations (created_at DESC, status)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_violations_vehicle_created 
            ON violations (vehicle_id, created_at DESC)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_violations_type_created 
            ON violations (violation_type_id, created_at DESC)
        `);

        // Users performance indexes for reporting
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_users_status_created 
            ON users (status, created_at DESC)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_users_designation_status 
            ON users (designation, status)
        `);

        // Vehicles performance indexes for reporting
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_vehicles_approval_created 
            ON vehicles (approval_status, created_at DESC)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_vehicles_type_approval 
            ON vehicles (vehicle_type, approval_status)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_vehicles_usc_id 
            ON vehicles (usc_id)
        `);

        // User profiles performance index
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_user_profiles_usc_id 
            ON user_profiles (usc_id)
        `);

        // Composite indexes for common report queries
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_composite 
            ON access_logs (DATE(timestamp), entry_type, success, location)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_violations_composite 
            ON violations (DATE(created_at), status, violation_type_id)
        `);

        console.log('Performance indexes created successfully');

    } catch (error) {
        console.error('Error creating performance indexes:', error);
        throw error;
    }
}

export async function down() {
    try {
        console.log('Dropping performance indexes...');

        // Drop all the indexes we created
        const indexes = [
            'idx_export_jobs_user_status',
            'idx_export_jobs_created_at',
            'idx_export_jobs_status_created',
            'idx_audit_log_user_created',
            'idx_audit_log_resource',
            'idx_audit_log_action_created',
            'idx_access_logs_timestamp_vehicle',
            'idx_access_logs_date_entry_type',
            'idx_access_logs_success_timestamp',
            'idx_violations_created_status',
            'idx_violations_vehicle_created',
            'idx_violations_type_created',
            'idx_users_status_created',
            'idx_users_designation_status',
            'idx_vehicles_approval_created',
            'idx_vehicles_type_approval',
            'idx_vehicles_usc_id',
            'idx_user_profiles_usc_id',
            'idx_access_logs_composite',
            'idx_violations_composite'
        ];

        for (const index of indexes) {
            await executeQuery(`DROP INDEX IF EXISTS ${index}`);
        }

        console.log('Performance indexes dropped successfully');

    } catch (error) {
        console.error('Error dropping performance indexes:', error);
        throw error;
    }
}