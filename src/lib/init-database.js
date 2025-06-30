// src/lib/init-database.js - Updated version
import { executeQuery } from './database.js';

// Create all tables for Phase 1 with violation history tracking
export async function initializeDatabase() {
  const tables = [
    // Users table for authentication (updated with violation_count)
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      designation ENUM('Student', 'Faculty', 'Staff', 'Admin') NOT NULL,
      status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
      violation_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // User profiles for extended information
    `CREATE TABLE IF NOT EXISTS user_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20),
      gender ENUM('Male', 'Female', 'Other'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Vehicles table
    `CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      vehicle_type ENUM('2-wheel', '4-wheel') NOT NULL,
      make VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      color VARCHAR(50) NOT NULL,
      plate_number VARCHAR(20) UNIQUE NOT NULL,
      registration_date DATE NOT NULL,
      sticker_status ENUM('renewed', 'expired', 'pending') DEFAULT 'pending',
      approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // RFID tags table
    `CREATE TABLE IF NOT EXISTS rfid_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tag_uid VARCHAR(100) UNIQUE NOT NULL,
      vehicle_id INT NULL,
      status ENUM('active', 'inactive', 'unassigned') DEFAULT 'unassigned',
      assigned_date TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    )`,

    // Access logs table
    `CREATE TABLE IF NOT EXISTS access_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT NOT NULL,
      tag_uid VARCHAR(100) NOT NULL,
      entry_type ENUM('entry', 'exit') NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      location ENUM('entrance', 'exit') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,

    // Violation types table
    `CREATE TABLE IF NOT EXISTS violation_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Violations table
    `CREATE TABLE IF NOT EXISTS violations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT NOT NULL,
      violation_type_id INT NOT NULL,
      description TEXT,
      image_path VARCHAR(500),
      reported_by INT NOT NULL,
      status ENUM('pending', 'resolved', 'contested') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (violation_type_id) REFERENCES violation_types(id),
      FOREIGN KEY (reported_by) REFERENCES users(id)
    )`,

    // Violation history table for detailed tracking
    `CREATE TABLE IF NOT EXISTS violation_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      vehicle_id INT NOT NULL,
      violation_id INT NOT NULL,
      violation_type_id INT NOT NULL,
      status_change ENUM('created', 'resolved', 'contested', 'reopened') NOT NULL,
      previous_status ENUM('pending', 'resolved', 'contested') NULL,
      new_status ENUM('pending', 'resolved', 'contested') NOT NULL,
      reported_by INT NOT NULL,
      resolved_by INT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE,
      FOREIGN KEY (violation_type_id) REFERENCES violation_types(id),
      FOREIGN KEY (reported_by) REFERENCES users(id),
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
    )`
  ];

  try {
    console.log('Initializing database tables...');

    for (const table of tables) {
      await executeQuery(table);
    }

    console.log('All tables created successfully!');

    // Create indexes for better performance
    await createIndexes();

    // Create triggers for automatic violation count tracking
    await createTriggers();

    // Create views for violation statistics
    await createViews();

    // Insert default violation types
    await insertDefaultViolationTypes();

    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Create database indexes
async function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_violation_history_user_id ON violation_history(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_violation_history_created_at ON violation_history(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status)',
    'CREATE INDEX IF NOT EXISTS idx_violations_created_at ON violations(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_users_violation_count ON users(violation_count)',
    'CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp)'
  ];

  for (const index of indexes) {
    try {
      await executeQuery(index);
    } catch (error) {
      // Index might already exist, continue
      console.log('Index creation note:', error.message);
    }
  }
}

// Create triggers for automatic violation tracking
async function createTriggers() {
  // Drop existing triggers if they exist
  const dropTriggers = [
    'DROP TRIGGER IF EXISTS update_violation_count_insert',
    'DROP TRIGGER IF EXISTS update_violation_count_update'
  ];

  for (const drop of dropTriggers) {
    try {
      await executeQuery(drop);
    } catch (error) {
      // Trigger might not exist, continue
    }
  }

  // Create new triggers
  const triggers = [
    `CREATE TRIGGER update_violation_count_insert 
     AFTER INSERT ON violations
     FOR EACH ROW
     BEGIN
       UPDATE users 
       SET violation_count = violation_count + 1 
       WHERE id = (SELECT user_id FROM vehicles WHERE id = NEW.vehicle_id);
       
       INSERT INTO violation_history (
         user_id, vehicle_id, violation_id, violation_type_id, 
         status_change, new_status, reported_by
       ) VALUES (
         (SELECT user_id FROM vehicles WHERE id = NEW.vehicle_id),
         NEW.vehicle_id,
         NEW.id,
         NEW.violation_type_id,
         'created',
         NEW.status,
         NEW.reported_by
       );
     END`,

    `CREATE TRIGGER update_violation_count_update 
     AFTER UPDATE ON violations
     FOR EACH ROW
     BEGIN
       IF OLD.status != NEW.status THEN
         INSERT INTO violation_history (
           user_id, vehicle_id, violation_id, violation_type_id,
           status_change, previous_status, new_status, reported_by
         ) VALUES (
           (SELECT user_id FROM vehicles WHERE id = NEW.vehicle_id),
           NEW.vehicle_id,
           NEW.id,
           NEW.violation_type_id,
           CASE 
             WHEN NEW.status = 'resolved' THEN 'resolved'
             WHEN NEW.status = 'contested' THEN 'contested'
             ELSE 'reopened'
           END,
           OLD.status,
           NEW.status,
           NEW.reported_by
         );
       END IF;
     END`
  ];

  for (const trigger of triggers) {
    try {
      await executeQuery(trigger);
      console.log('Trigger created successfully');
    } catch (error) {
      console.error('Trigger creation error:', error.message);
    }
  }
}

// Create views for violation statistics
async function createViews() {
  // Drop existing view if it exists
  try {
    await executeQuery('DROP VIEW IF EXISTS user_violation_stats');
  } catch (error) {
    // View might not exist, continue
  }

  // Create user violation statistics view
  const createView = `
    CREATE VIEW user_violation_stats AS
    SELECT 
      u.id as user_id,
      u.email,
      up.full_name,
      u.designation,
      u.violation_count,
      COUNT(DISTINCT v.id) as total_violations,
      COUNT(DISTINCT CASE WHEN v.status = 'pending' THEN v.id END) as pending_violations,
      COUNT(DISTINCT CASE WHEN v.status = 'resolved' THEN v.id END) as resolved_violations,
      COUNT(DISTINCT CASE WHEN v.status = 'contested' THEN v.id END) as contested_violations,
      MAX(v.created_at) as latest_violation_date
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN vehicles ve ON u.id = ve.user_id
    LEFT JOIN violations v ON ve.id = v.vehicle_id
    WHERE u.status = 'active'
    GROUP BY u.id, u.email, up.full_name, u.designation, u.violation_count
  `;

  try {
    await executeQuery(createView);
    console.log('User violation stats view created successfully');
  } catch (error) {
    console.error('View creation error:', error.message);
  }
}

// Insert default violation types
async function insertDefaultViolationTypes() {
  const violationTypes = [
    ['Parking in "No Parking" zones', 'Vehicle parked in designated no parking areas'],
    ['Unauthorized Parking in designated Parking spots', 'Vehicle parked in spots reserved for others'],
    ['Blocking Emergency Routes', 'Vehicle obstructing emergency access routes'],
    ['Expired/Invalid RFID Sticker', 'Vehicle using expired or unauthorized RFID sticker'],
    ['Double Parking', 'Vehicle parked in a way that blocks other vehicles'],
    ['Parking in Faculty/Staff Areas', 'Student vehicle parked in restricted faculty/staff parking'],
    ['Overtime Parking', 'Vehicle exceeding maximum allowed parking duration'],
    ['Parking in Disabled Spots', 'Unauthorized use of disabled parking spaces']
  ];

  const checkQuery = 'SELECT COUNT(*) as count FROM violation_types';
  const result = await executeQuery(checkQuery);

  if (result[0].count === 0) {
    const insertQuery = 'INSERT INTO violation_types (name, description) VALUES (?, ?)';

    for (const [name, description] of violationTypes) {
      await executeQuery(insertQuery, [name, description]);
    }

    console.log('Default violation types inserted');
  }
}

// Function to migrate existing data (if needed)
export async function migrateExistingData() {
  try {
    // Check if violation_count column exists
    const checkColumn = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'violation_count'
    `);

    if (checkColumn.length === 0) {
      // Add violation_count column if it doesn't exist
      await executeQuery('ALTER TABLE users ADD COLUMN violation_count INT DEFAULT 0');
      console.log('Added violation_count column to users table');
    }

    // Update violation counts for existing users
    await executeQuery(`
      UPDATE users u 
      SET violation_count = (
        SELECT COUNT(v.id) 
        FROM violations v 
        JOIN vehicles ve ON v.vehicle_id = ve.id 
        WHERE ve.user_id = u.id
      )
    `);

    console.log('Updated violation counts for existing users');

    // Populate violation history for existing violations
    const existingViolations = await executeQuery(`
      SELECT v.*, ve.user_id 
      FROM violations v 
      JOIN vehicles ve ON v.vehicle_id = ve.id 
      WHERE NOT EXISTS (
        SELECT 1 FROM violation_history vh 
        WHERE vh.violation_id = v.id AND vh.status_change = 'created'
      )
    `);

    for (const violation of existingViolations) {
      await executeQuery(`
        INSERT INTO violation_history (
          user_id, vehicle_id, violation_id, violation_type_id,
          status_change, new_status, reported_by, created_at
        ) VALUES (?, ?, ?, ?, 'created', ?, ?, ?)
      `, [
        violation.user_id,
        violation.vehicle_id,
        violation.id,
        violation.violation_type_id,
        violation.status,
        violation.reported_by,
        violation.created_at
      ]);
    }

    console.log('Populated violation history for existing violations');

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Helper function to reset violation counts (for testing/maintenance)
export async function resetViolationCounts() {
  try {
    // Recalculate all violation counts
    await executeQuery(`
      UPDATE users u 
      SET violation_count = (
        SELECT COALESCE(COUNT(v.id), 0)
        FROM violations v 
        JOIN vehicles ve ON v.vehicle_id = ve.id 
        WHERE ve.user_id = u.id
      )
    `);

    console.log('Violation counts reset successfully');
    return true;
  } catch (error) {
    console.error('Reset violation counts failed:', error);
    throw error;
  }
}