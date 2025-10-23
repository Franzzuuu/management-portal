// src/app/api/admin/monitoring/route.js
import { getSession } from '@/lib/utils';
import { getPerformanceMonitor } from '@/lib/performance-monitor';

export async function GET(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'health';
        const hours = parseInt(searchParams.get('hours')) || 24;

        const monitor = getPerformanceMonitor();

        let data;
        switch (type) {
            case 'health':
                data = await monitor.generateHealthReport();
                break;

            case 'metrics':
                data = monitor.getMetricsSummary(hours);
                break;

            case 'alerts':
                const cutoff = Date.now() - (hours * 60 * 60 * 1000);
                data = {
                    alerts: monitor.alerts.filter(alert =>
                        alert.timestamp.getTime() >= cutoff
                    ).slice(-50), // Last 50 alerts
                    total: monitor.alerts.length
                };
                break;

            default:
                return Response.json({
                    error: 'Invalid type parameter. Use: health, metrics, or alerts'
                }, { status: 400 });
        }

        return Response.json({
            success: true,
            type,
            data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Monitoring API error:', error);
        return Response.json(
            { error: 'Failed to fetch monitoring data' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, alertId } = body;

        const monitor = getPerformanceMonitor();

        let result;
        switch (action) {
            case 'cleanup':
                const hours = body.hours || 24;
                monitor.cleanup(hours);
                result = { message: `Cleaned up metrics older than ${hours} hours` };
                break;

            case 'resolve_alert':
                if (!alertId) {
                    return Response.json({
                        error: 'Missing alertId parameter'
                    }, { status: 400 });
                }

                const alertIndex = monitor.alerts.findIndex(alert =>
                    alert.timestamp.getTime().toString() === alertId
                );

                if (alertIndex !== -1) {
                    monitor.alerts[alertIndex].resolved = true;
                    monitor.alerts[alertIndex].resolved_by = session.userId;
                    monitor.alerts[alertIndex].resolved_at = new Date();
                    result = { message: 'Alert resolved successfully' };
                } else {
                    return Response.json({
                        error: 'Alert not found'
                    }, { status: 404 });
                }
                break;

            default:
                return Response.json({
                    error: 'Invalid action parameter'
                }, { status: 400 });
        }

        return Response.json({
            success: true,
            result
        });

    } catch (error) {
        console.error('Monitoring action error:', error);
        return Response.json(
            { error: 'Failed to perform monitoring action' },
            { status: 500 }
        );
    }
}