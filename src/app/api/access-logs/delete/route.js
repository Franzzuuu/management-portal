import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';

export async function POST(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { scope, start, end } = body;

        console.log('Delete request received:', { scope, start, end });

        // Validate scope
        if (!['past_hour', 'range', 'all_time'].includes(scope)) {
            return Response.json(
                { error: 'Invalid scope. Must be "past_hour", "range", or "all_time"' },
                { status: 400 }
            );
        }

        // Validate range inputs if scope is 'range'
        if (scope === 'range' && (!start || !end)) {
            return Response.json(
                { error: 'Start and end dates are required for range scope' },
                { status: 400 }
            );
        }

        // Helper function to convert ISO datetime to MySQL format
        const formatDateForMySQL = (isoString) => {
            if (!isoString) return null;
            const date = new Date(isoString);
            return date.toISOString().slice(0, 19).replace('T', ' ');
        };

        let deleteQuery;
        let params = [];
        let deletedCount = 0;
        let method = 'DELETE';

        try {
            // First, count the logs that will be deleted
            let countQuery;
            let countParams = [];

            switch (scope) {
                case 'past_hour':
                    countQuery = 'SELECT COUNT(*) as count FROM access_logs WHERE timestamp >= (NOW() - INTERVAL 1 HOUR)';
                    deleteQuery = 'DELETE FROM access_logs WHERE timestamp >= (NOW() - INTERVAL 1 HOUR)';
                    break;

                case 'range':
                    const formattedStart = formatDateForMySQL(start);
                    const formattedEnd = formatDateForMySQL(end);

                    console.log('Formatted dates:', {
                        original: { start, end },
                        formatted: { formattedStart, formattedEnd }
                    });

                    if (!formattedStart || !formattedEnd) {
                        throw new Error('Invalid date format provided');
                    }

                    countQuery = 'SELECT COUNT(*) as count FROM access_logs WHERE timestamp BETWEEN ? AND ?';
                    countParams = [formattedStart, formattedEnd];
                    deleteQuery = 'DELETE FROM access_logs WHERE timestamp BETWEEN ? AND ?';
                    params = [formattedStart, formattedEnd];
                    break;

                case 'all_time':
                    countQuery = 'SELECT COUNT(*) as count FROM access_logs';

                    // Try TRUNCATE first (faster), fallback to DELETE
                    try {
                        // Check if we can use TRUNCATE (no foreign key dependencies for this table)
                        await queryMany('TRUNCATE TABLE access_logs');
                        method = 'TRUNCATE';

                        // Get the count before truncation (we'll estimate it as 0 after truncate)
                        const countResult = await queryMany(countQuery);
                        deletedCount = countResult[0]?.count || 0;

                    } catch (truncateError) {
                        console.warn('TRUNCATE failed, falling back to DELETE:', truncateError);
                        deleteQuery = 'DELETE FROM access_logs';
                        method = 'DELETE';
                    }
                    break;

                default:
                    throw new Error('Invalid scope');
            }

            // If we didn't use TRUNCATE, proceed with regular DELETE
            if (method === 'DELETE') {
                // Get count first
                const countResult = await queryMany(countQuery, countParams);
                deletedCount = countResult[0]?.count || 0;

                // Only proceed with deletion if there are logs to delete
                if (deletedCount > 0) {
                    await queryMany(deleteQuery, params);
                }
            }

            // Emit real-time refresh event to update all connected clients
            try {
                emit('access_logs:refresh', {
                    action: 'bulk_delete',
                    scope,
                    deletedCount,
                    method,
                    timestamp: new Date().toISOString(),
                    adminUser: session.userRole
                });
            } catch (emitError) {
                console.warn('Failed to emit access_logs:refresh event:', emitError);
            }

            return Response.json({
                success: true,
                deleted: deletedCount,
                method,
                scope,
                message: `Successfully deleted ${deletedCount} access log${deletedCount !== 1 ? 's' : ''} using ${method}`
            });

        } catch (dbError) {
            console.error('Database error during deletion:', dbError);
            return Response.json(
                { error: 'Database operation failed', details: dbError.message },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Access logs deletion error:', error);
        return Response.json(
            { error: 'Failed to delete access logs', details: error.message },
            { status: 500 }
        );
    }
}