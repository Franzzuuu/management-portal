import mysql from 'mysql2/promise';

/**
 * Migration to add auto-close columns to violations table.
 * Adds:
 *   - closed_at: DATETIME - When the violation was closed
 *   - closed_reason: VARCHAR(255) - Reason for closure (auto-closed, manual, etc.)
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

export async function addAutoCloseColumns() {
    console.log('Checking violations table for auto-close columns...');

    let connection;
    try {
        connection = await getConnection();

        // Check if closed_at column exists
        const [closedAtRows] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'closed_at'
        `);
        const closedAtExists = closedAtRows.length > 0;

        // Check if closed_reason column exists
        const [closedReasonRows] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'closed_reason'
        `);
        const closedReasonExists = closedReasonRows.length > 0;

        const columnsAdded = [];

        // Add closed_at column if it doesn't exist
        if (!closedAtExists) {
            console.log('Adding closed_at column...');
            await connection.execute(`
                ALTER TABLE violations 
                ADD COLUMN closed_at DATETIME NULL DEFAULT NULL 
                AFTER updated_at
            `);
            columnsAdded.push('closed_at');
            console.log('✓ closed_at column added');
        } else {
            console.log('→ closed_at column already exists');
        }

        // Add closed_reason column if it doesn't exist
        if (!closedReasonExists) {
            console.log('Adding closed_reason column...');
            await connection.execute(`
                ALTER TABLE violations 
                ADD COLUMN closed_reason VARCHAR(255) NULL DEFAULT NULL 
                AFTER closed_at
            `);
            columnsAdded.push('closed_reason');
            console.log('✓ closed_reason column added');
        } else {
            console.log('→ closed_reason column already exists');
        }

        // Add index for efficient querying of pending violations by date
        try {
            await connection.execute(`
                CREATE INDEX idx_violations_status_created 
                ON violations (status, created_at)
            `);
            console.log('✓ Index idx_violations_status_created created');
        } catch (indexError) {
            if (indexError.code === 'ER_DUP_KEYNAME') {
                console.log('→ Index idx_violations_status_created already exists');
            } else {
                console.warn('Could not create index:', indexError.message);
            }
        }

        return {
            success: true,
            skipped: columnsAdded.length === 0,
            columnsAdded
        };

    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

export default addAutoCloseColumns;
