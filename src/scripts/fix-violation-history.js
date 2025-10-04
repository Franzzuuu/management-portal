import { executeQuery } from '../lib/database.js';

async function main() {
    try {
        // First check if the table exists
        const checkTableQuery = `
            SELECT COUNT(*) as tableExists 
            FROM information_schema.tables 
            WHERE table_schema = 'management_portal' 
            AND table_name = 'violation_status_history'
        `;
        
        const [tableCheck] = await executeQuery(checkTableQuery);
        
        if (!tableCheck.tableExists) {
            console.log('Creating violation_status_history table...');
            await executeQuery(`
                CREATE TABLE violation_status_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    violation_id INT NOT NULL,
                    old_status VARCHAR(20),
                    new_status VARCHAR(20) NOT NULL,
                    updated_by INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (violation_id) REFERENCES violations(id),
                    FOREIGN KEY (updated_by) REFERENCES users(id)
                )
            `);
            console.log('Table created successfully');
        } else {
            // Check if columns need to be updated
            console.log('Checking table structure...');
            const columns = await executeQuery(`SHOW COLUMNS FROM violation_status_history`);
            
            const hasChangedAt = columns.some(col => col.Field === 'changed_at');
            const hasChangedBy = columns.some(col => col.Field === 'changed_by');
            
            if (hasChangedAt || hasChangedBy) {
                // Create temporary table
                await executeQuery(`
                    CREATE TABLE violation_status_history_temp (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        violation_id INT NOT NULL,
                        old_status VARCHAR(20),
                        new_status VARCHAR(20) NOT NULL,
                        updated_by INT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (violation_id) REFERENCES violations(id),
                        FOREIGN KEY (updated_by) REFERENCES users(id)
                    )
                `);

                // Copy data with column mapping
                await executeQuery(`
                    INSERT INTO violation_status_history_temp (
                        violation_id, 
                        old_status, 
                        new_status, 
                        updated_by, 
                        created_at
                    )
                    SELECT 
                        violation_id,
                        old_status,
                        new_status,
                        changed_by as updated_by,
                        changed_at as created_at
                    FROM violation_status_history
                `);

                // Drop old table
                await executeQuery('DROP TABLE violation_status_history');

                // Rename temp table
                await executeQuery('RENAME TABLE violation_status_history_temp TO violation_status_history');
                
                console.log('Table structure updated successfully');
            } else {
                console.log('Table structure is already correct');
            }
        }

        console.log('All done!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();