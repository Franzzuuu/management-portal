// scripts/run-export-jobs-migration.js
import { createExportJobsTable } from '../src/lib/migrations/create_export_jobs_table.js';

async function runMigration() {
    try {
        console.log('Starting export jobs migration...');
        await createExportJobsTable();
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();