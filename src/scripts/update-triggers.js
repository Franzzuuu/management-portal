// src/scripts/update-triggers.js
// src/scripts/update-triggers.js
import { config } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';

// Load env for running the script via node
// Load env for running the script via node
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

(async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD ?? process.env.DB_PASS,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    await connection.query('DROP TRIGGER IF EXISTS update_violation_count_insert');
    await connection.query('DROP TRIGGER IF EXISTS update_violation_count_update');

    const createInsertTrigger = `
      CREATE TRIGGER update_violation_count_insert 
      AFTER INSERT ON violations
      FOR EACH ROW
      BEGIN
        SET @user_id = (
          SELECT u.id
          FROM users u
          JOIN user_profiles up ON u.usc_id = up.usc_id
          JOIN vehicles v ON v.usc_id = up.usc_id
          WHERE v.vehicle_id = NEW.vehicle_id
          LIMIT 1
        );

        UPDATE users 
        SET violation_count = violation_count + 1 
        WHERE id = @user_id;

        INSERT INTO violation_history (
          user_id, vehicle_id, violation_id, violation_type_id, status_change, new_status, reported_by
        ) VALUES (
          @user_id, NEW.vehicle_id, NEW.id, NEW.violation_type_id, 'created', NEW.status, NEW.reported_by
        );
      END
    `;

    const createUpdateTrigger = `
      CREATE TRIGGER update_violation_count_update
      AFTER UPDATE ON violations
      FOR EACH ROW
      BEGIN
        IF OLD.status != NEW.status THEN
          SET @user_id = (
            SELECT u.id
            FROM users u
            JOIN user_profiles up ON u.usc_id = up.usc_id
            JOIN vehicles v ON v.usc_id = up.usc_id
            WHERE v.vehicle_id = NEW.vehicle_id
            LIMIT 1
          );

          INSERT INTO violation_history (
            user_id, vehicle_id, violation_id, violation_type_id, status_change, previous_status, new_status, reported_by
          ) VALUES (
            @user_id, NEW.vehicle_id, NEW.id, NEW.violation_type_id,
            CASE 
              WHEN NEW.status = 'resolved' THEN 'resolved'
              WHEN NEW.status = 'contested' THEN 'contested'
              ELSE 'reopened'
            END,
            OLD.status, NEW.status, NEW.reported_by
          );
        END IF;
      END
    `;

    await connection.query(createInsertTrigger);
    await connection.query(createUpdateTrigger);

    console.log('Triggers updated successfully.');
  } catch (err) {
    console.error('Failed to update triggers:', err);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
})();
