import { executeQuery } from '@/lib/database';

export async function GET(request) {
    try {
        const tableStructure = await executeQuery('SHOW CREATE TABLE violations');
        const columnInfo = await executeQuery('DESCRIBE violations');
        const recentRecords = await executeQuery('SELECT * FROM violations LIMIT 1');

        return Response.json({
            success: true,
            tableStructure,
            columnInfo,
            recentRecords
        });
    } catch (error) {
        console.error('Error getting database info:', error);
        return Response.json({
            error: 'Failed to get database info',
            details: error.message
        }, { status: 500 });
    }
}