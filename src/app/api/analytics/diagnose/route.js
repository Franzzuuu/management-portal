import { queryOne, queryMany } from '@/lib/database';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const diagnose = searchParams.get('diagnose');

        if (diagnose === '1') {
            // Diagnostic endpoint to test timezone configuration
            const tzProbe = await queryOne(`
                SELECT
                    @@time_zone AS session_tz,
                    @@system_time_zone AS system_tz,
                    NOW() AS now_session,
                    UTC_TIMESTAMP() AS now_utc,
                    CONVERT_TZ('2025-10-27 00:00:00', '+00:00', '+08:00') AS conv_fixed_offset,
                    CONVERT_TZ('2025-10-27 00:00:00', 'UTC', 'Asia/Manila') AS conv_named_tz
            `);

            let sampleData = null;
            try {
                sampleData = await queryMany(`
                    SELECT timestamp, entry_type, HOUR(timestamp) as raw_hour 
                    FROM access_logs 
                    ORDER BY timestamp DESC 
                    LIMIT 3
                `);
            } catch (e) {
                sampleData = { error: 'No access logs data' };
            }

            return Response.json({
                success: true,
                diagnostic: {
                    timezone_probe: tzProbe,
                    sample_data: sampleData,
                    tz_mode: tzProbe.conv_named_tz ? 'Asia/Manila' : '+08:00',
                    recommendation: tzProbe.conv_named_tz ? 'Use named timezone' : 'Use fixed offset'
                }
            });
        }

        return Response.json({ error: 'Add ?diagnose=1 to see diagnostic info' });

    } catch (error) {
        console.error('Diagnostic API error:', error);
        return Response.json(
            { error: 'Failed to run diagnostics', details: error.message },
            { status: 500 }
        );
    }
}