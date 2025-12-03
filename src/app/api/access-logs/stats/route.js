import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Query to get success vs failure counts from access_logs table
        // Count logs with vehicle_id as success, logs with NULL vehicle_id or success=0 as failure
        const query = `
            SELECT 
                CASE 
                    WHEN success = 1 THEN 'success'
                    ELSE 'failure'
                END as status,
                COUNT(*) AS count
            FROM access_logs 
            GROUP BY status
        `;

        const results = await queryMany(query);

        // Initialize counts
        let successCount = 0;
        let failureCount = 0;

        // Process results
        if (results && results.length > 0) {
            results.forEach(row => {
                if (row.status === 'success') {
                    successCount = row.count;
                } else if (row.status === 'failure') {
                    failureCount = row.count;
                }
            });
        }

        return Response.json({
            success: true,
            data: {
                successCount,
                failureCount
            },
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Access logs stats fetch error:', error);
        return Response.json(
            { error: 'Failed to fetch access logs stats' },
            { status: 500 }
        );
    }
}