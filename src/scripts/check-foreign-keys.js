// CommonJS version to avoid ESM import issues
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkForeignKeys() {
    // Create a direct connection to the database
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const queryMany = async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
    };
    try {
        console.log('Checking database foreign key constraints...');

        // Check if foreign keys are enabled
        const fkEnabled = await queryMany(`
      SHOW VARIABLES LIKE 'foreign_key_checks'
    `);
        console.log('Foreign key checks status:', fkEnabled[0].Value);

        // Get the database name
        const dbInfo = await queryMany(`
      SELECT DATABASE() as db_name
    `);
        const dbName = dbInfo[0].db_name;
        console.log(`Checking foreign keys in database: ${dbName}`);

        // Check vehicles table foreign key constraints
        const vehicleConstraints = await queryMany(`
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
        AND tc.TABLE_SCHEMA = ?
        AND tc.TABLE_NAME = 'vehicles'
    `, [dbName]);

        console.log('\nVehicles table foreign key constraints:');
        console.log(vehicleConstraints);

        if (vehicleConstraints.length === 0) {
            console.error('No foreign key constraints found for vehicles table!');
        } else {
            let hasCascadeDelete = false;
            for (const constraint of vehicleConstraints) {
                if (
                    constraint.REFERENCED_TABLE_NAME === 'users' &&
                    constraint.COLUMN_NAME === 'user_id' &&
                    constraint.DELETE_RULE === 'CASCADE'
                ) {
                    hasCascadeDelete = true;
                    console.log('✅ ON DELETE CASCADE constraint exists for vehicles.user_id -> users.id');
                }
            }

            if (!hasCascadeDelete) {
                console.error('⚠️ CASCADE DELETE constraint is missing for vehicles.user_id -> users.id');
            }
        }

        // List all tables with their foreign key constraints
        console.log('\nChecking all tables with foreign keys to users table:');
        const allUsersFKs = await queryMany(`
      SELECT 
        tc.TABLE_NAME,
        kcu.COLUMN_NAME, 
        rc.DELETE_RULE
      FROM 
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
          ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE 
        tc.CONSTRAINT_TYPE = 'FOREIGN KEY' 
        AND tc.TABLE_SCHEMA = ?
        AND kcu.REFERENCED_TABLE_NAME = 'users'
    `, [dbName]);

        console.log('Foreign keys referencing users table:');
        console.log(allUsersFKs);

    } catch (error) {
        console.error('Error checking foreign keys:', error);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

checkForeignKeys();