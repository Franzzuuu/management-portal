// src/lib/migrations/create_metrics_table.js
import { executeQuery } from '../database.js';

export async function up() {
    try {
        console.log('Creating export_job_metrics table...');

        await executeQuery(`
            CREATE TABLE IF NOT EXISTS export_job_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                job_id VARCHAR(36) NOT NULL,
                report_type ENUM('overview', 'users', 'vehicles', 'access', 'violations') NOT NULL,
                format ENUM('csv', 'xlsx', 'pdf') NOT NULL,
                duration_ms INT NOT NULL,
                status ENUM('done', 'error', 'cancelled') NOT NULL,
                row_count INT DEFAULT 0,
                error_message TEXT NULL,
                processing_rate DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_job_metrics_job_id (job_id),
                INDEX idx_job_metrics_created_at (created_at DESC),
                INDEX idx_job_metrics_report_type (report_type, created_at DESC),
                INDEX idx_job_metrics_status (status, created_at DESC),
                FOREIGN KEY (job_id) REFERENCES export_jobs(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('Creating api_metrics table...');

        await executeQuery(`
            CREATE TABLE IF NOT EXISTS api_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                endpoint VARCHAR(255) NOT NULL,
                method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
                duration_ms INT NOT NULL,
                status_code INT NOT NULL,
                user_agent TEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_id VARCHAR(36) NULL,
                is_error BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_api_metrics_endpoint (endpoint, created_at DESC),
                INDEX idx_api_metrics_created_at (created_at DESC),
                INDEX idx_api_metrics_status (status_code, created_at DESC),
                INDEX idx_api_metrics_user (user_id, created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('Creating system_alerts table...');

        await executeQuery(`
            CREATE TABLE IF NOT EXISTS system_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                alert_type VARCHAR(100) NOT NULL,
                severity ENUM('info', 'warning', 'error', 'critical') NOT NULL,
                message TEXT NOT NULL,
                metadata JSON NULL,
                resolved BOOLEAN DEFAULT FALSE,
                resolved_at TIMESTAMP NULL,
                resolved_by VARCHAR(36) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_alerts_type (alert_type, created_at DESC),
                INDEX idx_alerts_severity (severity, created_at DESC),
                INDEX idx_alerts_created_at (created_at DESC),
                INDEX idx_alerts_resolved (resolved, created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('Metrics tables created successfully');

    } catch (error) {
        console.error('Error creating metrics tables:', error);
        throw error;
    }
}

export async function down() {
    try {
        console.log('Dropping metrics tables...');

        await executeQuery('DROP TABLE IF EXISTS system_alerts');
        await executeQuery('DROP TABLE IF EXISTS api_metrics');
        await executeQuery('DROP TABLE IF EXISTS export_job_metrics');

        console.log('Metrics tables dropped successfully');

    } catch (error) {
        console.error('Error dropping metrics tables:', error);
        throw error;
    }
}