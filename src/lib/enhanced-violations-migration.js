import { executeQuery } from './database.js';

// Enhanced database migration for violations system with history, stats, and notifications
export async function migrateViolationsSystem() {
    const migrations = [
        // Update violations table with additional fields
        `ALTER TABLE violations 
     ADD COLUMN IF NOT EXISTS image_data LONGBLOB AFTER image_path,
     ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255) AFTER image_data,
     ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(100) AFTER image_filename,
     ADD COLUMN IF NOT EXISTS resolution_notes TEXT AFTER status,
     ADD COLUMN IF NOT EXISTS contested_at TIMESTAMP NULL AFTER resolution_notes,
     ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL AFTER contested_at`,

        // Create violation status history table for audit trail
        `CREATE TABLE IF NOT EXISTS violation_status_history (
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
    )`,

        // Create violation contests table
        `CREATE TABLE IF NOT EXISTS violation_contests (
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
      INDEX idx_violation_contests_user (user_id),
      INDEX idx_violation_contests_status (contest_status)
    )`,

        // Create notifications table
        `CREATE TABLE IF NOT EXISTS notifications (
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
    )`,

        // Create violation statistics cache table for performance
        `CREATE TABLE IF NOT EXISTS violation_statistics_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stat_type ENUM('monthly', 'type_breakdown', 'designation_breakdown', 'status_breakdown') NOT NULL,
      date_period VARCHAR(20) NOT NULL,
      stat_data JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_stat_period (stat_type, date_period),
      INDEX idx_violation_stats_type (stat_type),
      INDEX idx_violation_stats_date (date_period)
    )`,

        // Create user violation summary table for quick access
        `CREATE TABLE IF NOT EXISTS user_violation_summary (
      user_id INT NOT NULL PRIMARY KEY,
      total_violations INT DEFAULT 0,
      pending_violations INT DEFAULT 0,
      resolved_violations INT DEFAULT 0,
      contested_violations INT DEFAULT 0,
      last_violation_date TIMESTAMP NULL,
      violation_score DECIMAL(5,2) DEFAULT 0.00,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_violation_summary_score (violation_score),
      INDEX idx_user_violation_summary_updated (updated_at)
    )`,

        // Add performance indexes to existing tables
        `ALTER TABLE violations 
     ADD INDEX IF NOT EXISTS idx_violations_status (status),
     ADD INDEX IF NOT EXISTS idx_violations_created_date (created_at),
     ADD INDEX IF NOT EXISTS idx_violations_vehicle_date (vehicle_id, created_at),
     ADD INDEX IF NOT EXISTS idx_violations_type_date (violation_type_id, created_at),
     ADD INDEX IF NOT EXISTS idx_violations_reporter (reported_by)`,

        `ALTER TABLE vehicles 
     ADD INDEX IF NOT EXISTS idx_vehicles_user_approval (user_id, approval_status),
     ADD INDEX IF NOT EXISTS idx_vehicles_type (vehicle_type),
     ADD INDEX IF NOT EXISTS idx_vehicles_plate (plate_number)`,

        `ALTER TABLE users 
     ADD INDEX IF NOT EXISTS idx_users_designation (designation),
     ADD INDEX IF NOT EXISTS idx_users_status (status)`,

        // Create triggers to automatically update user violation summary
        `CREATE TRIGGER IF NOT EXISTS update_user_violation_summary_insert
     AFTER INSERT ON violations
     FOR EACH ROW
     BEGIN
       INSERT INTO user_violation_summary (user_id, total_violations, pending_violations, last_violation_date)
       SELECT 
         ve.user_id,
         1,
         CASE WHEN NEW.status = 'pending' THEN 1 ELSE 0 END,
         NEW.created_at
       FROM vehicles ve WHERE ve.id = NEW.vehicle_id
       ON DUPLICATE KEY UPDATE
         total_violations = total_violations + 1,
         pending_violations = pending_violations + CASE WHEN NEW.status = 'pending' THEN 1 ELSE 0 END,
         resolved_violations = resolved_violations + CASE WHEN NEW.status = 'resolved' THEN 1 ELSE 0 END,
         contested_violations = contested_violations + CASE WHEN NEW.status = 'contested' THEN 1 ELSE 0 END,
         last_violation_date = GREATEST(COALESCE(last_violation_date, '1970-01-01'), NEW.created_at),
         updated_at = NOW();
     END`,

        `CREATE TRIGGER IF NOT EXISTS update_user_violation_summary_update
     AFTER UPDATE ON violations
     FOR EACH ROW
     BEGIN
       IF OLD.status != NEW.status THEN
         UPDATE user_violation_summary uvs
         JOIN vehicles ve ON uvs.user_id = ve.user_id
         SET 
           pending_violations = pending_violations 
             - CASE WHEN OLD.status = 'pending' THEN 1 ELSE 0 END
             + CASE WHEN NEW.status = 'pending' THEN 1 ELSE 0 END,
           resolved_violations = resolved_violations 
             - CASE WHEN OLD.status = 'resolved' THEN 1 ELSE 0 END
             + CASE WHEN NEW.status = 'resolved' THEN 1 ELSE 0 END,
           contested_violations = contested_violations 
             - CASE WHEN OLD.status = 'contested' THEN 1 ELSE 0 END
             + CASE WHEN NEW.status = 'contested' THEN 1 ELSE 0 END,
           updated_at = NOW()
         WHERE ve.id = NEW.vehicle_id;
       END IF;
     END`,

        // Create stored procedure for violation statistics generation
        `DROP PROCEDURE IF EXISTS GenerateViolationStatistics`,

        `CREATE PROCEDURE GenerateViolationStatistics(
       IN start_date DATE,
       IN end_date DATE
     )
     BEGIN
       DECLARE done INT DEFAULT FALSE;
       DECLARE current_month VARCHAR(7);
       DECLARE month_cursor CURSOR FOR 
         SELECT DISTINCT DATE_FORMAT(created_at, '%Y-%m') as month 
         FROM violations 
         WHERE created_at BETWEEN start_date AND end_date
         ORDER BY month;
       DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
       
       -- Clear existing cache for the period
       DELETE FROM violation_statistics_cache 
       WHERE date_period BETWEEN DATE_FORMAT(start_date, '%Y-%m') 
         AND DATE_FORMAT(end_date, '%Y-%m');
       
       -- Generate monthly statistics
       OPEN month_cursor;
       read_loop: LOOP
         FETCH month_cursor INTO current_month;
         IF done THEN
           LEAVE read_loop;
         END IF;
         
         INSERT INTO violation_statistics_cache (stat_type, date_period, stat_data)
         SELECT 
           'monthly',
           current_month,
           JSON_OBJECT(
             'total', COUNT(*),
             'pending', SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
             'resolved', SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END),
             'contested', SUM(CASE WHEN status = 'contested' THEN 1 ELSE 0 END),
             'by_type', JSON_OBJECTAGG(vt.name, type_counts.count)
           )
         FROM violations v
         JOIN violation_types vt ON v.violation_type_id = vt.id
         JOIN (
           SELECT violation_type_id, COUNT(*) as count
           FROM violations 
           WHERE DATE_FORMAT(created_at, '%Y-%m') = current_month
           GROUP BY violation_type_id
         ) type_counts ON v.violation_type_id = type_counts.violation_type_id
         WHERE DATE_FORMAT(v.created_at, '%Y-%m') = current_month;
         
       END LOOP;
       CLOSE month_cursor;
     END`,

        // Create view for violation analytics dashboard
        `CREATE OR REPLACE VIEW violation_analytics_view AS
     SELECT 
       v.id,
       v.status,
       v.created_at,
       DATE_FORMAT(v.created_at, '%Y-%m') as violation_month,
       DATE_FORMAT(v.created_at, '%Y-%W') as violation_week,
       DAYOFWEEK(v.created_at) as day_of_week,
       HOUR(v.created_at) as hour_of_day,
       vt.name as violation_type,
       vt.id as violation_type_id,
       u.designation as user_designation,
       ve.vehicle_type,
       ve.plate_number,
       up.full_name as owner_name,
       reporter.full_name as reported_by,
       ru.designation as reporter_designation,
       DATEDIFF(COALESCE(v.updated_at, NOW()), v.created_at) as days_open,
       CASE WHEN v.image_data IS NOT NULL THEN 1 ELSE 0 END as has_evidence
     FROM violations v
     JOIN vehicles ve ON v.vehicle_id = ve.id
     JOIN users u ON ve.user_id = u.id
     JOIN user_profiles up ON u.id = up.user_id
     JOIN violation_types vt ON v.violation_type_id = vt.id
     JOIN users ru ON v.reported_by = ru.id
     JOIN user_profiles reporter ON ru.id = reporter.user_id`,

        // Insert default notification preferences for existing users
        `CREATE TABLE IF NOT EXISTS user_notification_preferences (
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
    )`,

        // Insert default preferences for existing users
        `INSERT IGNORE INTO user_notification_preferences (user_id)
     SELECT id FROM users WHERE status = 'active'`,

        // Create function to calculate violation score
        `DROP FUNCTION IF EXISTS CalculateViolationScore`,

        `CREATE FUNCTION CalculateViolationScore(user_id INT) 
     RETURNS DECIMAL(5,2)
     READS SQL DATA
     DETERMINISTIC
     BEGIN
       DECLARE score DECIMAL(5,2) DEFAULT 0.00;
       DECLARE total_violations INT DEFAULT 0;
       DECLARE recent_violations INT DEFAULT 0;
       DECLARE contested_violations INT DEFAULT 0;
       
       SELECT COUNT(*) INTO total_violations
       FROM violations v
       JOIN vehicles ve ON v.vehicle_id = ve.id
       WHERE ve.user_id = user_id;
       
       SELECT COUNT(*) INTO recent_violations
       FROM violations v
       JOIN vehicles ve ON v.vehicle_id = ve.id
       WHERE ve.user_id = user_id 
         AND v.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH);
       
       SELECT COUNT(*) INTO contested_violations
       FROM violations v
       JOIN vehicles ve ON v.vehicle_id = ve.id
       WHERE ve.user_id = user_id 
         AND v.status = 'contested';
       
       -- Calculate score: base points + recent violations weight + contested penalty
       SET score = (total_violations * 1.0) + (recent_violations * 1.5) + (contested_violations * 0.5);
       
       RETURN score;
     END`
    ];

    try {
        console.log('Starting enhanced violations system migration...');

        for (let i = 0; i < migrations.length; i++) {
            const migration = migrations[i];
            console.log(`Executing migration ${i + 1}/${migrations.length}...`);

            try {
                await executeQuery(migration);
            } catch (error) {
                console.warn(`Migration ${i + 1} warning (may be expected):`, error.message);
                // Continue with other migrations even if some fail (like IF NOT EXISTS)
            }
        }

        // Update violation scores for existing users
        console.log('Updating violation scores for existing users...');
        await executeQuery(`
      UPDATE user_violation_summary uvs
      SET violation_score = CalculateViolationScore(uvs.user_id),
          updated_at = NOW()
    `);

        // Insert sample violation types if none exist
        const existingTypes = await executeQuery('SELECT COUNT(*) as count FROM violation_types');
        if (existingTypes[0].count === 0) {
            console.log('Inserting default violation types...');
            await insertDefaultViolationTypes();
        }

        console.log('Enhanced violations system migration completed successfully!');
        return true;

    } catch (error) {
        console.error('Enhanced violations system migration failed:', error);
        throw error;
    }
}

// Insert comprehensive violation types
async function insertDefaultViolationTypes() {
    const violationTypes = [
        ['Parking in "No Parking" zones', 'Vehicle parked in designated no parking areas', 'minor'],
        ['Unauthorized Parking in designated spots', 'Vehicle parked in spots reserved for others', 'minor'],
        ['Parking in Fire Lane', 'Vehicle blocking emergency access routes', 'major'],
        ['Parking in Handicapped spots without permit', 'Unauthorized use of accessibility parking', 'major'],
        ['Blocking driveway or entrance', 'Vehicle obstructing vehicular or pedestrian access', 'minor'],
        ['Parking in Loading Zone', 'Unauthorized parking in designated loading areas', 'minor'],
        ['Expired or Invalid parking permit', 'Vehicle displaying expired or fraudulent permits', 'minor'],
        ['Parking beyond marked lines', 'Vehicle extending outside designated parking boundaries', 'minor'],
        ['Double parking', 'Vehicle parked alongside other parked vehicles', 'minor'],
        ['Parking in Faculty/Staff area without authorization', 'Student vehicle in restricted faculty parking', 'minor'],
        ['Oversized vehicle in compact space', 'Large vehicle parked in compact-designated spot', 'minor'],
        ['Parking in Visitor area without authorization', 'Non-visitor vehicle in designated visitor parking', 'minor']
    ];

    const insertQuery = 'INSERT INTO violation_types (name, description, severity) VALUES (?, ?, ?)';

    for (const [name, description, severity] of violationTypes) {
        await executeQuery(insertQuery, [name, description, severity]);
    }

    console.log('Default violation types inserted successfully');
}

// Utility function to generate initial statistics cache
export async function generateInitialStatisticsCache() {
    try {
        console.log('Generating initial statistics cache...');

        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear() - 1, 0, 1); // Last year

        await executeQuery('CALL GenerateViolationStatistics(?, ?)', [
            startDate.toISOString().split('T')[0],
            currentDate.toISOString().split('T')[0]
        ]);

        console.log('Initial statistics cache generated successfully');
    } catch (error) {
        console.error('Failed to generate initial statistics cache:', error);
    }
}

// Function to update all user violation summaries
export async function updateAllUserViolationSummaries() {
    try {
        console.log('Updating all user violation summaries...');

        await executeQuery(`
      INSERT INTO user_violation_summary (
        user_id, 
        total_violations, 
        pending_violations, 
        resolved_violations, 
        contested_violations,
        last_violation_date,
        violation_score
      )
      SELECT 
        u.id,
        COALESCE(violation_counts.total, 0),
        COALESCE(violation_counts.pending, 0),
        COALESCE(violation_counts.resolved, 0),
        COALESCE(violation_counts.contested, 0),
        violation_counts.last_violation,
        CalculateViolationScore(u.id)
      FROM users u
      LEFT JOIN (
        SELECT 
          ve.user_id,
          COUNT(*) as total,
          SUM(CASE WHEN v.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN v.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN v.status = 'contested' THEN 1 ELSE 0 END) as contested,
          MAX(v.created_at) as last_violation
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        GROUP BY ve.user_id
      ) violation_counts ON u.id = violation_counts.user_id
      ON DUPLICATE KEY UPDATE
        total_violations = COALESCE(violation_counts.total, 0),
        pending_violations = COALESCE(violation_counts.pending, 0),
        resolved_violations = COALESCE(violation_counts.resolved, 0),
        contested_violations = COALESCE(violation_counts.contested, 0),
        last_violation_date = violation_counts.last_violation,
        violation_score = CalculateViolationScore(user_id),
        updated_at = NOW()
    `);

        console.log('All user violation summaries updated successfully');
    } catch (error) {
        console.error('Failed to update user violation summaries:', error);
    }
}