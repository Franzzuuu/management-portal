import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkUsersTable() {
    // Create a connection
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking users table structure...');

        // Get table structure
        const [columns] = await connection.query(`
      SHOW COLUMNS FROM users
    `);

        console.log('Users table columns:');
        console.log(columns);

        // Get a sample record from users
        const [sampleUsers] = await connection.query(`
      SELECT * FROM users LIMIT 1
    `);

        if (sampleUsers.length > 0) {
            console.log('Sample users record:');
            console.log(sampleUsers[0]);
        }

        // Now check how everything is connected
        console.log('\nChecking relationship between users, user_profiles and vehicles...');

        // Check for users <-> user_profiles relationship
        const [userProfiles] = await connection.query(`
      SELECT 
        u.id as user_id, 
        u.email as user_email, 
        u.designation,
        up.id as profile_id, 
        up.usc_id,
        up.email as profile_email,
        up.full_name
      FROM 
        users u
        LEFT JOIN user_profiles up ON u.email = up.email
      LIMIT 3
    `);

        console.log('User to profile mappings (based on email):');
        console.log(userProfiles);

        // Check for user_profiles <-> vehicles relationship
        const [vehicleProfiles] = await connection.query(`
      SELECT 
        up.id as profile_id, 
        up.usc_id,
        up.email as profile_email,
        up.full_name,
        v.vehicle_id,
        v.plate_number,
        v.vehicle_type,
        v.make,
        v.model
      FROM 
        user_profiles up
        LEFT JOIN vehicles v ON up.usc_id = v.usc_id
      LIMIT 3
    `);

        console.log('Profile to vehicle mappings (based on usc_id):');
        console.log(vehicleProfiles);

    } catch (error) {
        console.error('Error checking users table:', error);
    } finally {
        await connection.end();
    }
}

checkUsersTable().then(() => {
    console.log('Check users table script completed');
    process.exit(0);
}).catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
});