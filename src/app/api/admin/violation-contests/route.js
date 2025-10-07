import { queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is an Admin user
        if (session.userRole !== 'Admin') {
            return Response.json({ error: 'Access denied. Admins only.' }, { status: 403 });
        }

        const url = new URL(request.url);
        const status = url.searchParams.get('status') || 'pending';

        let whereClause = '';
        let params = [];

        if (status === 'all') {
            // Show all contests
            whereClause = '';
        } else if (status === 'active') {
            // Show only active appeals (pending and under_review)
            whereClause = 'WHERE vc.contest_status IN (?, ?)';
            params.push('pending', 'under_review');
        } else {
            // Show specific status
            whereClause = 'WHERE vc.contest_status = ?';
            params.push(status);
        }

        // Fetch violation contests with full details
        const contests = await queryMany(`
            SELECT 
                vc.id as contest_id,
                vc.violation_id,
                vc.contest_notes,
                vc.contest_status,
                vc.created_at as contest_created_at,
                vc.reviewed_at,
                vc.review_notes,
                v.id as violation_id,
                v.status as violation_status,
                v.created_at as violation_created_at,
                v.description as violation_description,
                v.image_data as violation_image,
                v.image_mime_type as violation_image_mime,
                vt.name as violation_type,
                vt.description as violation_type_description,
                ve.plate_number,
                ve.make as vehicle_make,
                ve.model as vehicle_model,
                ve.color as vehicle_color,
                CONCAT(ve.make, ' ', ve.model, ' (', ve.plate_number, ')') as vehicle_info,
                u.email,
                u.usc_id,
                u.designation,
                up.full_name as user_name,
                reviewer.email as reviewed_by_email
            FROM violation_contests vc
            JOIN violations v ON vc.violation_id = v.id
            JOIN users u ON vc.user_id = u.id
            LEFT JOIN user_profiles up ON u.email = up.email
            JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
            JOIN violation_types vt ON v.violation_type_id = vt.id
            LEFT JOIN users reviewer ON vc.reviewed_by = reviewer.id
            ${whereClause}
            ORDER BY vc.created_at DESC
        `, params);

        // Fetch evidence files for each contest
        for (const contest of contests) {
            const evidenceFiles = await queryMany(`
                SELECT 
                    id,
                    filename,
                    mime_type,
                    file_data,
                    uploaded_at
                FROM violation_evidence 
                WHERE violation_id = ?
                ORDER BY uploaded_at ASC
            `, [contest.violation_id]);

            // Convert evidence file data to base64
            contest.evidence_files = evidenceFiles.map(file => ({
                id: file.id,
                filename: file.filename,
                mime_type: file.mime_type,
                file_data: file.file_data ? Buffer.from(file.file_data).toString('base64') : null,
                uploaded_at: file.uploaded_at
            }));
        }

        // Get statistics
        const stats = await queryMany(`
            SELECT 
                contest_status,
                COUNT(*) as count
            FROM violation_contests
            GROUP BY contest_status
        `);

        const statsMap = stats.reduce((acc, stat) => {
            acc[stat.contest_status] = stat.count;
            return acc;
        }, {});

        // Convert image data to base64 for frontend consumption
        const processedContests = contests.map(contest => ({
            ...contest,
            violation_image: contest.violation_image ? Buffer.from(contest.violation_image).toString('base64') : null
        }));

        return Response.json({
            success: true,
            contests: processedContests || [],
            stats: {
                pending: statsMap.pending || 0,
                under_review: statsMap.under_review || 0,
                approved: statsMap.approved || 0,
                denied: statsMap.denied || 0,
                total: processedContests?.length || 0
            }
        });

    } catch (error) {
        console.error('Admin violation contests API error:', error);
        return Response.json(
            { error: 'Failed to fetch violation contests' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is an Admin user
        if (session.userRole !== 'Admin') {
            return Response.json({ error: 'Access denied. Admins only.' }, { status: 403 });
        }

        const { contestId, action, reviewNotes } = await request.json();

        console.log('Processing appeal action:', { contestId, action, reviewNotes, uscId: session.uscId });

        if (!contestId || !action || !['approve', 'deny', 'under_review'].includes(action)) {
            console.error('Invalid parameters:', { contestId, action });
            return Response.json({
                error: 'Contest ID and valid action (approve, deny, under_review) are required'
            }, { status: 400 });
        }

        // Get the admin user's database ID from their uscId
        const adminUser = await queryMany(`
            SELECT id FROM users WHERE usc_id = ?
        `, [session.uscId]);

        if (!adminUser.length) {
            console.error('Admin user not found:', session.uscId);
            return Response.json({
                error: 'Admin user not found'
            }, { status: 404 });
        }

        const adminUserId = adminUser[0].id;

        // Get contest details
        console.log('Fetching contest details for ID:', contestId);
        const contest = await queryMany(`
            SELECT vc.*, v.status as violation_status
            FROM violation_contests vc
            JOIN violations v ON vc.violation_id = v.id
            WHERE vc.id = ?
        `, [contestId]);

        if (!contest.length) {
            console.error('Contest not found:', contestId);
            return Response.json({
                error: 'Contest not found'
            }, { status: 404 });
        }

        const contestData = contest[0];
        console.log('Contest data found:', contestData);

        // Update contest status
        const contestStatus = action === 'approve' ? 'approved' :
            action === 'deny' ? 'denied' : 'under_review';

        console.log('Updating contest status:', { contestStatus, adminUserId, reviewNotes, contestId });
        await executeQuery(`
            UPDATE violation_contests 
            SET 
                contest_status = ?,
                reviewed_by = ?,
                review_notes = ?,
                reviewed_at = NOW()
            WHERE id = ?
        `, [contestStatus, adminUserId, reviewNotes || null, contestId]);

        // Update violation status based on the decision
        let newViolationStatus = contestData.violation_status;
        if (action === 'approve') {
            newViolationStatus = 'resolved'; // Appeal approved - violation dismissed
        } else if (action === 'deny') {
            newViolationStatus = 'resolved'; // Appeal denied - violation stands but is resolved
        }
        // under_review keeps violation as 'contested'

        console.log('Updating violation status:', { newViolationStatus, violationId: contestData.violation_id });
        await executeQuery(`
            UPDATE violations 
            SET status = ?
            WHERE id = ?
        `, [newViolationStatus, contestData.violation_id]);

        // Create notification for the user
        try {
            let notificationMessage = '';
            switch (action) {
                case 'approve':
                    notificationMessage = `Your violation appeal for violation #${contestData.violation_id} has been approved. The violation has been resolved.`;
                    break;
                case 'deny':
                    notificationMessage = `Your violation appeal for violation #${contestData.violation_id} has been denied. ${reviewNotes ? 'Reason: ' + reviewNotes : 'The violation stands as recorded.'} No further action is required.`;
                    break;
                case 'under_review':
                    notificationMessage = `Your violation appeal for violation #${contestData.violation_id} is now under review.`;
                    break;
            }

            // Check if notifications table exists before inserting
            try {
                await executeQuery(`
                    INSERT INTO notifications (
                        user_id,
                        title,
                        message,
                        type,
                        created_at
                    ) VALUES (?, ?, ?, ?, NOW())
                `, [
                    contestData.user_id,
                    'Violation Appeal Update',
                    notificationMessage,
                    'violation_appeal_update'
                ]);
            } catch (notificationError) {
                console.warn('Failed to create notification (table may not exist):', notificationError);
                // Don't fail the main operation if notification fails
            }
        } catch (notificationError) {
            console.warn('Failed to prepare notification:', notificationError);
        }

        console.log('Appeal action completed successfully:', { action, contestId });
        return Response.json({
            success: true,
            message: `Contest ${action}ed successfully`,
            action: action,
            contestId: contestId
        });

    } catch (error) {
        console.error('Admin violation contest action error:', error);
        return Response.json(
            { error: 'Failed to process contest action' },
            { status: 500 }
        );
    }
}