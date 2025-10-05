import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkViolationHistoryTable() {
    // Create a connection
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking violation_history table structure...');

        // Get table structure
        const [columns] = await connection.query(`
      DESCRIBE violation_history
    `);

        console.log('Violation history table columns:');
        console.log(columns);

        // Check foreign key constraints
        const [constraints] = await connection.query(`
      SELECT 
        tc.CONSTRAINT_NAME, 
        tc.TABLE_NAME, 
        kcu.COLUMN_NAME, 
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        rc.DELETE_RULE,
        rc.UPDATE_RULE
      FROM 
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
          ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE 
        tc.CONSTRAINT_TYPE = 'FOREIGN KEY' 
        AND tc.TABLE_SCHEMA = DATABASE()
        AND tc.TABLE_NAME = 'violation_history'
    `);

        console.log('Violation history foreign key constraints:');
        console.log(constraints);

        // Check for some sample data
        const [sampleData] = await connection.query(`
      SELECT * FROM violation_history WHERE reported_by = ? LIMIT 5
    `, [2]); // Using user ID 2 as you mentioned in the error

        console.log('Sample violation history records for user ID 2:');
        console.log(sampleData);

    } catch (error) {
        console.error('Error checking violation_history table:', error);
    } finally {
        await connection.end();
    }
}

checkViolationHistoryTable().then(() => {
    console.log('Check violation_history table script completed');
    process.exit(0);
}).catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
});