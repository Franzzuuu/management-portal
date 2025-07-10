import { queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const view = url.searchParams.get('view'); // 'all', 'history', 'stats', 'user'
        const userId = url.searchParams.get('userId');
        const dateFrom = url.searchParams.get('dateFrom');
        const dateTo = url.searchParams.get('dateTo');

        // Determine access level based on user role
        const hasFullAccess = ['Admin', 'Staff'].includes(session.userRole);

        if (!hasFullAccess && !userId) {
            // Normal users can only see their own violations
            return getUserViolations(session.userId);
        }

        if (!hasFullAccess) {
            return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Admin/Staff can access all views
        switch (view) {
            case 'history':
                return getViolationHistory(dateFrom, dateTo);
            case 'stats':
                return getViolationStatistics(dateFrom, dateTo);
            case 'user':
                return getUserViolations(userId);
            default:
                return getAllViolations(dateFrom, dateTo);
        }

    } catch (error) {
        console.error('Violations API error:', error);
        return Response.json(
            { error: 'Failed to fetch violations' },
            { status: 500 }
        );
    }
}

async function getAllViolations(dateFrom, dateTo) {
    let dateCondition = '';
    let params = [];

    if (dateFrom && dateTo) {
        dateCondition = 'AND v.created_at BETWEEN ? AND ?';
        params.push(dateFrom, dateTo);
    }

    const violations = await queryMany(`
        SELECT 
            v.id,
            v.description,
            v.image_filename,
            v.image_mime_type,
            CASE WHEN v.image_data IS NOT NULL THEN 1 ELSE 0 END as has_image,
            v.status,
            v.created_at,
            v.updated_at,
            ve.plate_number,
            ve.make as vehicle_make,
            ve.model as vehicle_model,
            ve.color as vehicle_color,
            ve.vehicle_type,
            up.full_name as owner_name,
            u.designation as owner_designation,
            u.id as owner_id,
            vt.name as violation_type,
            v.violation_type_id,
            reporter.full_name as reported_by_name,
            ru.designation as reported_by_designation
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        JOIN users u ON ve.user_id = u.id
        JOIN user_profiles up ON u.id = up.user_id
        JOIN violation_types vt ON v.violation_type_id = vt.id
        JOIN users ru ON v.reported_by = ru.id
        JOIN user_profiles reporter ON ru.id = reporter.user_id
        WHERE 1=1 ${dateCondition}
        ORDER BY v.created_at DESC
    `, params);

    return Response.json({
        success: true,
        violations: violations || []
    });
}

async function getViolationHistory(dateFrom, dateTo) {
    let dateCondition = '';
    let params = [];

    if (dateFrom && dateTo) {
        dateCondition = 'AND v.created_at BETWEEN ? AND ?';
        params.push(dateFrom, dateTo);
    }

    // Get detailed history with audit trail
    const history = await queryMany(`
        SELECT 
            v.id,
            v.description,
            v.status,
            v.created_at,
            v.updated_at,
            ve.plate_number,
            ve.make as vehicle_make,
            ve.model as vehicle_model,
            ve.vehicle_type,
            up.full_name as owner_name,
            u.designation as owner_designation,
            u.email as owner_email,
            vt.name as violation_type,
            vt.description as violation_type_description,
            reporter.full_name as reported_by_name,
            ru.designation as reported_by_designation,
            CASE WHEN v.image_data IS NOT NULL THEN 1 ELSE 0 END as has_evidence,
            -- Calculate days since violation
            DATEDIFF(NOW(), v.created_at) as days_since_violation,
            -- Calculate resolution time for resolved violations
            CASE 
                WHEN v.status = 'resolved' THEN DATEDIFF(v.updated_at, v.created_at)
                ELSE NULL 
            END as resolution_days
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        JOIN users u ON ve.user_id = u.id
        JOIN user_profiles up ON u.id = up.user_id
        JOIN violation_types vt ON v.violation_type_id = vt.id
        JOIN users ru ON v.reported_by = ru.id
        JOIN user_profiles reporter ON ru.id = reporter.user_id
        WHERE 1=1 ${dateCondition}
        ORDER BY v.created_at DESC
    `, params);

    // Get summary statistics for the history view
    const summaryStats = await queryMany(`
        SELECT 
            COUNT(*) as total_violations,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
            SUM(CASE WHEN status = 'contested' THEN 1 ELSE 0 END) as contested_count,
            AVG(CASE WHEN status = 'resolved' THEN DATEDIFF(updated_at, created_at) END) as avg_resolution_days
        FROM violations v
        WHERE 1=1 ${dateCondition}
    `, params);

    return Response.json({
        success: true,
        history: history || [],
        summary: summaryStats[0] || {}
    });
}

async function getViolationStatistics(dateFrom, dateTo) {
    let dateCondition = '';
    let params = [];

    if (dateFrom && dateTo) {
        dateCondition = 'AND v.created_at BETWEEN ? AND ?';
        params.push(dateFrom, dateTo);
    }

    // Monthly statistics
    const monthlyStats = await queryMany(`
        SELECT 
            DATE_FORMAT(v.created_at, '%Y-%m') as month,
            COUNT(*) as count,
            SUM(CASE WHEN v.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN v.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN v.status = 'contested' THEN 1 ELSE 0 END) as contested
        FROM violations v
        WHERE 1=1 ${dateCondition}
        GROUP BY DATE_FORMAT(v.created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
    `, params);

    // Violation type statistics
    const typeStats = await queryMany(`
        SELECT 
            vt.name as type,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM violations WHERE 1=1 ${dateCondition})), 2) as percentage
        FROM violations v
        JOIN violation_types vt ON v.violation_type_id = vt.id
        WHERE 1=1 ${dateCondition}
        GROUP BY vt.id, vt.name
        ORDER BY count DESC
    `, [...params, ...params]);

    // User designation statistics
    const designationStats = await queryMany(`
        SELECT 
            u.designation,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM violations v2 JOIN vehicles ve2 ON v2.vehicle_id = ve2.id JOIN users u2 ON ve2.user_id = u2.id WHERE 1=1 ${dateCondition})), 2) as percentage
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        JOIN users u ON ve.user_id = u.id
        WHERE 1=1 ${dateCondition}
        GROUP BY u.designation
        ORDER BY count DESC
    `, [...params, ...params]);

    // Vehicle type statistics
    const vehicleTypeStats = await queryMany(`
        SELECT 
            ve.vehicle_type,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM violations v2 JOIN vehicles ve2 ON v2.vehicle_id = ve2.id WHERE 1=1 ${dateCondition})), 2) as percentage
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        WHERE 1=1 ${dateCondition}
        GROUP BY ve.vehicle_type
        ORDER BY count DESC
    `, [...params, ...params]);

    // Status statistics
    const statusStats = await queryMany(`
        SELECT 
            status,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM violations WHERE 1=1 ${dateCondition})), 2) as percentage
        FROM violations v
        WHERE 1=1 ${dateCondition}
        GROUP BY status
        ORDER BY count DESC
    `, [...params, ...params]);

    // Top violators
    const topViolators = await queryMany(`
        SELECT 
            up.full_name as name,
            ve.plate_number,
            u.designation,
            COUNT(*) as violation_count,
            GROUP_CONCAT(DISTINCT vt.name ORDER BY vt.name SEPARATOR ', ') as violation_types,
            MAX(v.created_at) as last_violation_date
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        JOIN users u ON ve.user_id = u.id
        JOIN user_profiles up ON u.id = up.user_id
        JOIN violation_types vt ON v.violation_type_id = vt.id
        WHERE 1=1 ${dateCondition}
        GROUP BY up.full_name, ve.plate_number, u.designation
        ORDER BY violation_count DESC, last_violation_date DESC
        LIMIT 15
    `, params);

    // Trend analysis (comparing current period with previous period)
    let trendAnalysis = null;
    if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);

        const currentPeriodCount = await queryMany(`
            SELECT COUNT(*) as count FROM violations v WHERE v.created_at BETWEEN ? AND ?
        `, [dateFrom, dateTo]);

        const previousPeriodCount = await queryMany(`
            SELECT COUNT(*) as count FROM violations v WHERE v.created_at BETWEEN ? AND ?
        `, [prevStartDate.toISOString().split('T')[0], prevEndDate.toISOString().split('T')[0]]);

        const current = currentPeriodCount[0]?.count || 0;
        const previous = previousPeriodCount[0]?.count || 0;
        const change = previous > 0 ? ((current - previous) / previous * 100) : 0;

        trendAnalysis = {
            current_period: current,
            previous_period: previous,
            percentage_change: Math.round(change * 100) / 100,
            trend: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable'
        };
    }

    // Peak hours analysis
    const peakHours = await queryMany(`
        SELECT 
            HOUR(v.created_at) as hour,
            COUNT(*) as count
        FROM violations v
        WHERE 1=1 ${dateCondition}
        GROUP BY HOUR(v.created_at)
        ORDER BY count DESC
        LIMIT 5
    `, params);

    return Response.json({
        success: true,
        statistics: {
            monthly: monthlyStats || [],
            violation_types: typeStats || [],
            user_designations: designationStats || [],
            vehicle_types: vehicleTypeStats || [],
            status_breakdown: statusStats || [],
            top_violators: topViolators || [],
            trend_analysis: trendAnalysis,
            peak_hours: peakHours || []
        }
    });
}

async function getUserViolations(userId) {
    const violations = await queryMany(`
        SELECT 
            v.id,
            v.description,
            v.image_filename,
            v.image_mime_type,
            CASE WHEN v.image_data IS NOT NULL THEN 1 ELSE 0 END as has_image,
            v.status,
            v.created_at,
            v.updated_at,
            ve.plate_number,
            ve.make as vehicle_make,
            ve.model as vehicle_model,
            ve.color as vehicle_color,
            ve.vehicle_type,
            vt.name as violation_type,
            vt.description as violation_type_description,
            v.violation_type_id,
            reporter.full_name as reported_by_name,
            ru.designation as reported_by_designation,
            -- Additional info for user context
            CASE 
                WHEN v.status = 'pending' THEN 'You can contest this violation if you believe it was issued in error.'
                WHEN v.status = 'contested' THEN 'Your contest is under review by administration.'
                WHEN v.status = 'resolved' THEN 'This violation has been resolved.'
                ELSE 'Contact administration for more information.'
            END as user_guidance
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        JOIN violation_types vt ON v.violation_type_id = vt.id
        JOIN users ru ON v.reported_by = ru.id
        JOIN user_profiles reporter ON ru.id = reporter.user_id
        WHERE ve.user_id = ?
        ORDER BY v.created_at DESC
    `, [userId]);

    // Get user's violation summary
    const userSummary = await queryMany(`
        SELECT 
            COUNT(*) as total_violations,
            SUM(CASE WHEN v.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN v.status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
            SUM(CASE WHEN v.status = 'contested' THEN 1 ELSE 0 END) as contested_count,
            MAX(v.created_at) as last_violation_date
        FROM violations v
        JOIN vehicles ve ON v.vehicle_id = ve.id
        WHERE ve.user_id = ?
    `, [userId]);

    return Response.json({
        success: true,
        violations: violations || [],
        user_summary: userSummary[0] || {}
    });
}

// New endpoint for notification management
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, violationId, status, notes } = body;

        switch (action) {
            case 'update_status':
                return updateViolationStatus(violationId, status, notes, session);
            case 'contest_violation':
                return contestViolation(violationId, notes, session);
            case 'bulk_update':
                return bulkUpdateViolations(body.violations, body.newStatus, session);
            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Violations POST error:', error);
        return Response.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}

async function updateViolationStatus(violationId, status, notes, session) {
    // Check permissions
    if (!['Admin', 'Staff'].includes(session.userRole)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate status
    if (!['pending', 'resolved', 'contested'].includes(status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update violation
    await executeQuery(`
        UPDATE violations 
        SET status = ?, updated_at = NOW() 
        WHERE id = ?
    `, [status, violationId]);

    // Add status change log (if you want to implement audit trail)
    await executeQuery(`
        INSERT INTO violation_status_history (violation_id, old_status, new_status, changed_by, change_notes, created_at)
        SELECT ?, 
               (SELECT status FROM violations WHERE id = ? LIMIT 1), 
               ?, ?, ?, NOW()
    `, [violationId, violationId, status, session.userId, notes || '']);

    // Create notification for vehicle owner
    const violationDetails = await queryMany(`
        SELECT ve.user_id, up.full_name, v.id 
        FROM violations v 
        JOIN vehicles ve ON v.vehicle_id = ve.id 
        JOIN user_profiles up ON ve.user_id = up.user_id 
        WHERE v.id = ?
    `, [violationId]);

    if (violationDetails.length > 0) {
        await executeQuery(`
            INSERT INTO notifications (user_id, type, title, message, related_id, created_at)
            VALUES (?, 'violation_status_update', 'Violation Status Updated', 
                    CONCAT('Your violation #', ?, ' status has been updated to: ', ?), ?, NOW())
        `, [violationDetails[0].user_id, violationId, status, violationId]);
    }

    return Response.json({
        success: true,
        message: `Violation status updated to ${status}`
    });
}

async function contestViolation(violationId, contestNotes, session) {
    // Users can only contest their own violations
    const violation = await queryMany(`
        SELECT v.id, v.status, ve.user_id 
        FROM violations v 
        JOIN vehicles ve ON v.vehicle_id = ve.id 
        WHERE v.id = ? AND ve.user_id = ?
    `, [violationId, session.userId]);

    if (violation.length === 0) {
        return Response.json({ error: 'Violation not found or not authorized' }, { status: 404 });
    }

    if (violation[0].status !== 'pending') {
        return Response.json({ error: 'Only pending violations can be contested' }, { status: 400 });
    }

    // Update violation status to contested
    await executeQuery(`
        UPDATE violations 
        SET status = 'contested', updated_at = NOW() 
        WHERE id = ?
    `, [violationId]);

    // Add contest record
    await executeQuery(`
        INSERT INTO violation_contests (violation_id, user_id, contest_notes, created_at)
        VALUES (?, ?, ?, NOW())
    `, [violationId, session.userId, contestNotes]);

    // Notify admins about the contest
    const admins = await queryMany(`SELECT id FROM users WHERE designation = 'Admin'`);
    for (const admin of admins) {
        await executeQuery(`
            INSERT INTO notifications (user_id, type, title, message, related_id, created_at)
            VALUES (?, 'violation_contested', 'Violation Contested', 
                    CONCAT('Violation #', ?, ' has been contested by a user'), ?, NOW())
        `, [admin.id, violationId, violationId]);
    }

    return Response.json({
        success: true,
        message: 'Violation contested successfully'
    });
}

async function bulkUpdateViolations(violationIds, newStatus, session) {
    if (!['Admin', 'Staff'].includes(session.userRole)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!Array.isArray(violationIds) || violationIds.length === 0) {
        return Response.json({ error: 'No violations selected' }, { status: 400 });
    }

    // Update all selected violations
    const placeholders = violationIds.map(() => '?').join(',');
    await executeQuery(`
        UPDATE violations 
        SET status = ?, updated_at = NOW() 
        WHERE id IN (${placeholders})
    `, [newStatus, ...violationIds]);

    return Response.json({
        success: true,
        message: `${violationIds.length} violations updated to ${newStatus}`
    });
}