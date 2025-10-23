// src/lib/migrations/create_export_jobs_table.js
import { executeQuery, executeDirectQuery } from '../database.js';

export async function createExportJobsTable() {
    try {
        console.log('Creating export_jobs table...');

        // Create export_jobs table
        await executeDirectQuery(`
            CREATE TABLE IF NOT EXISTS export_jobs (
                id VARCHAR(36) PRIMARY KEY,
                user_id INT NOT NULL,
                report_type ENUM('overview', 'users', 'vehicles', 'access', 'violations') NOT NULL,
                format ENUM('csv', 'xlsx', 'pdf') NOT NULL,
                filters JSON,
                columns JSON,
                mode ENUM('view', 'full') NOT NULL DEFAULT 'view',
                sort_by VARCHAR(100),
                sort_dir ENUM('asc', 'desc') DEFAULT 'desc',
                anonymize BOOLEAN DEFAULT FALSE,
                status ENUM('queued', 'running', 'done', 'error') DEFAULT 'queued',
                row_count INT DEFAULT 0,
                error_message TEXT,
                file_path VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP NULL,
                completed_at TIMESTAMP NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create export_presets table
        await executeDirectQuery(`
            CREATE TABLE IF NOT EXISTS export_presets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                report_type ENUM('overview', 'users', 'vehicles', 'access', 'violations') NOT NULL,
                filters JSON,
                columns JSON,
                format ENUM('csv', 'xlsx', 'pdf') NOT NULL,
                mode ENUM('view', 'full') NOT NULL DEFAULT 'view',
                sort_by VARCHAR(100),
                sort_dir ENUM('asc', 'desc') DEFAULT 'desc',
                anonymize BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_report_type (report_type),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_preset (user_id, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create audit_log table for tracking exports
        await executeDirectQuery(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(50),
                resource_id VARCHAR(100),
                details JSON,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_action (action),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add performance indexes for existing tables
        console.log('Adding performance indexes...');

        // Helper function to create index if not exists
        const createIndexIfNotExists = async (indexName, tableName, column) => {
            try {
                await executeDirectQuery(`
                    CREATE INDEX ${indexName} ON ${tableName}(${column})
                `);
                console.log(`Created index ${indexName}`);
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`Index ${indexName} already exists`);
                } else {
                    console.error(`Error creating index ${indexName}:`, error.message);
                }
            }
        };

        // Access logs indexes
        await createIndexIfNotExists('idx_access_logs_timestamp', 'access_logs', 'timestamp');
        await createIndexIfNotExists('idx_access_logs_entry_type', 'access_logs', 'entry_type');
        await createIndexIfNotExists('idx_access_logs_location', 'access_logs', 'location');
        await createIndexIfNotExists('idx_access_logs_success', 'access_logs', 'success');
        await createIndexIfNotExists('idx_access_logs_vehicle_id', 'access_logs', 'vehicle_id');

        // Violations indexes
        await createIndexIfNotExists('idx_violations_timestamp', 'violations', 'timestamp');
        await createIndexIfNotExists('idx_violations_status', 'violations', 'status');
        await createIndexIfNotExists('idx_violations_type_id', 'violations', 'violation_type_id');
        await createIndexIfNotExists('idx_violations_vehicle_id', 'violations', 'vehicle_id');

        // Users indexes
        await createIndexIfNotExists('idx_users_designation', 'users', 'designation');
        await createIndexIfNotExists('idx_users_status', 'users', 'status');
        await createIndexIfNotExists('idx_users_created_at', 'users', 'created_at');

        // Vehicles indexes
        await createIndexIfNotExists('idx_vehicles_type', 'vehicles', 'vehicle_type');
        await createIndexIfNotExists('idx_vehicles_approval_status', 'vehicles', 'approval_status');
        await createIndexIfNotExists('idx_vehicles_year', 'vehicles', 'year');
        await createIndexIfNotExists('idx_vehicles_owner_id', 'vehicles', 'usc_id');

        console.log('Export jobs table and indexes created successfully');
        return true;
    } catch (error) {
        console.error('Error creating export_jobs table:', error);
        throw error;
    }
}

export async function dropExportJobsTable() {
    try {
        await executeDirectQuery('DROP TABLE IF EXISTS export_jobs');
        await executeDirectQuery('DROP TABLE IF EXISTS export_presets');
        await executeDirectQuery('DROP TABLE IF EXISTS audit_log');
        console.log('Export jobs tables dropped successfully');
        return true;
    } catch (error) {
        console.error('Error dropping export_jobs tables:', error);
        throw error;
    }
}