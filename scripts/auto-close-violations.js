/**
 * Standalone script to auto-close pending violations after 7 days.
 * 
 * Usage:
 *   node scripts/auto-close-violations.js
 * 
 * This script can be scheduled via:
 *   - Windows Task Scheduler
 *   - Linux/Mac cron job
 *   - Cloud scheduler (e.g., AWS CloudWatch Events, Vercel Cron)
 * 
 * Example cron job (runs daily at midnight):
 *   0 0 * * * cd /path/to/project && node scripts/auto-close-violations.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const AUTO_CLOSE_DAYS = 7;

async function getConnection() {
    return await mysql.createConnection({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
}

async function autoCloseViolations() {
    console.log('='.repeat(60));
    console.log('VIOLATION AUTO-CLOSE JOB');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Auto-close threshold: ${AUTO_CLOSE_DAYS} days`);
    console.log('');

    let connection;

    try {
        connection = await getConnection();
        console.log('✓ Database connected');

        // Find violations eligible for auto-close
        const [eligibleViolations] = await connection.execute(`
            SELECT 
                v.id,
                v.created_at,
                v.status,
                v.description,
                v.location,
                DATEDIFF(NOW(), v.created_at) as days_pending
            FROM violations v
            WHERE v.status = 'pending'
            AND v.created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY v.created_at ASC
        `, [AUTO_CLOSE_DAYS]);

        console.log(`Found ${eligibleViolations.length} violation(s) eligible for auto-close`);
        console.log('');

        if (eligibleViolations.length === 0) {
            console.log('No violations to close. Job complete.');
            return;
        }

        // Display violations to be closed
        console.log('Violations to be closed:');
        console.log('-'.repeat(50));
        eligibleViolations.forEach((v, i) => {
            console.log(`  ${i + 1}. ID: ${v.id}`);
            console.log(`     Created: ${v.created_at}`);
            console.log(`     Days pending: ${v.days_pending}`);
            console.log(`     Location: ${v.location || 'N/A'}`);
            console.log('');
        });

        // Close the violations
        const violationIds = eligibleViolations.map(v => v.id);
        const placeholders = violationIds.map(() => '?').join(',');

        const [updateResult] = await connection.execute(`
            UPDATE violations 
            SET status = 'closed',
                updated_at = NOW(),
                updated_by = 'system',
                closed_at = NOW(),
                closed_reason = 'Auto-closed after ${AUTO_CLOSE_DAYS} days'
            WHERE id IN (${placeholders})
            AND status = 'pending'
        `, violationIds);

        console.log('-'.repeat(50));
        console.log(`✓ Successfully closed ${updateResult.affectedRows} violation(s)`);
        console.log('');

        // Log the closure for audit purposes
        console.log('Closed violation IDs:', violationIds.join(', '));

    } catch (error) {
        console.error('');
        console.error('✗ ERROR:', error.message);
        console.error('');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✓ Database connection closed');
        }
        console.log('');
        console.log(`Completed at: ${new Date().toISOString()}`);
        console.log('='.repeat(60));
    }
}

// Run the auto-close job
autoCloseViolations().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
