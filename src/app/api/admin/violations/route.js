// src/app/api/admin/violations/route.js
import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        console.log('Getting violations...');

        // Check authentication
        const session = await getSession();
        if (!session || !['Admin', 'Staff'].includes(session.userRole)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const offset = (page - 1) * limit;

        console.log('API called with params:', { page, limit, search, status, offset });

        // Start with a simple query first to test
        let query;
        let queryParams = [];

        if (status === 'all' && !search) {
            // Simplest possible query first
            query = `
                SELECT 
                    v.id,
                    v.vehicle_id,
                    v.violation_type_id,
                    v.description,
                    v.reported_by,
                    v.status,
                    v.created_at,
                    v.updated_at,
                    v.image_filename,
                    v.image_mime_type,
                    vt.name as violation_type_name,
                    vt.description as violation_type_description,
                    ve.plate_number,
                    ve.make,
                    ve.model,
                    ve.color,
                    u.email as owner_email,
                    up.full_name as owner_name,
                    u.designation as owner_designation,
                    reporter.email as reported_by_email,
                    up_reporter.full_name as reported_by_name
                FROM violations v
                JOIN violation_types vt ON v.violation_type_id = vt.id
                JOIN vehicles ve ON v.vehicle_id = ve.id
                JOIN users u ON ve.user_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                JOIN users reporter ON v.reported_by = reporter.id
                JOIN user_profiles up_reporter ON reporter.id = up_reporter.user_id
                ORDER BY v.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
            queryParams = [];
        } else {
            // More complex query with parameters
            let whereConditions = ['1=1'];

            if (search && search.trim() !== '') {
                whereConditions.push(`(
                    ve.plate_number LIKE ? OR 
                    up.full_name LIKE ? OR 
                    vt.name LIKE ? OR 
                    v.description LIKE ?
                )`);
                const searchParam = `%${search.trim()}%`;
                queryParams.push(searchParam, searchParam, searchParam, searchParam);
            }

            if (status !== 'all') {
                whereConditions.push('v.status = ?');
                queryParams.push(status);
            }

            const whereClause = whereConditions.join(' AND ');

            query = `
                SELECT 
                    v.id,
                    v.vehicle_id,
                    v.violation_type_id,
                    v.description,
                    v.reported_by,
                    v.status,
                    v.created_at,
                    v.updated_at,
                    v.image_filename,
                    v.image_mime_type,
                    vt.name as violation_type_name,
                    vt.description as violation_type_description,
                    ve.plate_number,
                    ve.make,
                    ve.model,
                    ve.color,
                    u.email as owner_email,
                    up.full_name as owner_name,
                    u.designation as owner_designation,
                    reporter.email as reported_by_email,
                    up_reporter.full_name as reported_by_name
                FROM violations v
                JOIN violation_types vt ON v.violation_type_id = vt.id
                JOIN vehicles ve ON v.vehicle_id = ve.id
                JOIN users u ON ve.user_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                JOIN users reporter ON v.reported_by = reporter.id
                JOIN user_profiles up_reporter ON reporter.id = up_reporter.user_id
                WHERE ${whereClause}
                ORDER BY v.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        }

        console.log('Executing query with params:', queryParams);
        const violations = await executeQuery(query, queryParams);

        // Simple count query
        const countQuery = `SELECT COUNT(*) as total FROM violations`;
        const countResult = await executeQuery(countQuery, []);
        const total = countResult[0].total;

        const response = {
            success: true,
            data: violations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

        console.log(`Retrieved ${violations.length} violations successfully`);
        return Response.json(response);

    } catch (error) {
        console.error('Get violations error:', error);
        return Response.json(
            {
                error: 'Failed to fetch violations',
                details: error.message
            },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        const session = await getSession();
        if (!session || !['Admin', 'Staff'].includes(session.userRole)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, status, resolution_notes } = await request.json();

        if (!id || !status || !['pending', 'resolved', 'contested'].includes(status)) {
            return Response.json(
                { error: 'Valid violation ID and status are required' },
                { status: 400 }
            );
        }

        const updateQuery = `UPDATE violations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        await executeQuery(updateQuery, [status]);

        return Response.json({
            success: true,
            message: 'Violation status updated successfully'
        });

    } catch (error) {
        console.error('Update violation error:', error);
        return Response.json(
            { error: 'Failed to update violation status' },
            { status: 500 }
        );
    }
}