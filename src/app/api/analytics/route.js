import { queryOne, queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days')) || 30; // Default to last 30 days

        // Get peak hours for entry and exit (Asia/Manila timezone)
        const [peakEntryHour, peakExitHour] = await Promise.all([
            queryOne(`
                SELECT HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')) AS hour, COUNT(*) AS count
                FROM access_logs 
                WHERE entry_type = 'entry'
                GROUP BY HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila'))
                ORDER BY count DESC
                LIMIT 1
            `),
            queryOne(`
                SELECT HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')) AS hour, COUNT(*) AS count
                FROM access_logs 
                WHERE entry_type = 'exit'
                GROUP BY HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila'))
                ORDER BY count DESC
                LIMIT 1
            `)
        ]);

        // Get active users (users with access logs in last 30 days)
        const activeUsers = await queryOne(`
            SELECT COUNT(DISTINCT u.id) as count
            FROM users u
            JOIN vehicles v ON u.usc_id = v.usc_id
            JOIN access_logs al ON v.vehicle_id = al.vehicle_id
            WHERE al.timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        `);

        // Get daily access counts for average calculation (last 30 days)
        const dailyAccessCounts = await queryMany(`
            SELECT DATE(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')) AS date, COUNT(*) AS count
            FROM access_logs
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
            GROUP BY DATE(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila'))
            ORDER BY date
        `);

        // Calculate average daily access
        const totalAccessInPeriod = dailyAccessCounts.reduce((sum, day) => sum + day.count, 0);
        const avgDailyAccess = dailyAccessCounts.length > 0 ? Math.round(totalAccessInPeriod / days * 10) / 10 : 0;

        // Get monthly user registration trends (Asia/Manila timezone)
        const monthlyUserTrends = await queryMany(`
            SELECT 
                DATE_FORMAT(CONVERT_TZ(created_at, 'UTC', 'Asia/Manila'), '%Y-%m') AS month,
                COUNT(*) AS count
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(CONVERT_TZ(created_at, 'UTC', 'Asia/Manila'), '%Y-%m')
            ORDER BY month
        `);

        // Get monthly vehicle registration trends (Asia/Manila timezone)
        const monthlyVehicleTrends = await queryMany(`
            SELECT 
                DATE_FORMAT(CONVERT_TZ(created_at, 'UTC', 'Asia/Manila'), '%Y-%m') AS month,
                COUNT(*) AS count
            FROM vehicles
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(CONVERT_TZ(created_at, 'UTC', 'Asia/Manila'), '%Y-%m')
            ORDER BY month
        `);

        // Get daily access patterns (24-hour view) for last 30 days
        const dailyAccessPatterns = await queryMany(`
            SELECT 
                HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')) AS hour,
                entry_type,
                COUNT(*) AS count
            FROM access_logs
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
            GROUP BY HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')), entry_type
            ORDER BY hour, entry_type
        `);

        // Get weekly violation trends (last 7 days)
        const weeklyViolationTrends = await queryMany(`
            SELECT 
                DATE(CONVERT_TZ(created_at, 'UTC', 'Asia/Manila')) AS date,
                COUNT(*) AS count
            FROM violations
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(CONVERT_TZ(created_at, 'UTC', 'Asia/Manila'))
            ORDER BY date
        `);

        // Get user distribution
        const userDistribution = await queryMany(`
            SELECT designation, COUNT(*) AS count
            FROM users
            WHERE status = 'active'
            GROUP BY designation
        `);

        // Get vehicle distribution
        const vehicleDistribution = await queryMany(`
            SELECT vehicle_type, COUNT(*) AS count
            FROM vehicles
            GROUP BY vehicle_type
        `);

        return Response.json({
            success: true,
            analytics: {
                peakHours: {
                    entry: peakEntryHour ? {
                        hour: peakEntryHour.hour,
                        count: peakEntryHour.count,
                        formatted: `${String(peakEntryHour.hour).padStart(2, '0')}:00`
                    } : null,
                    exit: peakExitHour ? {
                        hour: peakExitHour.hour,
                        count: peakExitHour.count,
                        formatted: `${String(peakExitHour.hour).padStart(2, '0')}:00`
                    } : null
                },
                activeUsers: activeUsers?.count || 0,
                avgDailyAccess: avgDailyAccess,
                trends: {
                    monthlyUsers: monthlyUserTrends,
                    monthlyVehicles: monthlyVehicleTrends,
                    dailyAccessPatterns: dailyAccessPatterns,
                    weeklyViolations: weeklyViolationTrends
                },
                distribution: {
                    users: userDistribution,
                    vehicles: vehicleDistribution
                }
            }
        });

    } catch (error) {
        console.error('Analytics API error:', error);
        return Response.json(
            { error: 'Failed to fetch analytics data' },
            { status: 500 }
        );
    }
}