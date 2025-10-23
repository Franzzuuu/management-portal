// src/app/api/reports/presets/route.js
import { queryOne, queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

// GET - List user's presets
export async function GET(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const reportType = searchParams.get('reportType');

        let query = `
            SELECT 
                id,
                name,
                description,
                report_type,
                filters,
                columns,
                format,
                mode,
                sort_by,
                sort_dir,
                anonymize,
                created_at,
                updated_at
            FROM export_presets 
            WHERE user_id = ?
        `;

        const params = [session.userId];

        if (reportType) {
            query += ' AND report_type = ?';
            params.push(reportType);
        }

        query += ' ORDER BY updated_at DESC';

        const presets = await queryMany(query, params);

        // Parse JSON fields
        const parsedPresets = presets.map(preset => ({
            ...preset,
            filters: JSON.parse(preset.filters || '{}'),
            columns: JSON.parse(preset.columns || '[]')
        }));

        return Response.json({
            success: true,
            presets: parsedPresets
        });

    } catch (error) {
        console.error('Get presets error:', error);
        return Response.json(
            { error: 'Failed to fetch presets' },
            { status: 500 }
        );
    }
}

// POST - Create new preset
export async function POST(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            description,
            reportType,
            filters = {},
            columns = [],
            format = 'csv',
            mode = 'view',
            sortBy = 'id',
            sortDir = 'desc',
            anonymize = false
        } = body;

        // Validate required fields
        if (!name || !reportType) {
            return Response.json({
                error: 'Missing required fields: name and reportType'
            }, { status: 400 });
        }

        // Validate enum values
        const validReports = ['overview', 'users', 'vehicles', 'access', 'violations'];
        const validFormats = ['csv', 'xlsx', 'pdf'];
        const validModes = ['view', 'full'];
        const validSortDirs = ['asc', 'desc'];

        if (!validReports.includes(reportType)) {
            return Response.json({
                error: `Invalid report type. Must be one of: ${validReports.join(', ')}`
            }, { status: 400 });
        }

        if (!validFormats.includes(format)) {
            return Response.json({
                error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
            }, { status: 400 });
        }

        if (!validModes.includes(mode)) {
            return Response.json({
                error: `Invalid mode. Must be one of: ${validModes.join(', ')}`
            }, { status: 400 });
        }

        if (!validSortDirs.includes(sortDir)) {
            return Response.json({
                error: `Invalid sort direction. Must be one of: ${validSortDirs.join(', ')}`
            }, { status: 400 });
        }

        // Check if preset name already exists for this user
        const existingPreset = await queryOne(`
            SELECT id FROM export_presets 
            WHERE user_id = ? AND name = ?
        `, [session.userId, name]);

        if (existingPreset) {
            return Response.json({
                error: 'A preset with this name already exists'
            }, { status: 409 });
        }

        // Create preset
        const result = await executeQuery(`
            INSERT INTO export_presets (
                user_id, name, description, report_type, filters, columns, 
                format, mode, sort_by, sort_dir, anonymize, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            session.userId,
            name,
            description,
            reportType,
            JSON.stringify(filters),
            JSON.stringify(columns),
            format,
            mode,
            sortBy,
            sortDir,
            anonymize
        ]);

        // Log audit trail
        await executeQuery(`
            INSERT INTO audit_log (
                user_id, action, resource_type, resource_id, details, 
                ip_address, user_agent, created_at
            ) VALUES (?, 'preset_created', 'export_preset', ?, ?, ?, ?, NOW())
        `, [
            session.userId,
            result.insertId,
            JSON.stringify({
                name,
                reportType,
                format,
                mode,
                anonymize
            }),
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
            request.headers.get('user-agent') || 'unknown'
        ]);

        return Response.json({
            success: true,
            presetId: result.insertId,
            message: 'Preset created successfully'
        });

    } catch (error) {
        console.error('Create preset error:', error);

        // Handle duplicate key error
        if (error.code === 'ER_DUP_ENTRY') {
            return Response.json({
                error: 'A preset with this name already exists'
            }, { status: 409 });
        }

        return Response.json(
            { error: 'Failed to create preset' },
            { status: 500 }
        );
    }
}

// PUT - Update existing preset
export async function PUT(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            id,
            name,
            description,
            reportType,
            filters = {},
            columns = [],
            format = 'csv',
            mode = 'view',
            sortBy = 'id',
            sortDir = 'desc',
            anonymize = false
        } = body;

        // Validate required fields
        if (!id || !name || !reportType) {
            return Response.json({
                error: 'Missing required fields: id, name, and reportType'
            }, { status: 400 });
        }

        // Check if preset exists and belongs to user
        const existingPreset = await queryOne(`
            SELECT id FROM export_presets 
            WHERE id = ? AND user_id = ?
        `, [id, session.userId]);

        if (!existingPreset) {
            return Response.json({
                error: 'Preset not found or access denied'
            }, { status: 404 });
        }

        // Check if name conflicts with another preset
        const nameConflict = await queryOne(`
            SELECT id FROM export_presets 
            WHERE user_id = ? AND name = ? AND id != ?
        `, [session.userId, name, id]);

        if (nameConflict) {
            return Response.json({
                error: 'A preset with this name already exists'
            }, { status: 409 });
        }

        // Update preset
        await executeQuery(`
            UPDATE export_presets SET
                name = ?,
                description = ?,
                report_type = ?,
                filters = ?,
                columns = ?,
                format = ?,
                mode = ?,
                sort_by = ?,
                sort_dir = ?,
                anonymize = ?,
                updated_at = NOW()
            WHERE id = ? AND user_id = ?
        `, [
            name,
            description,
            reportType,
            JSON.stringify(filters),
            JSON.stringify(columns),
            format,
            mode,
            sortBy,
            sortDir,
            anonymize,
            id,
            session.userId
        ]);

        // Log audit trail
        await executeQuery(`
            INSERT INTO audit_log (
                user_id, action, resource_type, resource_id, details, 
                ip_address, user_agent, created_at
            ) VALUES (?, 'preset_updated', 'export_preset', ?, ?, ?, ?, NOW())
        `, [
            session.userId,
            id,
            JSON.stringify({
                name,
                reportType,
                format,
                mode,
                anonymize
            }),
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
            request.headers.get('user-agent') || 'unknown'
        ]);

        return Response.json({
            success: true,
            message: 'Preset updated successfully'
        });

    } catch (error) {
        console.error('Update preset error:', error);
        return Response.json(
            { error: 'Failed to update preset' },
            { status: 500 }
        );
    }
}

// DELETE - Delete preset
export async function DELETE(request) {
    try {
        // Check authentication and admin role
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return Response.json({
                error: 'Missing required parameter: id'
            }, { status: 400 });
        }

        // Check if preset exists and belongs to user
        const existingPreset = await queryOne(`
            SELECT id, name FROM export_presets 
            WHERE id = ? AND user_id = ?
        `, [id, session.userId]);

        if (!existingPreset) {
            return Response.json({
                error: 'Preset not found or access denied'
            }, { status: 404 });
        }

        // Delete preset
        await executeQuery(`
            DELETE FROM export_presets 
            WHERE id = ? AND user_id = ?
        `, [id, session.userId]);

        // Log audit trail
        await executeQuery(`
            INSERT INTO audit_log (
                user_id, action, resource_type, resource_id, details, 
                ip_address, user_agent, created_at
            ) VALUES (?, 'preset_deleted', 'export_preset', ?, ?, ?, ?, NOW())
        `, [
            session.userId,
            id,
            JSON.stringify({
                name: existingPreset.name
            }),
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
            request.headers.get('user-agent') || 'unknown'
        ]);

        return Response.json({
            success: true,
            message: 'Preset deleted successfully'
        });

    } catch (error) {
        console.error('Delete preset error:', error);
        return Response.json(
            { error: 'Failed to delete preset' },
            { status: 500 }
        );
    }
}