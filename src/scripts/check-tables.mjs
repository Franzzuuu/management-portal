import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkTablesExistence() {
    // Create a connection
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking tables existence...');

        // Get list of all tables in the database
        const [tables] = await connection.query(`
      SHOW TABLES
    `);

        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables in database:');
        console.log(tableNames);

        // Check for specific tables
        const requiredTables = [
            'users',
            'user_profiles',
            'vehicles',
            'violations',
            'violation_contests',
            'violation_status_history'
        ];

        for (const tableName of requiredTables) {
            if (tableNames.includes(tableName)) {
                console.log(`✓ Table ${tableName} exists`);
            } else {
                console.log(`✗ Table ${tableName} does not exist!`);
            }
        }

        // For existing tables, show column names
        for (const tableName of tableNames) {
            if (requiredTables.includes(tableName)) {
                const [columns] = await connection.query(`DESCRIBE ${tableName}`);
                console.log(`\nColumns in ${tableName}:`);
                console.log(columns.map(c => `${c.Field} (${c.Type}) ${c.Key ? '[' + c.Key + ']' : ''}`));
            }
        }

    } catch (error) {
        console.error('Error checking tables:', error);
    } finally {
        await connection.end();
    }
}

checkTablesExistence().then(() => {
    console.log('Check tables script completed');
    process.exit(0);
}).catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
});