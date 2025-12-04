import { executeQuery, queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

/**
 * Auto-close violations that have been pending for more than 1 week.
 * 
 * This endpoint can be called:
 * 1. Via a cron job / scheduled task (using CRON_SECRET for authentication)
 * 2. Manually by an Admin user
 * 
 * GET - Check which violations would be closed (dry run)
 * POST - Actually close the violations
 */

const CRON_SECRET = process.env.CRON_SECRET;
const AUTO_CLOSE_DAYS = 7; // Close violations after 7 days

// Authenticate request - either via session (Admin) or CRON_SECRET
async function authenticate(request) {
    // Check for cron secret in authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${CRON_SECRET}` && CRON_SECRET) {
        return { authenticated: true, source: 'cron' };
    }

    // Check for admin session
    const session = await getSession();
    if (session && session.userRole === 'Admin') {
        return { authenticated: true, source: 'admin', user: session };
    }

    return { authenticated: false };
}

// Get violations that are eligible for auto-close (pending for 7+ days OR appeal denied)
async function getEligibleViolations() {
    const query = `
        SELECT 
            v.id,
            v.created_at,
            v.status,
            v.description,
            v.location,
            vt.name as violation_type,
            vh.plate_number,
            u.usc_id as owner_id,
            up.full_name as owner_name,
            vc.contest_status,
            DATEDIFF(NOW(), v.created_at) as days_pending,
            CASE 
                WHEN vc.contest_status = 'denied' THEN 'Appeal denied'
                ELSE 'Pending 7+ days'
            END as close_reason
        FROM violations v
        LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
        LEFT JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
        LEFT JOIN users u ON vh.usc_id = u.usc_id
        LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
        LEFT JOIN violation_contests vc ON v.id = vc.violation_id
        WHERE v.status != 'closed'
        AND (
            (v.status = 'pending' AND v.created_at <= DATE_SUB(NOW(), INTERVAL ? DAY))
            OR vc.contest_status = 'denied'
        )
        ORDER BY v.created_at ASC
    `;

    return await queryMany(query, [AUTO_CLOSE_DAYS]);
}

// Close eligible violations
async function closeViolations(violations, closedBy = 'system') {
    if (!violations || violations.length === 0) {
        return { closed: 0, ids: [] };
    }

    let totalClosed = 0;
    const closedIds = [];

    // Process each violation individually to set the correct close reason
    for (const violation of violations) {
        const closeReason = violation.contest_status === 'denied' 
            ? 'Auto-closed: Appeal denied'
            : `Auto-closed after ${AUTO_CLOSE_DAYS} days`;

        const updateQuery = `
            UPDATE violations 
            SET status = 'closed',
                updated_at = NOW(),
                closed_at = NOW(),
                closed_reason = ?
            WHERE id = ?
            AND status != 'closed'
        `;

        const result = await executeQuery(updateQuery, [closeReason, violation.id]);
        
        if (result.affectedRows > 0) {
            totalClosed++;
            closedIds.push(violation.id);
        }
    }

    return {
        closed: totalClosed,
        ids: closedIds
    };
}

// GET - Preview which violations would be closed (dry run)
export async function GET(request) {
    try {
        const auth = await authenticate(request);
        if (!auth.authenticated) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const violations = await getEligibleViolations();

        return Response.json({
            success: true,
            dryRun: true,
            autoCloseDays: AUTO_CLOSE_DAYS,
            eligibleCount: violations.length,
            violations: violations.map(v => ({
                id: v.id,
                violation_type: v.violation_type,
                plate_number: v.plate_number,
                owner_name: v.owner_name,
                created_at: v.created_at,
                days_pending: v.days_pending,
                location: v.location,
                contest_status: v.contest_status,
                close_reason: v.close_reason
            })),
            message: violations.length > 0 
                ? `${violations.length} violation(s) would be auto-closed. Use POST to execute.`
                : 'No violations eligible for auto-close at this time.'
        });

    } catch (error) {
        console.error('Auto-close violations (GET) error:', error);
        return Response.json(
            { error: 'Failed to check eligible violations' },
            { status: 500 }
        );
    }
}

// POST - Execute auto-close on eligible violations
export async function POST(request) {
    try {
        const auth = await authenticate(request);
        if (!auth.authenticated) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const violations = await getEligibleViolations();

        if (violations.length === 0) {
            return Response.json({
                success: true,
                closed: 0,
                message: 'No violations eligible for auto-close at this time.'
            });
        }

        // Determine who closed the violations
        const closedBy = auth.source === 'admin' ? auth.user.uscId : 'system';

        // Execute the close operation
        const result = await closeViolations(violations, closedBy);

        console.log(`Auto-closed ${result.closed} violations by ${auth.source}:`, result.ids);

        return Response.json({
            success: true,
            closed: result.closed,
            closedIds: result.ids,
            closedBy: closedBy,
            source: auth.source,
            autoCloseDays: AUTO_CLOSE_DAYS,
            message: `Successfully auto-closed ${result.closed} violation(s) that were pending for ${AUTO_CLOSE_DAYS}+ days.`,
            violations: violations.map(v => ({
                id: v.id,
                violation_type: v.violation_type,
                plate_number: v.plate_number,
                owner_name: v.owner_name,
                days_pending: v.days_pending
            }))
        });

    } catch (error) {
        console.error('Auto-close violations (POST) error:', error);
        return Response.json(
            { error: 'Failed to auto-close violations' },
            { status: 500 }
        );
    }
}
