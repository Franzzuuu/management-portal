// src/lib/migrations/add_file_hash_column.js
import { executeQuery } from '../database.js';

export async function up() {
    try {
        console.log('Adding file_hash column to export_jobs table...');

        // Add file_hash column for integrity validation
        await executeQuery(`
            ALTER TABLE export_jobs 
            ADD COLUMN file_hash VARCHAR(128) NULL AFTER file_path
        `);

        // Add validation_report column for storing integrity validation results
        await executeQuery(`
            ALTER TABLE export_jobs 
            ADD COLUMN validation_report JSON NULL AFTER file_hash
        `);

        console.log('File hash column added successfully');

    } catch (error) {
        console.error('Error adding file hash column:', error);
        throw error;
    }
}

export async function down() {
    try {
        console.log('Removing file_hash column from export_jobs table...');

        await executeQuery(`
            ALTER TABLE export_jobs 
            DROP COLUMN file_hash
        `);

        await executeQuery(`
            ALTER TABLE export_jobs 
            DROP COLUMN validation_report
        `);

        console.log('File hash column removed successfully');

    } catch (error) {
        console.error('Error removing file hash column:', error);
        throw error;
    }
}