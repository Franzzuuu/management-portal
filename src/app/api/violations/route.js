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
        const securityFilter = url.searchParams.get('securityFilter'); // NEW: For security users

        // ✅ ENHANCED: Role-based access control
        const isAdmin = session.userRole === 'Admin';
        const isSecurity = session.userRole === 'Security';
        const isNormalUser = ['User', 'Student', 'Faculty'].includes(session.userRole);

        // ✅ ENHANCED: Handle different user types
        if (isNormalUser && !userId) {
            // Normal users can only see their own violations
            return getUserViolations(session.uscId);
        }

        if (isSecurity && securityFilter) {
            // Get the security user's USC ID from headers
            const headers = request.headers;
            const securityUscId = headers.get('x-user-id');
            console.log('Security USC ID from headers:', securityUscId);
            console.log('All headers:', Object.fromEntries(headers.entries()));
            console.log('Session:', session);

            // Try to get USC ID from either headers or session
            const userUscId = securityUscId || session?.uscId;

            if (!userUscId) {
                console.error('No USC ID found in headers or session');
                return Response.json({ error: 'User ID not provided' }, { status: 400 });
            }

            // ✅ NEW: Security users can see violations they've reported
            return getSecurityViolations(userUscId, dateFrom, dateTo);
        }

        if (isAdmin) {
            // ✅ PRESERVED: Admin can access all views (existing functionality)
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
        }

        if (isSecurity) {
            // ✅ NEW: Security users can see all violations for monitoring
            return getAllViolations(dateFrom, dateTo);
        }

        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });

    } catch (error) {
        console.error('Violations API error:', error);
        return Response.json(
            { error: 'Failed to fetch violations' },
            { status: 500 }
        );
    }
}

async function getSecurityViolations(securityUscId, dateFrom, dateTo) {
    console.log('Getting violations for security USC ID:', securityUscId);

    let dateCondition = '';
    let params = [securityUscId];

    if (dateFrom && dateTo) {
        dateCondition = 'AND v.created_at BETWEEN ? AND ?';
        params.push(dateFrom, dateTo);
    }

    const query = `
        SELECT 
            v.id,
            v.vehicle_id,
            v.violation_type_id,
            vt.name as violation_type,
            v.description,
            v.location,
            v.status,
            v.created_at,
            v.updated_at,
            v.reported_by,
            v.image_data IS NOT NULL as has_image,
            v.image_filename,
            vh.plate_number as vehicle_plate,
            vh.vehicle_type,
            vh.make as brand,
            vh.model,
            vh.color,
            u.usc_id as owner_id,
            u.email as owner_email,
            u.designation as owner_designation,
            up.full_name as owner_name,
            reporter.usc_id as reporter_id,
            reporter_profile.full_name as reporter_name,
            reporter.designation as reporter_designation
        FROM violations v
        JOIN violation_types vt ON v.violation_type_id = vt.id
        JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
        JOIN users u ON vh.usc_id = u.usc_id
        JOIN user_profiles up ON u.usc_id = up.usc_id
        LEFT JOIN users reporter ON v.reported_by = reporter.usc_id
        LEFT JOIN user_profiles reporter_profile ON reporter.usc_id = reporter_profile.usc_id
        WHERE v.reported_by = ? ${dateCondition}
        ORDER BY v.created_at DESC
    `;

    console.log('Executing query with params:', params);
    const violations = await queryMany(query, params);
    console.log('Found violations:', violations);

    return Response.json({
        success: true,
        violations: violations || [],
        message: 'Security violations retrieved successfully'
    });
}

// ✅ CORRECTED: getAllViolations function with proper JOIN
async function getAllViolations(dateFrom, dateTo) {
    let dateCondition = '';
    let params = [];

    if (dateFrom && dateTo) {
        dateCondition = 'AND v.created_at BETWEEN ? AND ?';
        params.push(dateFrom, dateTo);
    }

    const query = `
        SELECT 
            v.id,
            v.vehicle_id,
            v.violation_type_id,
            vt.name as violation_type,
            v.description,
            v.location,
            v.status,
            v.created_at,
            v.updated_at,
            v.reported_by,
            v.image_data IS NOT NULL as has_image,
            v.image_filename,
            vh.plate_number as vehicle_plate,
            vh.vehicle_type,
            vh.make as brand,
            vh.model,
            vh.color,
            u.usc_id as owner_id,
            u.email as owner_email,
            u.designation as owner_designation,
            up.full_name as owner_name,
            reporter.usc_id as reporter_usc_id,
            reporter_profile.full_name as reporter_name,
            reporter.designation as reporter_designation,
            reporter_profile.department as reporter_department,
            updater.usc_id as updated_by_usc_id,
            updater_profile.full_name as updated_by_name,
            updater.designation as updated_by_designation,
            updater_profile.department as updated_by_department,
            v.updated_at as last_updated
        FROM violations v
        JOIN violation_types vt ON v.violation_type_id = vt.id
        JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
        JOIN users u ON vh.usc_id = u.usc_id
        JOIN user_profiles up ON u.usc_id = up.usc_id
        LEFT JOIN users reporter ON v.reported_by = reporter.usc_id
        LEFT JOIN user_profiles reporter_profile ON reporter.usc_id = reporter_profile.usc_id
        LEFT JOIN users updater ON v.updated_by = updater.usc_id
        LEFT JOIN user_profiles updater_profile ON updater.usc_id = updater_profile.usc_id
        WHERE 1=1 ${dateCondition}
        ORDER BY v.created_at DESC
    `;

    const violations = await queryMany(query, params);

    return Response.json({
        success: true,
        violations: violations || []
    });
}

async function getUserViolations(uscId) {
    const query = `
        SELECT 
            v.id,
            v.vehicle_id,
            v.violation_type_id,
            vt.name as violation_type,
            v.description,
            v.location,
            v.status,
            v.created_at,
            v.updated_at,
            v.reported_by,
            v.image_data IS NOT NULL as has_image,
            v.image_filename,
            vh.plate_number as vehicle_plate,
            vh.vehicle_type,
            vh.make as brand,
            vh.model,
            vh.color,
            u.usc_id as owner_id,
            u.email as owner_email,
            u.designation as owner_designation,
            up.full_name as owner_name,
            reporter.usc_id as reporter_id,
            reporter_profile.full_name as reporter_name,
            reporter.designation as reporter_designation
        FROM violations v
        JOIN violation_types vt ON v.violation_type_id = vt.id
        JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
        JOIN users u ON vh.usc_id = u.usc_id
        JOIN user_profiles up ON u.usc_id = up.usc_id
        LEFT JOIN users reporter ON v.reported_by = reporter.usc_id
        LEFT JOIN user_profiles reporter_profile ON reporter.usc_id = reporter_profile.usc_id
        WHERE u.usc_id = ?
        ORDER BY v.created_at DESC
    `;

    const violations = await queryMany(query, [uscId]);

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

    const query = `
        SELECT 
            v.id,
            v.vehicle_id,
            v.violation_type_id,
            vt.name as violation_type,
            v.description,
            v.location,
            v.status,
            v.created_at,
            v.updated_at,
            v.reported_by,
            v.image_data IS NOT NULL as has_image,
            v.image_filename,
            vh.plate_number as vehicle_plate,
            vh.vehicle_type,
            u.usc_id as owner_id,
            up.full_name as owner_name,
            u.designation as owner_designation,
            reporter.usc_id as reporter_id,
            reporter_profile.full_name as reporter_name,
            reporter.designation as reporter_designation,
            -- Status history
            vsh.old_status,
            vsh.new_status,
            vsh.changed_at,
            vsh.changed_by,
            changer_profile.full_name as changed_by_name
        FROM violations v
        JOIN violation_types vt ON v.violation_type_id = vt.id
        JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id 
        JOIN users u ON vh.usc_id = u.usc_id
        JOIN user_profiles up ON u.usc_id = up.usc_id
        LEFT JOIN users reporter ON v.reported_by = reporter.usc_id
        LEFT JOIN user_profiles reporter_profile ON reporter.usc_id = reporter_profile.usc_id
        LEFT JOIN violation_status_history vsh ON v.id = vsh.violation_id
        LEFT JOIN users changer ON vsh.changed_by = changer.usc_id
        LEFT JOIN user_profiles changer_profile ON changer.usc_id = changer_profile.usc_id
        WHERE 1=1 ${dateCondition}
        ORDER BY v.created_at DESC, vsh.changed_at DESC
    `;

    const violations = await queryMany(query, params);

    return Response.json({
        success: true,
        violations: violations || []
    });
}

async function getViolationStatistics(dateFrom, dateTo) {
    let dateCondition = '';
    let params = [];

    if (dateFrom && dateTo) {
        dateCondition = 'AND created_at BETWEEN ? AND ?';
        params.push(dateFrom, dateTo);
    }

    // Get basic statistics
    const statsQuery = `
        SELECT 
            COUNT(*) as total_violations,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_violations,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_violations,
            SUM(CASE WHEN status = 'contested' THEN 1 ELSE 0 END) as contested_violations
        FROM violations 
        WHERE 1=1 ${dateCondition}
    `;

    const monthlyQuery = `
        SELECT 
            MONTH(created_at) as month,
            YEAR(created_at) as year,
            COUNT(*) as violation_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
            SUM(CASE WHEN status = 'contested' THEN 1 ELSE 0 END) as contested_count
        FROM violations 
        WHERE 1=1 ${dateCondition}
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY year DESC, month DESC
    `;

    const typeQuery = `
        SELECT 
            violation_type,
            COUNT(*) as count
        FROM violations 
        WHERE 1=1 ${dateCondition}
        GROUP BY violation_type
        ORDER BY count DESC
    `;

    const [stats, monthly, types] = await Promise.all([
        queryMany(statsQuery, params),
        queryMany(monthlyQuery, params),
        queryMany(typeQuery, params)
    ]);

    return Response.json({
        success: true,
        statistics: {
            overview: stats[0] || {
                total_violations: 0,
                pending_violations: 0,
                resolved_violations: 0,
                contested_violations: 0
            },
            monthly: monthly || [],
            types: types || []
        }
    });
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Both Admin and Security can create violations
        if (!['Admin', 'Security'].includes(session.userRole)) {
            return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const data = await request.json();
        const { vehicle_id, violation_type, description, location, image_data, image_filename, image_mime_type } = data;

        // Validate required fields
        if (!vehicle_id || !violation_type) {
            return Response.json({
                error: 'Vehicle ID and violation type ID are required'
            }, { status: 400 });
        }

        // Insert violation
        const query = `
            INSERT INTO violations (
                vehicle_id, 
                violation_type_id, 
                description,
                location, 
                reported_by, 
                status,
                image_data,
                image_filename,
                image_mime_type,
                created_at
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW())
        `;

        // Convert base64 image to buffer if it exists
        const imageBuffer = image_data ? Buffer.from(image_data, 'base64') : null;

        const result = await executeQuery(query, [
            vehicle_id,
            violation_type,
            description || null,
            location || 'Campus',
            session.uscId,
            imageBuffer,
            image_filename || null,
            image_mime_type || null
        ]);

        if (!result || !result.insertId) {
            return Response.json({ error: 'Failed to create violation' }, { status: 500 });
        }

        // Log the status change - for new violations both statuses start as pending
        await executeQuery(`
            INSERT INTO violation_status_history (
                violation_id, 
                old_status, 
                new_status, 
                changed_by
            ) VALUES (?, 'pending', 'pending', ?)
        `, [result.insertId, session.uscId]);

        // Return success with the new violation ID
        return Response.json({
            success: true,
            message: 'Violation created successfully',
            violationId: result.insertId
        });

    } catch (error) {
        console.error('Create violation error:', error);
        return Response.json(
            { error: 'Failed to create violation' },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        const { id, violation_type, description, location, status } = data;

        // Validate required fields
        if (!id || !violation_type || !location) {
            return Response.json({
                error: 'Violation ID, violation type, and location are required'
            }, { status: 400 });
        }

        // Check if user has permission to update this violation
        const violationQuery = `
            SELECT reported_by, status as current_status
            FROM violations 
            WHERE id = ?
        `;

        const violationResult = await queryMany(violationQuery, [id]);

        if (violationResult.length === 0) {
            return Response.json({ error: 'Violation not found' }, { status: 404 });
        }

        const violation = violationResult[0];

        // ✅ ENHANCED: Admin can update any violation, Security can only update their own
        const canUpdate = session.userRole === 'Admin' ||
            (session.userRole === 'Security' && violation.reported_by === session.uscId);

        if (!canUpdate) {
            return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Update violation
        const updateQuery = `
            UPDATE violations 
            SET violation_type = ?, description = ?, location = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        `;

        await executeQuery(updateQuery, [
            violation_type,
            description || null,
            location,
            status || violation.current_status,
            id
        ]);

        // Log status change if status was updated
        if (status && status !== violation.current_status) {
            await executeQuery(`
                INSERT INTO violation_status_history (
                    violation_id, 
                    old_status, 
                    new_status, 
                    changed_by
                ) VALUES (?, ?, ?, ?)
            `, [id, violation.current_status, status, session.uscId]);
        }

        return Response.json({
            success: true,
            message: 'Violation updated successfully'
        });

    } catch (error) {
        console.error('Update violation error:', error);
        return Response.json(
            { error: 'Failed to update violation' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return Response.json({ error: 'Violation ID is required' }, { status: 400 });
        }

        // Check if user has permission to delete this violation
        const violationQuery = `
            SELECT reported_by
            FROM violations 
            WHERE id = ?
        `;

        const violationResult = await queryMany(violationQuery, [id]);

        if (violationResult.length === 0) {
            return Response.json({ error: 'Violation not found' }, { status: 404 });
        }

        const violation = violationResult[0];

        // ✅ ENHANCED: Admin can delete any violation, Security can only delete their own
        const canDelete = session.userRole === 'Admin' ||
            (session.userRole === 'Security' && violation.reported_by === session.uscId);

        if (!canDelete) {
            return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Delete related records first (foreign key constraints)
        await executeQuery('DELETE FROM violation_status_history WHERE violation_id = ?', [id]);
        await executeQuery('DELETE FROM violation_contests WHERE violation_id = ?', [id]);

        // Delete the violation
        await executeQuery('DELETE FROM violations WHERE id = ?', [id]);

        return Response.json({
            success: true,
            message: 'Violation deleted successfully'
        });

    } catch (error) {
        console.error('Delete violation error:', error);
        return Response.json(
            { error: 'Failed to delete violation' },
            { status: 500 }
        );
    }
}

// ✅ PRESERVED: Keep existing Admin-specific functions from original file
// You can add the existing functions like contestViolation, updateViolationStatus, bulkUpdateViolations here
// These would remain unchanged to preserve Admin functionality