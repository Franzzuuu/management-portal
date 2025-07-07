// src/app/api/admin/violation-history/route.js
import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        console.log('Violation history API called');

        const session = await getSession();
        if (!session || !['Admin', 'Staff'].includes(session.userRole)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 15;
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        console.log('Violation history API called with params:', { page, limit, search, offset });

        // Start with simple query without parameters
        let query;
        let queryParams = [];

        if (!search || search.trim() === '') {
            // Simple query without parameters first
            query = `
                SELECT 
                    u.id as user_id,
                    u.email,
                    up.full_name,
                    u.designation,
                    u.violation_count,
                    u.violation_count as total_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'pending' THEN v.id END) as pending_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'resolved' THEN v.id END) as resolved_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'contested' THEN v.id END) as contested_violations,
                    MAX(v.created_at) as latest_violation_date
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN vehicles ve ON u.id = ve.user_id
                LEFT JOIN violations v ON ve.id = v.vehicle_id
                WHERE u.status = 'active' AND u.violation_count > 0
                GROUP BY u.id, u.email, up.full_name, u.designation, u.violation_count
                ORDER BY u.violation_count DESC, latest_violation_date DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
            queryParams = [];
        } else {
            // Query with search parameters
            query = `
                SELECT 
                    u.id as user_id,
                    u.email,
                    up.full_name,
                    u.designation,
                    u.violation_count,
                    u.violation_count as total_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'pending' THEN v.id END) as pending_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'resolved' THEN v.id END) as resolved_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'contested' THEN v.id END) as contested_violations,
                    MAX(v.created_at) as latest_violation_date
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN vehicles ve ON u.id = ve.user_id
                LEFT JOIN violations v ON ve.id = v.vehicle_id
                WHERE u.status = 'active' AND u.violation_count > 0
                AND (u.email LIKE ? OR up.full_name LIKE ? OR u.designation LIKE ?)
                GROUP BY u.id, u.email, up.full_name, u.designation, u.violation_count
                ORDER BY u.violation_count DESC, latest_violation_date DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
            const searchParam = `%${search.trim()}%`;
            queryParams = [searchParam, searchParam, searchParam];
        }

        console.log('History query parameters:', queryParams);
        console.log('Executing violation history query...');

        const violationHistory = await executeQuery(query, queryParams);

        // Simple count query
        const countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.status = 'active' AND u.violation_count > 0
        `;

        const countResult = await executeQuery(countQuery, []);
        const total = countResult[0].total;

        const response = {
            success: true,
            data: violationHistory,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };

        console.log(`Retrieved ${violationHistory.length} violation history records`);
        return Response.json(response);

    } catch (error) {
        console.error('Violation history API error:', error);
        return Response.json(
            {
                error: 'Failed to fetch violation history',
                details: error.message
            },
            { status: 500 }
        );
    }
}