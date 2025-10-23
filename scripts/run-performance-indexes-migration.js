// scripts/run-performance-indexes-migration.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Add the src directory to the module path
process.env.NODE_PATH = join(__dirname, '..', 'src');

async function runMigration() {
    try {
        console.log('Starting performance indexes migration...');

        // Import the migration
        const { up } = await import('../src/lib/migrations/add_performance_indexes.js');

        // Run the up migration
        await up();

        console.log('Performance indexes migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();