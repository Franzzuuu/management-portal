import { config } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Create a connection directly instead of using the pool
async function updateTriggers() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        try {
            // Drop existing triggers
            await executeQuery('DROP TRIGGER IF EXISTS update_violation_count_insert');
            await executeQuery('DROP TRIGGER IF EXISTS update_violation_count_update');

            // Create new trigger for INSERT
            const createInsertTrigger = `
            CREATE TRIGGER update_violation_count_insert 
            AFTER INSERT ON violations
            FOR EACH ROW
            BEGIN
                UPDATE users u
                JOIN user_profiles up ON u.usc_id = up.usc_id
                JOIN vehicles v ON v.usc_id = up.usc_id
                SET u.violation_count = u.violation_count + 1 
                WHERE v.vehicle_id = NEW.vehicle_id;
                
                -- Insert into violation history
                INSERT INTO violation_history (
                    usc_id, 
                    vehicle_id, 
                    violation_id, 
                    violation_type_id, 
                    status_change, 
                    new_status, 
                    reported_by
                ) VALUES (
                    (SELECT v.usc_id FROM vehicles v WHERE v.vehicle_id = NEW.vehicle_id),
                    NEW.vehicle_id,
                    NEW.id,
                    NEW.violation_type_id,
                    'created',
                    NEW.status,
                    NEW.reported_by
                );
            END
        `;

            // Create new trigger for UPDATE
            const createUpdateTrigger = `
            CREATE TRIGGER update_violation_count_update
            AFTER UPDATE ON violations
            FOR EACH ROW
            BEGIN
                -- Only update history if status changed
                IF OLD.status != NEW.status THEN
                    INSERT INTO violation_history (
                        usc_id, 
                        vehicle_id, 
                        violation_id, 
                        violation_type_id,
                        status_change, 
                        previous_status, 
                        new_status, 
                        reported_by
                    ) VALUES (
                        (SELECT v.usc_id FROM vehicles v WHERE v.vehicle_id = NEW.vehicle_id),
                        NEW.vehicle_id,
                        NEW.id,
                        NEW.violation_type_id,
                        CASE 
                            WHEN NEW.status = 'resolved' THEN 'resolved'
                            WHEN NEW.status = 'contested' THEN 'contested'
                            ELSE 'reopened'
                        END,
                        OLD.status,
                        NEW.status,
                        NEW.reported_by
                    );
                END IF;
            END
        `;

            await executeQuery(createInsertTrigger);
            console.log('Created new INSERT trigger');

            await executeQuery(createUpdateTrigger);
            console.log('Created new UPDATE trigger');

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

updateTriggers();