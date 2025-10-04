import { executeQuery } from './database.js';

// Create all tables for Phase 1
export async function initializeDatabase() {
  const tables = [
    // Users table for authentication
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      designation ENUM('Student', 'Faculty', 'Staff', 'Admin') NOT NULL,
      status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
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
      image_data LONGBLOB,
      image_filename VARCHAR(255),
      image_mime_type VARCHAR(100),
      reported_by INT NOT NULL,
      status ENUM('pending', 'resolved', 'contested') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (violation_type_id) REFERENCES violation_types(id),
      FOREIGN KEY (reported_by) REFERENCES users(id)
    )`
  ];

  try {
    console.log('Initializing database tables...');

    for (const table of tables) {
      await executeQuery(table);
    }

    console.log('All tables created successfully!');

    // Insert default violation types
    await insertDefaultViolationTypes();

    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Insert default violation types
async function insertDefaultViolationTypes() {
  const violationTypes = [
    ['Parking in "No Parking" zones', 'Vehicle parked in designated no parking areas'],
    ['Unauthorized Parking in designated Parking spots', 'Vehicle parked in spots reserved for others']
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