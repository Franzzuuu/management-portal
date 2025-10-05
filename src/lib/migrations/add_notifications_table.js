import { executeQuery } from '../database.js';

export async function createNotificationsTable() {
    try {
        console.log('Creating notifications table...');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                related_id INT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_type (type),
                INDEX idx_created_at (created_at),
                INDEX idx_is_read (is_read)
            )
        `;

        await executeQuery(createTableQuery);
        console.log('✅ Notifications table created successfully!');

        // Check if table was created
        const checkTable = await executeQuery("SHOW TABLES LIKE 'notifications'");
        if (checkTable.length > 0) {
            console.log('✅ Notifications table exists and is ready to use');

            // Show the table structure
            const structure = await executeQuery('DESCRIBE notifications');
            console.log('Table structure:');
            console.table(structure);
        }

        return true;
    } catch (error) {
        console.error('❌ Error creating notifications table:', error);
        throw error;
    }
}

// Run the migration if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    createNotificationsTable()
        .then(() => {
            console.log('Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}