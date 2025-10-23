// src/app/api/admin/cache/route.js
import { getSession } from '@/lib/utils';
import { CacheManager } from '@/lib/cache';

export async function GET(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stats = CacheManager.getStats();

        return Response.json({
            success: true,
            cache: {
                stats,
                status: 'active',
                type: 'memory'
            }
        });

    } catch (error) {
        console.error('Cache status error:', error);
        return Response.json(
            { error: 'Failed to get cache status' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const reportType = searchParams.get('reportType');

        let clearedCount = 0;
        if (reportType) {
            clearedCount = CacheManager.invalidateReportCache(reportType);
        } else {
            CacheManager.clearAll();
            clearedCount = 'all';
        }

        return Response.json({
            success: true,
            message: `Cache cleared: ${clearedCount} items`,
            clearedCount
        });

    } catch (error) {
        console.error('Cache clear error:', error);
        return Response.json(
            { error: 'Failed to clear cache' },
            { status: 500 }
        );
    }
}