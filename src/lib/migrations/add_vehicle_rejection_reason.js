import mysql from 'mysql2/promise';

/**
 * Migration to add rejection_reason column to vehicles table.
 */

async function getConnection() {
    return await mysql.createConnection({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
}

export async function addVehicleRejectionReason() {
    console.log('Checking vehicles table for rejection_reason column...');

    let connection;
    try {
        connection = await getConnection();

        // Check if rejection_reason column exists
        const [rows] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'vehicles' 
            AND COLUMN_NAME = 'rejection_reason'
        `);
        const columnExists = rows.length > 0;

        if (!columnExists) {
            console.log('Adding rejection_reason column...');
            await connection.execute(`
                ALTER TABLE vehicles 
                ADD COLUMN rejection_reason TEXT NULL DEFAULT NULL 
                AFTER approval_status
            `);
            console.log('✓ rejection_reason column added');
            return { success: true, skipped: false, columnAdded: 'rejection_reason' };
        } else {
            console.log('→ rejection_reason column already exists');
            return { success: true, skipped: true };
        }

    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

export default addVehicleRejectionReason;
