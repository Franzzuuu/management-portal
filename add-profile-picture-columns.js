import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addProfilePictureColumns() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding profile picture columns to users table...');

        await pool.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS profile_picture LONGBLOB NULL,
            ADD COLUMN IF NOT EXISTS profile_picture_type VARCHAR(100) NULL
        `);

        console.log('Profile picture columns added successfully!');
    } catch (error) {
        console.error('Failed to add profile picture columns:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the migration
addProfilePictureColumns()
    .then(() => {
        console.log('Migration completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });