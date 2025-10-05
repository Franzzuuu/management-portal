import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkUserProfilesTable() {
    // Create a connection
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking user_profiles table structure...');

        // Get table structure
        const [columns] = await connection.query(`
      SHOW COLUMNS FROM user_profiles
    `);

        console.log('User profiles table columns:');
        console.log(columns);

        // Check how user_profiles relates to users
        const [userProfileConstraints] = await connection.query(`
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
        AND tc.TABLE_NAME = 'user_profiles'
    `);

        console.log('User profiles foreign key constraints:');
        console.log(userProfileConstraints);

        // Get a sample record from user_profiles
        const [sampleUserProfiles] = await connection.query(`
      SELECT * FROM user_profiles LIMIT 1
    `);

        if (sampleUserProfiles.length > 0) {
            console.log('Sample user_profile record:');
            console.log(sampleUserProfiles[0]);

            // Get the associated user if possible
            if (sampleUserProfiles[0].user_id) {
                const [user] = await connection.query(`
          SELECT * FROM users WHERE id = ?
        `, [sampleUserProfiles[0].user_id]);

                if (user.length > 0) {
                    console.log('Associated user record:');
                    console.log(user[0]);
                }
            }
        }

    } catch (error) {
        console.error('Error checking user_profiles table:', error);
    } finally {
        await connection.end();
    }
}

checkUserProfilesTable().then(() => {
    console.log('Check user_profiles table script completed');
    process.exit(0);
}).catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
});