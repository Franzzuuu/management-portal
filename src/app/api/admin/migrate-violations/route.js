import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Run the enhanced violations system migration
        const migrationResults = await runEnhancedViolationsMigration();

        return Response.json({
            success: true,
            message: 'Enhanced violations system migration completed successfully',
            details: migrationResults
        });

    } catch (error) {
        console.error('Migration API error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Migration failed'
        }, { status: 500 });
    }
}

async function runEnhancedViolationsMigration() {
    const results = [];

    const migrations = [
        // Check and add image columns to violations table
        {
            name: 'Add image_data column to violations table',
            sql: `ALTER TABLE violations ADD COLUMN image_data LONGBLOB AFTER description`
        },
        {
            name: 'Add image_filename column to violations table',
            sql: `ALTER TABLE violations ADD COLUMN image_filename VARCHAR(255) AFTER image_data`
        },
        {
            name: 'Add image_mime_type column to violations table',
            sql: `ALTER TABLE violations ADD COLUMN image_mime_type VARCHAR(100) AFTER image_filename`
        },

        // Create violation status history table
        {
            name: 'Create violation status history table',
            sql: `CREATE TABLE IF NOT EXISTS violation_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                violation_id INT NOT NULL,
                old_status ENUM('pending', 'resolved', 'contested') NOT NULL,
                new_status ENUM('pending', 'resolved', 'contested') NOT NULL,
                changed_by INT NOT NULL,
                change_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES users(id),
                INDEX idx_violation_status_history_violation (violation_id),
                INDEX idx_violation_status_history_date (created_at)
            )`
        },

        // Create notifications table
        {
            name: 'Create notifications table',
            sql: `CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('violation_issued', 'violation_status_update', 'violation_contested', 'system_announcement') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                related_id INT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_notifications_user (user_id),
                INDEX idx_notifications_type (type),
                INDEX idx_notifications_read (is_read),
                INDEX idx_notifications_date (created_at)
            )`
        },

        // Create violation contests table
        {
            name: 'Create violation contests table',
            sql: `CREATE TABLE IF NOT EXISTS violation_contests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                violation_id INT NOT NULL,
                user_id INT NOT NULL,
                contest_notes TEXT NOT NULL,
                contest_status ENUM('pending', 'under_review', 'approved', 'denied') DEFAULT 'pending',
                reviewed_by INT NULL,
                review_notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP NULL,
                FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (reviewed_by) REFERENCES users(id),
                INDEX idx_violation_contests_violation (violation_id),
                INDEX idx_violation_contests_user (user_id)
            )`
        },

        // Add performance indexes (one by one to avoid conflicts)
        {
            name: 'Add status index to violations table',
            sql: `ALTER TABLE violations ADD INDEX idx_violations_status (status)`
        },
        {
            name: 'Add created_date index to violations table',
            sql: `ALTER TABLE violations ADD INDEX idx_violations_created_date (created_at)`
        },
        {
            name: 'Add vehicle_date index to violations table',
            sql: `ALTER TABLE violations ADD INDEX idx_violations_vehicle_date (vehicle_id, created_at)`
        },
        {
            name: 'Add type_date index to violations table',
            sql: `ALTER TABLE violations ADD INDEX idx_violations_type_date (violation_type_id, created_at)`
        },

        // Add indexes to vehicles table
        {
            name: 'Add user_approval index to vehicles table',
            sql: `ALTER TABLE vehicles ADD INDEX idx_vehicles_user_approval (user_id, approval_status)`
        },
        {
            name: 'Add vehicle_type index to vehicles table',
            sql: `ALTER TABLE vehicles ADD INDEX idx_vehicles_type (vehicle_type)`
        },
        {
            name: 'Add plate_number index to vehicles table',
            sql: `ALTER TABLE vehicles ADD INDEX idx_vehicles_plate (plate_number)`
        },

        // Add indexes to users table
        {
            name: 'Add designation index to users table',
            sql: `ALTER TABLE users ADD INDEX idx_users_designation (designation)`
        },
        {
            name: 'Add status index to users table',
            sql: `ALTER TABLE users ADD INDEX idx_users_status (status)`
        },

        // Create user notification preferences table
        {
            name: 'Create user notification preferences table',
            sql: `CREATE TABLE IF NOT EXISTS user_notification_preferences (
                user_id INT NOT NULL PRIMARY KEY,
                email_violations BOOLEAN DEFAULT TRUE,
                email_status_updates BOOLEAN DEFAULT TRUE,
                email_contests BOOLEAN DEFAULT TRUE,
                in_app_violations BOOLEAN DEFAULT TRUE,
                in_app_status_updates BOOLEAN DEFAULT TRUE,
                in_app_contests BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`
        }
    ];

    results.push('Starting enhanced violations system migration...');

    for (let i = 0; i < migrations.length; i++) {
        const migration = migrations[i];
        try {
            results.push(`✅ ${migration.name}`);
            await executeQuery(migration.sql);
        } catch (error) {
            // Some errors are expected (like trying to add existing indexes)
            if (error.message.includes('Duplicate key name') ||
                error.message.includes('Duplicate column name') ||
                error.message.includes('already exists') ||
                error.message.includes('Column') && error.message.includes('already exists')) {
                results.push(`⚠️  ${migration.name} (already exists, skipped)`);
            } else {
                results.push(`❌ ${migration.name}: ${error.message}`);
                // Don't throw error, just log it and continue
                console.error(`Migration error for ${migration.name}:`, error);
            }
        }
    }

    // Insert default notification preferences for existing users
    try {
        results.push('Setting up default notification preferences...');
        await executeQuery(`
            INSERT IGNORE INTO user_notification_preferences (user_id)
            SELECT id FROM users WHERE status = 'active'
        `);
        results.push('✅ Default notification preferences created');
    } catch (error) {
        results.push(`⚠️  Notification preferences setup: ${error.message}`);
    }

    // Check if violation types exist, if not add defaults
    try {
        const typeCount = await executeQuery('SELECT COUNT(*) as count FROM violation_types');
        if (typeCount[0].count === 0) {
            results.push('Adding default violation types...');
            await insertDefaultViolationTypes();
            results.push('✅ Default violation types added');
        } else {
            results.push('✅ Violation types already exist');
        }
    } catch (error) {
        results.push(`⚠️  Violation types setup: ${error.message}`);
    }

    results.push('🎉 Enhanced violations system migration completed successfully!');
    results.push('');
    results.push('New features now available:');
    results.push('• Advanced filtering and sorting');
    results.push('• Violation history tracking');
    results.push('• Statistics and analytics');
    results.push('• Notification system');
    results.push('• Image evidence storage');
    results.push('• Contest management');

    return results;
}

async function insertDefaultViolationTypes() {
    const violationTypes = [
        ['Parking in "No Parking" zones', 'Vehicle parked in designated no parking areas'],
        ['Unauthorized Parking in designated spots', 'Vehicle parked in spots reserved for others'],
        ['Parking in Fire Lane', 'Vehicle blocking emergency access routes'],
        ['Parking in Handicapped spots without permit', 'Unauthorized use of accessibility parking'],
        ['Blocking driveway or entrance', 'Vehicle obstructing vehicular or pedestrian access'],
        ['Parking in Loading Zone', 'Unauthorized parking in designated loading areas'],
        ['Expired or Invalid parking permit', 'Vehicle displaying expired or fraudulent permits'],
        ['Double parking', 'Vehicle parked alongside other parked vehicles']
    ];

    for (const [name, description] of violationTypes) {
        await executeQuery(
            'INSERT IGNORE INTO violation_types (name, description) VALUES (?, ?)',
            [name, description]
        );
    }
}