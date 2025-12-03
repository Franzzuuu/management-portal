import { readFileSync } from 'fs';
import { join } from 'path';
import { allowNullVehicleIdInAccessLogs } from '../src/lib/migrations/allow_null_vehicle_id_in_access_logs.js';

// Load .env file manually
try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value;
        }
    });
} catch (error) {
    console.log('No .env.local file found, trying .env');
    try {
        const envPath = join(process.cwd(), '.env');
        const envContent = readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                process.env[key.trim()] = value;
            }
        });
    } catch (error2) {
        console.error('No .env file found. Please create one with database credentials.');
        process.exit(1);
    }
}

async function runMigration() {
    try {
        console.log('Starting access_logs migration...');
        console.log('Database:', process.env.DB_NAME);
        console.log('Host:', process.env.DB_HOST);
        
        const result = await allowNullVehicleIdInAccessLogs();
        
        if (result.skipped) {
            console.log('Migration was skipped (already applied)');
        } else {
            console.log('Migration completed successfully!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
