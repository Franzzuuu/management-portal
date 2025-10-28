// scripts/run-analytics-indexes-migration.js
import { up as addAnalyticsIndexes } from '../src/lib/migrations/add_analytics_indexes.js';

console.log('Running analytics indexes migration...');

try {
    await addAnalyticsIndexes();
    console.log('✅ Analytics indexes migration completed successfully');
    process.exit(0);
} catch (error) {
    console.error('❌ Analytics indexes migration failed:', error);
    process.exit(1);
}