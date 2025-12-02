import { allowNullVehicleIdInViolations } from '../lib/migrations/allow_null_vehicle_id_in_violations.js';
import { ensureViolationsColumnsExist } from '../lib/migrations/ensure_violations_columns.js';

/**
 * Run all migrations required for the quick-report feature
 */
async function runQuickReportMigrations() {
    console.log('='.repeat(60));
    console.log('QUICK REPORT FEATURE MIGRATIONS');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Migration 1: Allow NULL vehicle_id
        console.log('[1/2] Running: Allow NULL vehicle_id in violations table');
        const result1 = await allowNullVehicleIdInViolations();
        if (result1.skipped) {
            console.log('→ SKIPPED (already applied)');
        } else {
            console.log('→ SUCCESS');
        }
        console.log('');

        // Migration 2: Ensure required columns exist
        console.log('[2/2] Running: Ensure violations table has required columns');
        const result2 = await ensureViolationsColumnsExist();
        if (result2.skipped) {
            console.log('→ SKIPPED (already applied)');
        } else {
            console.log('→ SUCCESS');
            if (result2.columnsAdded) {
                console.log('   Columns added:', result2.columnsAdded.join(', '));
            }
        }
        console.log('');

        console.log('='.repeat(60));
        console.log('✓ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log('');
        console.log('The quick-report feature is now ready to use!');
        console.log('Endpoint: POST /api/violations/quick-report');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('✗ MIGRATION FAILED');
        console.error('='.repeat(60));
        console.error('');
        console.error('Error:', error.message);
        console.error('');
        console.error('Please check the database connection and try again.');
        console.error('');
        process.exit(1);
    }
}

// Run migrations
runQuickReportMigrations();
