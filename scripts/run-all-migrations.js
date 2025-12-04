import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { addAutoCloseColumns } from '../src/lib/migrations/add_auto_close_columns.js';
import { addVehicleRejectionReason } from '../src/lib/migrations/add_vehicle_rejection_reason.js';
import { allowNullVehicleIdInViolations } from '../src/lib/migrations/allow_null_vehicle_id_in_violations.js';
import { ensureViolationsColumnsExist } from '../src/lib/migrations/ensure_violations_columns.js';
import { up as addAnalyticsIndexes } from '../src/lib/migrations/add_analytics_indexes.js';
import { up as addPerformanceIndexes } from '../src/lib/migrations/add_performance_indexes.js';
import { createExportJobsTable } from '../src/lib/migrations/create_export_jobs_table.js';

/**
 * Run all database migrations.
 * Safe to run multiple times - migrations check if changes already exist.
 * 
 * Usage:
 *   npm run migrate:all
 *   node scripts/run-all-migrations.js
 */
async function runAllMigrations() {
    console.log('='.repeat(60));
    console.log('RUNNING ALL DATABASE MIGRATIONS');
    console.log('='.repeat(60));
    console.log('');

    const results = [];

    // Migration 1: Quick Report - Allow NULL vehicle_id
    try {
        console.log('[1/7] Allow NULL vehicle_id in violations');
        console.log('-'.repeat(40));
        const result = await allowNullVehicleIdInViolations();
        results.push({ name: 'Allow NULL vehicle_id', success: true, skipped: result.skipped });
        console.log(result.skipped ? '→ SKIPPED (already exists)' : '→ SUCCESS');
        console.log('');
    } catch (error) {
        console.error('→ FAILED:', error.message);
        results.push({ name: 'Allow NULL vehicle_id', success: false, error: error.message });
        console.log('');
    }

    // Migration 2: Quick Report - Ensure violations columns
    try {
        console.log('[2/7] Ensure violations columns');
        console.log('-'.repeat(40));
        const result = await ensureViolationsColumnsExist();
        results.push({ name: 'Ensure violations columns', success: true, skipped: result.skipped });
        console.log(result.skipped ? '→ SKIPPED (already exists)' : '→ SUCCESS');
        console.log('');
    } catch (error) {
        console.error('→ FAILED:', error.message);
        results.push({ name: 'Ensure violations columns', success: false, error: error.message });
        console.log('');
    }

    // Migration 3: Auto-close columns
    try {
        console.log('[3/7] Auto-close columns (violations table)');
        console.log('-'.repeat(40));
        const result = await addAutoCloseColumns();
        results.push({ name: 'Auto-close columns', success: true, skipped: result.skipped });
        console.log(result.skipped ? '→ SKIPPED (already exists)' : '→ SUCCESS');
        console.log('');
    } catch (error) {
        console.error('→ FAILED:', error.message);
        results.push({ name: 'Auto-close columns', success: false, error: error.message });
        console.log('');
    }

    // Migration 4: Vehicle rejection reason
    try {
        console.log('[4/7] Vehicle rejection reason (vehicles table)');
        console.log('-'.repeat(40));
        const result = await addVehicleRejectionReason();
        results.push({ name: 'Vehicle rejection reason', success: true, skipped: result.skipped });
        console.log(result.skipped ? '→ SKIPPED (already exists)' : '→ SUCCESS');
        console.log('');
    } catch (error) {
        console.error('→ FAILED:', error.message);
        results.push({ name: 'Vehicle rejection reason', success: false, error: error.message });
        console.log('');
    }

    // Migration 5: Analytics indexes
    try {
        console.log('[5/7] Analytics indexes');
        console.log('-'.repeat(40));
        await addAnalyticsIndexes();
        results.push({ name: 'Analytics indexes', success: true, skipped: false });
        console.log('→ SUCCESS');
        console.log('');
    } catch (error) {
        if (error.message?.includes('Duplicate')) {
            results.push({ name: 'Analytics indexes', success: true, skipped: true });
            console.log('→ SKIPPED (already exists)');
        } else {
            console.error('→ FAILED:', error.message);
            results.push({ name: 'Analytics indexes', success: false, error: error.message });
        }
        console.log('');
    }

    // Migration 6: Performance indexes
    try {
        console.log('[6/7] Performance indexes');
        console.log('-'.repeat(40));
        await addPerformanceIndexes();
        results.push({ name: 'Performance indexes', success: true, skipped: false });
        console.log('→ SUCCESS');
        console.log('');
    } catch (error) {
        if (error.message?.includes('Duplicate')) {
            results.push({ name: 'Performance indexes', success: true, skipped: true });
            console.log('→ SKIPPED (already exists)');
        } else {
            console.error('→ FAILED:', error.message);
            results.push({ name: 'Performance indexes', success: false, error: error.message });
        }
        console.log('');
    }

    // Migration 7: Export jobs table
    try {
        console.log('[7/7] Export jobs table');
        console.log('-'.repeat(40));
        const result = await createExportJobsTable();
        results.push({ name: 'Export jobs table', success: true, skipped: result.skipped });
        console.log(result.skipped ? '→ SKIPPED (already exists)' : '→ SUCCESS');
        console.log('');
    } catch (error) {
        console.error('→ FAILED:', error.message);
        results.push({ name: 'Export jobs table', success: false, error: error.message });
        console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = results.filter(r => r.skipped).length;

    results.forEach(r => {
        const status = !r.success ? '✗ FAILED' : r.skipped ? '→ SKIPPED' : '✓ SUCCESS';
        console.log(`  ${status}: ${r.name}`);
        if (r.error) console.log(`           Error: ${r.error}`);
    });

    console.log('');
    console.log(`Total: ${successful} successful, ${skipped} skipped, ${failed} failed`);
    console.log('');

    if (failed > 0) {
        console.log('Some migrations failed. Please check the errors above.');
        process.exit(1);
    } else {
        console.log('All migrations completed successfully!');
        process.exit(0);
    }
}

runAllMigrations();
