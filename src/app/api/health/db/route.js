import { testConnection } from '@/lib/database';

export async function GET() {
    try {
        const isHealthy = await testConnection();
        
        return Response.json({
            success: true,
            status: 'healthy',
            database: isHealthy ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        return Response.json({
            success: false,
            status: 'unhealthy',
            database: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
}
