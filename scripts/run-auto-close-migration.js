import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { addAutoCloseColumns } from '../src/lib/migrations/add_auto_close_columns.js';

/**
 * Run migration to add auto-close columns to violations table.
 * 
 * Usage:
 *   node scripts/run-auto-close-migration.js
 */
async function runAutoCloseMigration() {
    console.log('='.repeat(60));
    console.log('VIOLATION AUTO-CLOSE MIGRATION');
    console.log('='.repeat(60));
    console.log('');

    try {
        console.log('Running: Add auto-close columns to violations table');
        const result = await addAutoCloseColumns();

        if (result.skipped) {
            console.log('→ SKIPPED (columns already exist)');
        } else {
            console.log('→ SUCCESS');
            if (result.columnsAdded && result.columnsAdded.length > 0) {
                console.log('   Columns added:', result.columnsAdded.join(', '));
            }
        }
        console.log('');

        console.log('='.repeat(60));
        console.log('✓ MIGRATION COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log('');
        console.log('The auto-close feature is now ready to use!');
        console.log('');
        console.log('Usage options:');
        console.log('  1. API Endpoint (for cron/scheduler):');
        console.log('     POST /api/violations/auto-close');
        console.log('     Header: Authorization: Bearer <CRON_SECRET>');
        console.log('');
        console.log('  2. Standalone Script:');
        console.log('     node scripts/auto-close-violations.js');
        console.log('');
        console.log('  3. Admin manual trigger:');
        console.log('     GET /api/violations/auto-close (dry run)');
        console.log('     POST /api/violations/auto-close (execute)');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('✗ MIGRATION FAILED');
        console.error('='.repeat(60));
        console.error('Error:', error.message);
        console.error('');
        process.exit(1);
    }
}

runAutoCloseMigration();
