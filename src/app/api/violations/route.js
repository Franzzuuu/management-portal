// src/app/api/violations/route.js
import { NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/database';

export async function GET(request) {
    try {
        console.log('Fetching violations from database...');

        // Get query parameters for filtering
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const limit = parseInt(searchParams.get('limit')) || 100;
        const offset = parseInt(searchParams.get('offset')) || 0;

        // Build WHERE clause for filtering
        let whereConditions = [];
        let queryParams = [];

        if (search) {
            whereConditions.push(`(
                up.full_name LIKE ? OR 
                v.plate_number LIKE ? OR 
                vl.violation_type LIKE ? OR 
                vl.description LIKE ?
            )`);
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (status && status !== 'all') {
            whereConditions.push('vl.status = ?');
            queryParams.push(status);
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get violations with related data
        const violationsQuery = `
            SELECT 
                vl.id,
                vl.vehicle_id,
                vl.violation_type,
                vl.description,
                vl.status,
                vl.severity,
                vl.location,
                vl.fine_amount,
                vl.image_path,
                vl.created_at,
                vl.resolved_at,
                COALESCE(up.full_name, 'Unknown') as studentName,
                COALESCE(u.student_id, 'N/A') as studentId,
                COALESCE(v.plate_number, 'N/A') as plateNumber,
                COALESCE(v.vehicle_type, 'Unknown') as vehicleType,
                COALESCE(v.vehicle_make, '') as vehicleMake,
                COALESCE(v.vehicle_model, '') as vehicleModel,
                COALESCE(v.vehicle_color, '') as vehicleColor
            FROM violations vl
            LEFT JOIN vehicles v ON vl.vehicle_id = v.id
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            ${whereClause}
            ORDER BY vl.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const violations = await queryMany(violationsQuery, [...queryParams, limit, offset]);
        console.log(`Found ${violations.length} violations`);

        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN vl.status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN vl.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN vl.status = 'disputed' THEN 1 ELSE 0 END) as disputed
            FROM violations vl
            LEFT JOIN vehicles v ON vl.vehicle_id = v.id
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            ${whereClause}
        `;

        const statsResult = await queryOne(statsQuery, queryParams);
        const stats = {
            total: parseInt(statsResult.total) || 0,
            pending: parseInt(statsResult.pending) || 0,
            resolved: parseInt(statsResult.resolved) || 0,
            disputed: parseInt(statsResult.disputed) || 0
        };

        console.log('Statistics:', stats);

        return NextResponse.json({
            violations: violations,
            stats: stats,
            pagination: {
                limit,
                offset,
                total: stats.total
            }
        });

    } catch (error) {
        console.error('Error fetching violations from database:', error);

        // Return more detailed error information for debugging
        return NextResponse.json(
            {
                error: 'Failed to fetch violations',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        console.log('Creating new violation:', body);

        const {
            vehicle_id,
            violation_type,
            description,
            severity = 'medium',
            location,
            fine_amount = 0,
            image_path = null
        } = body;

        // Validate required fields
        if (!vehicle_id || !violation_type || !description) {
            return NextResponse.json(
                { error: 'Missing required fields: vehicle_id, violation_type, description' },
                { status: 400 }
            );
        }

        // Check if vehicle exists
        const vehicle = await queryOne(
            'SELECT id FROM vehicles WHERE id = ?',
            [vehicle_id]
        );

        if (!vehicle) {
            return NextResponse.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        // Insert new violation
        const insertQuery = `
            INSERT INTO violations (
                vehicle_id, violation_type, description, severity, 
                location, fine_amount, image_path, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `;

        const result = await queryOne(insertQuery, [
            vehicle_id,
            violation_type,
            description,
            severity,
            location,
            fine_amount,
            image_path
        ]);

        // Get the created violation with related data
        const newViolation = await queryOne(`
            SELECT 
                vl.*,
                up.full_name as studentName,
                u.student_id as studentId,
                v.plate_number as plateNumber,
                v.vehicle_type as vehicleType
            FROM violations vl
            LEFT JOIN vehicles v ON vl.vehicle_id = v.id
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE vl.id = ?
        `, [result.insertId]);

        console.log('Created violation:', newViolation);

        return NextResponse.json(newViolation, { status: 201 });

    } catch (error) {
        console.error('Error creating violation:', error);
        return NextResponse.json(
            { error: 'Failed to create violation', details: error.message },
            { status: 500 }
        );
    }
}