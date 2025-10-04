import { initializeDatabase } from '@/lib/init-database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Skip authentication for development
        // const session = await getSession();
        // if (!session || session.userRole !== 'Admin') {
        //     return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        // }

        await initializeDatabase();

        return Response.json({
            success: true,
            message: 'Database initialization completed successfully'
        });

    } catch (error) {
        console.error('Database initialization error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Database initialization failed'
        }, { status: 500 });
    }
}