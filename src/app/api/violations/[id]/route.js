export async function GET(request, { params }) {
    try {
        const session = await getSession();
        if (!session || !['Admin', 'Security'].includes(session.userRole)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const violationId = params.id;

        const violation = await queryOne(`
            SELECT 
                vl.*,
                up.full_name as studentName,
                u.student_id as studentId,
                up.contact_number as contactNumber,
                up.email,
                v.plate_number as plateNumber,
                v.vehicle_type as vehicleType,
                v.vehicle_make as vehicleMake,
                v.vehicle_model as vehicleModel,
                v.vehicle_color as vehicleColor
            FROM violations vl
            JOIN vehicles v ON vl.vehicle_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE vl.id = ?
        `, [violationId]);

        if (!violation) {
            return NextResponse.json(
                { error: 'Violation not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(violation);

    } catch (error) {
        console.error('Error fetching violation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch violation' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || !['Admin', 'Security'].includes(session.userRole)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const violationId = params.id;
        const body = await request.json();
        const {
            status,
            severity,
            description,
            fineAmount,
            resolvedAt
        } = body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);

            // Auto-set resolved_at when status changes to resolved
            if (status === 'resolved' && !resolvedAt) {
                updates.push('resolved_at = NOW()');
            }
        }

        if (severity !== undefined) {
            updates.push('severity = ?');
            values.push(severity);
        }

        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (fineAmount !== undefined) {
            updates.push('fine_amount = ?');
            values.push(fineAmount);
        }

        if (resolvedAt !== undefined) {
            updates.push('resolved_at = ?');
            values.push(resolvedAt);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        updates.push('updated_at = NOW()');
        values.push(violationId);

        const updateQuery = `
            UPDATE violations 
            SET ${updates.join(', ')}
            WHERE id = ?
        `;

        await executeQuery(updateQuery, values);

        // Return updated violation
        const updatedViolation = await queryOne(`
            SELECT 
                vl.*,
                up.full_name as studentName,
                u.student_id as studentId,
                v.plate_number as plateNumber,
                v.vehicle_type as vehicleType
            FROM violations vl
            JOIN vehicles v ON vl.vehicle_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE vl.id = ?
        `, [violationId]);

        return NextResponse.json(updatedViolation);

    } catch (error) {
        console.error('Error updating violation:', error);
        return NextResponse.json(
            { error: 'Failed to update violation' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const violationId = params.id;

        // Check if violation exists
        const violation = await queryOne(
            'SELECT id FROM violations WHERE id = ?',
            [violationId]
        );

        if (!violation) {
            return NextResponse.json(
                { error: 'Violation not found' },
                { status: 404 }
            );
        }

        // Delete the violation
        await executeQuery(
            'DELETE FROM violations WHERE id = ?',
            [violationId]
        );

        return NextResponse.json({ message: 'Violation deleted successfully' });

    } catch (error) {
        console.error('Error deleting violation:', error);
        return NextResponse.json(
            { error: 'Failed to delete violation' },
            { status: 500 }
        );
    }
}