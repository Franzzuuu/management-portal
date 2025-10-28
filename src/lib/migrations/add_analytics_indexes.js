// src/lib/migrations/add_analytics_indexes.js
import { executeQuery } from '../database.js';

export async function up() {
    try {
        console.log('Adding analytics performance indexes...');

        // Analytics-specific indexes for dashboard performance

        // Access logs analytics indexes
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_analytics_timestamp 
            ON access_logs (timestamp DESC)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_analytics_entry_type 
            ON access_logs (entry_type, timestamp DESC)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_analytics_hour 
            ON access_logs (HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')), entry_type)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_analytics_date 
            ON access_logs (DATE(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')))
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_analytics_month 
            ON access_logs (DATE_FORMAT(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila'), '%Y-%m'))
        `);

        // Vehicle analytics indexes
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_vehicles_analytics_type 
            ON vehicles (vehicle_type)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_vehicles_analytics_created 
            ON vehicles (created_at DESC)
        `);

        // User analytics indexes
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_users_analytics_designation 
            ON users (designation, status)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_users_analytics_active 
            ON users (status, created_at DESC)
        `);

        // Join optimization indexes for active users calculation
        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_users_usc_id_status 
            ON users (usc_id, status)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_vehicles_usc_vehicle_id 
            ON vehicles (usc_id, vehicle_id)
        `);

        await executeQuery(`
            CREATE INDEX IF NOT EXISTS idx_access_logs_vehicle_timestamp 
            ON access_logs (vehicle_id, timestamp DESC)
        `);

        console.log('Analytics performance indexes created successfully');

    } catch (error) {
        console.error('Error creating analytics indexes:', error);
        throw error;
    }
}

export async function down() {
    try {
        console.log('Dropping analytics performance indexes...');

        const indexes = [
            'idx_access_logs_analytics_timestamp',
            'idx_access_logs_analytics_entry_type',
            'idx_access_logs_analytics_hour',
            'idx_access_logs_analytics_date',
            'idx_access_logs_analytics_month',
            'idx_vehicles_analytics_type',
            'idx_vehicles_analytics_created',
            'idx_users_analytics_designation',
            'idx_users_analytics_active',
            'idx_users_usc_id_status',
            'idx_vehicles_usc_vehicle_id',
            'idx_access_logs_vehicle_timestamp'
        ];

        for (const index of indexes) {
            await executeQuery(`DROP INDEX IF EXISTS ${index} ON access_logs`);
            await executeQuery(`DROP INDEX IF EXISTS ${index} ON vehicles`);
            await executeQuery(`DROP INDEX IF EXISTS ${index} ON users`);
        }

        console.log('Analytics performance indexes dropped successfully');

    } catch (error) {
        console.error('Error dropping analytics indexes:', error);
        throw error;
    }
}