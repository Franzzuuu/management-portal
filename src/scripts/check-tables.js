import { config } from 'dotenv';
import { resolve } from 'path';
import { executeQuery } from '../lib/database.js';

// Load environment variables from .env.local and .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function checkDatabaseTables() {
    try {
        console.log('Checking violations table structure...');

        const tableStructure = await executeQuery('SHOW CREATE TABLE violations');
        console.log('\nTable Structure:');
        console.log(JSON.stringify(tableStructure, null, 2));

        const columnInfo = await executeQuery('DESCRIBE violations');
        console.log('\nColumn Information:');
        console.log(JSON.stringify(columnInfo, null, 2));

        const recentRecords = await executeQuery('SELECT * FROM violations LIMIT 1');
        console.log('\nRecent Records:');
        console.log(JSON.stringify(recentRecords, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDatabaseTables();