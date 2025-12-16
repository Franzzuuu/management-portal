/**
 * Script to run the PIN column migration
 * Run with: node scripts/run-pin-migration.js
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { addPinColumn } from '../src/lib/migrations/add_pin_column.js';

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

console.log('Loading environment from:', envPath);
console.log('DB_HOST:', process.env.DB_HOST || 'not set');
console.log('DB_USER:', process.env.DB_USER || 'not set');
console.log('DB_NAME:', process.env.DB_NAME || 'not set');
console.log('');

async function runMigration() {
    console.log('========================================');
    console.log('PIN COLUMN MIGRATION');
    console.log('========================================\n');
    
    try {
        const result = await addPinColumn();
        console.log('\n✅ Migration completed successfully!');
        console.log('Result:', result);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration();
