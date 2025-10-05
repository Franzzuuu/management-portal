import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixVehiclesForeignKey() {
    // Create a connection
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Starting foreign key fix for vehicles table...');

        // Check if the constraint exists
        const [constraints] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE 
        TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'vehicles'
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME = 'users'
    `);

        // First, drop any existing constraint on user_id if it exists
        if (constraints.length > 0) {
            const constraintName = constraints[0].CONSTRAINT_NAME;
            console.log(`Dropping existing constraint: ${constraintName}`);

            await connection.query(`
        ALTER TABLE vehicles 
        DROP FOREIGN KEY ${constraintName}
      `);
        }

        // Add the CASCADE DELETE constraint
        console.log('Adding ON DELETE CASCADE constraint for vehicles.user_id -> users.id');
        await connection.query(`
      ALTER TABLE vehicles
      ADD CONSTRAINT fk_vehicle_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) 
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

        console.log('Vehicle foreign key constraint added successfully!');

        // Verify the constraint was added
        const [updatedConstraints] = await connection.query(`
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
        AND tc.TABLE_NAME = 'vehicles'
        AND kcu.COLUMN_NAME = 'user_id'
    `);

        console.log('Updated constraints:');
        console.log(updatedConstraints);

    } catch (error) {
        console.error('Error fixing foreign key constraint:', error);
    } finally {
        await connection.end();
    }
}

fixVehiclesForeignKey().then(() => {
    console.log('Foreign key fix script completed');
    process.exit(0);
}).catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
});