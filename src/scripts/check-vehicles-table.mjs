import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkVehiclesTable() {
    // Create a connection
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking vehicles table structure...');

        // Get table structure
        const [columns] = await connection.query(`
      SHOW COLUMNS FROM vehicles
    `);

        console.log('Vehicles table columns:');
        console.log(columns);

        // Check if user_id exists
        const hasUserId = columns.some(col => col.Field === 'user_id');
        console.log(`Has user_id column: ${hasUserId}`);

        // Check for similar columns that might be used instead
        const potentialUserColumns = columns.filter(col =>
            col.Field.includes('user') ||
            col.Field.includes('owner') ||
            col.Field.includes('usc')
        );

        if (potentialUserColumns.length > 0) {
            console.log('Potential user reference columns:');
            console.log(potentialUserColumns);
        }

        // Check for a sample row to see values
        const [sampleRows] = await connection.query(`
      SELECT * FROM vehicles LIMIT 1
    `);

        if (sampleRows.length > 0) {
            console.log('Sample vehicle record:');
            console.log(sampleRows[0]);
        }

    } catch (error) {
        console.error('Error checking vehicles table:', error);
    } finally {
        await connection.end();
    }
}

checkVehiclesTable().then(() => {
    console.log('Check vehicles table script completed');
    process.exit(0);
}).catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
});