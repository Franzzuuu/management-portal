import { config } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function checkTables() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Check violation_history table
        console.log('Checking violation_history table...');
        try {
            const [violationHistoryStruct] = await connection.query('SHOW CREATE TABLE violation_history');
            console.log('\nViolation History Table Structure:');
            console.log(JSON.stringify(violationHistoryStruct, null, 2));
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('violation_history table does not exist');

                // Create the table
                const createTableSQL = `
                    CREATE TABLE violation_history (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        violation_id INT NOT NULL,
                        vehicle_id INT NOT NULL,
                        reported_by INT NOT NULL,
                        violation_type_id INT NOT NULL,
                        status_change VARCHAR(50) NOT NULL,
                        previous_status ENUM('pending', 'resolved', 'contested') NULL,
                        new_status ENUM('pending', 'resolved', 'contested') NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE,
                        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
                        FOREIGN KEY (reported_by) REFERENCES users(id),
                        FOREIGN KEY (violation_type_id) REFERENCES violation_types(id)
                    )
                `;

                await connection.query(createTableSQL);
                console.log('Created violation_history table');
            } else {
                throw error;
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTables();