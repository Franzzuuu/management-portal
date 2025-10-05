import { queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied. Students and Faculty only.' }, { status: 403 });
        }

        const formData = await request.formData();
        const violationId = formData.get('violationId');
        const explanation = formData.get('explanation');

        if (!violationId || !explanation?.trim()) {
            return Response.json({
                error: 'Violation ID and explanation are required'
            }, { status: 400 });
        }

        // Verify the violation belongs to the user
        const violation = await queryOne(`
            SELECT v.id, v.status, v.contest_status, u.id as user_id
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
            JOIN users u ON ve.usc_id = u.usc_id
            WHERE v.id = ? AND u.usc_id = ?
        `, [violationId, session.uscId]);

        if (!violation) {
            return Response.json({
                error: 'Violation not found or access denied'
            }, { status: 404 });
        }

        // Check if violation can be contested
        if (violation.status !== 'pending') {
            return Response.json({
                error: 'Only pending violations can be contested'
            }, { status: 400 });
        }

        if (violation.contest_status) {
            return Response.json({
                error: 'This violation has already been contested'
            }, { status: 400 });
        }

        // Process evidence files (if any)
        const evidenceFiles = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('evidence_') && value instanceof File) {
                if (evidenceFiles.length >= 5) break; // Limit to 5 files

                const fileBuffer = await value.arrayBuffer();
                evidenceFiles.push({
                    filename: value.name,
                    mime_type: value.type,
                    data: Buffer.from(fileBuffer)
                });
            }
        }

        // Insert the contest into violation_contests table
        const contestResult = await executeQuery(`
            INSERT INTO violation_contests (
                violation_id,
                user_id,
                contest_notes,
                contest_status,
                created_at
            ) VALUES (?, ?, ?, 'pending', NOW())
        `, [violationId, violation.user_id, explanation]);

        // Update violation status to 'contested' and add contest information
        await executeQuery(`
            UPDATE violations 
            SET 
                status = 'contested',
                contest_status = 'pending',
                contest_explanation = ?,
                contest_submitted_at = NOW()
            WHERE id = ?
        `, [explanation, violationId]);

        // Store evidence files in a separate table (if any)
        if (evidenceFiles.length > 0) {
            for (const file of evidenceFiles) {
                await executeQuery(`
                    INSERT INTO violation_evidence (
                        violation_id,
                        filename,
                        mime_type,
                        file_data,
                        uploaded_at
                    ) VALUES (?, ?, ?, ?, NOW())
                `, [violationId, file.filename, file.mime_type, file.data]);
            }
        }

        // Create notification for admins (optional)
        try {
            await executeQuery(`
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    created_at
                ) 
                SELECT 
                    u.id,
                    'New Violation Appeal',
                    ?,
                    'violation_contested',
                    NOW()
                FROM users u 
                WHERE u.designation = 'Admin'
            `, [
                `A new violation appeal has been submitted by ${session.username} for violation #${violationId}. Contest ID: ${contestResult.insertId}`
            ]);
        } catch (notificationError) {
            console.warn('Failed to create notification:', notificationError);
            // Don't fail the main operation if notification fails
        }

        return Response.json({
            success: true,
            message: 'Appeal submitted successfully',
            contestId: contestResult.insertId,
            violationId: violationId
        });

    } catch (error) {
        console.error('Contest violation API error:', error);
        return Response.json(
            { error: 'Failed to submit appeal' },
            { status: 500 }
        );
    }
}