import { config } from 'dotenv';
import { resolve } from 'path';
import { executeQuery } from '../lib/database.js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function checkTriggers() {
    try {
        console.log('Checking database triggers...');

        console.log('\nChecking vehicles table structure...');
        const vehiclesTable = await executeQuery('SHOW CREATE TABLE vehicles');
        console.log(JSON.stringify(vehiclesTable, null, 2));

        console.log('\nChecking triggers...');
        const triggers = await executeQuery('SHOW TRIGGERS');
        console.log(JSON.stringify(triggers, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTriggers();