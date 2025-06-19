import { testConnection } from '@/lib/database';
import { initializeDatabase } from '@/lib/init-database';

export async function GET() {
    try {
        // Test connection
        const connectionSuccess = await testConnection();

        if (!connectionSuccess) {
            return Response.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        // Initialize database tables
        await initializeDatabase();

        return Response.json({
            success: true,
            message: 'Database connection successful and tables initialized!',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Database test error:', error);
        return Response.json(
            {
                error: 'Database test failed',
                details: error.message
            },
            { status: 500 }
        );
    }
}