import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addProfilePictureColumnsToProfiles() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'thesisBois2025',
        database: 'rfid_vehicle_system',
        namedPlaceholders: true
    });

    try {
        console.log('Adding profile picture columns to user_profiles table...');

        // Check if columns exist
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'user_profiles' 
            AND COLUMN_NAME IN ('profile_picture', 'profile_picture_type')
        `, ['rfid_vehicle_system']);

        if (columns.length < 2) {
            // Add missing columns
            await pool.execute(`
                ALTER TABLE user_profiles 
                ADD COLUMN profile_picture LONGBLOB NULL,
                ADD COLUMN profile_picture_type VARCHAR(100) NULL
            `);
        }

        console.log('Profile picture columns added successfully!');
    } catch (error) {
        console.error('Failed to add profile picture columns:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the migration
addProfilePictureColumnsToProfiles()
    .then(() => {
        console.log('Migration completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });