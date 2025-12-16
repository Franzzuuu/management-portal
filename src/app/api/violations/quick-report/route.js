import { queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';
import { getUserByPin } from '@/lib/pin-utils';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/**
 * POST /api/violations/quick-report
 * 
 * Quick violation reporting for security handheld devices.
 * Accepts tag_uid, violation_type_id, and a photo.
 * Supports TWO authentication methods:
 *   1. Session-based (web app)
 *   2. PIN-based (handheld device)
 * Automatically populates all violation record fields.
 */
export async function POST(request) {
    try {
        // 1. Parse multipart form data first (to check for PIN)
        const formData = await request.formData();
        const pin = formData.get('pin'); // Optional - for handheld device auth
        const tag_uid = formData.get('tag_uid');
        const violation_type_id = formData.get('violation_type_id');
        const photo = formData.get('photo');
        const location = formData.get('location'); // Optional

        let authenticatedUser = null;

        // 2. Determine authentication method
        if (pin) {
            // PIN-based authentication (handheld device)
            const user = await getUserByPin(pin);
            
            if (!user) {
                return Response.json({ 
                    error: 'Invalid PIN. Please check your 4-digit PIN and try again.' 
                }, { status: 401 });
            }

            // Ensure user is Admin or Security
            if (!['Admin', 'Security'].includes(user.designation)) {
                return Response.json({ 
                    error: 'Access denied. Only Admin and Security users can report violations.' 
                }, { status: 403 });
            }

            authenticatedUser = {
                userId: user.id,
                uscId: user.usc_id,
                role: user.designation
            };
        } else {
            // Session-based authentication (web app)
            const session = await getSession();
            
            if (!session) {
                return Response.json({ 
                    error: 'Unauthorized. Please provide a PIN or valid session.' 
                }, { status: 401 });
            }

            // Role-based authorization - only Security and Admin can report violations
            if (!['Security', 'Admin'].includes(session.userRole)) {
                return Response.json({ 
                    error: 'Insufficient permissions. Only Security and Admin users can report violations.' 
                }, { status: 403 });
            }

            // Get user ID from session
            const userResult = await queryOne('SELECT id, usc_id FROM users WHERE usc_id = ?', [session.uscId]);
            
            if (!userResult) {
                return Response.json({ 
                    error: 'User not found in database.' 
                }, { status: 401 });
            }

            authenticatedUser = {
                userId: userResult.id,
                uscId: userResult.usc_id,
                role: session.userRole
            };
        }

        // 3. Validate required fields
        if (!tag_uid || !violation_type_id || !photo) {
            return Response.json({
                error: 'Missing required fields',
                details: {
                    tag_uid: !tag_uid ? 'required' : 'provided',
                    violation_type_id: !violation_type_id ? 'required' : 'provided',
                    photo: !photo ? 'required' : 'provided'
                }
            }, { status: 400 });
        }

        // 4. Validate photo is a file
        if (!(photo instanceof File)) {
            return Response.json({
                error: 'Photo must be a file upload'
            }, { status: 400 });
        }

        // 6. Validate photo MIME type
        if (!ALLOWED_MIME_TYPES.includes(photo.type)) {
            return Response.json({
                error: 'Invalid image format',
                details: `Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed`
            }, { status: 400 });
        }

        // 7. Validate photo size
        if (photo.size > MAX_FILE_SIZE) {
            return Response.json({
                error: 'File too large',
                details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            }, { status: 413 });
        }

        // 8. Sanitize and validate tag_uid (prevent SQL injection)
        const sanitizedTagUid = tag_uid.toString().trim();
        if (sanitizedTagUid.length === 0 || sanitizedTagUid.length > 100) {
            return Response.json({
                error: 'Invalid tag_uid format',
                details: 'tag_uid must be between 1 and 100 characters'
            }, { status: 400 });
        }

        // 9. Validate violation_type_id is a valid integer
        const violationTypeId = parseInt(violation_type_id, 10);
        if (isNaN(violationTypeId) || violationTypeId <= 0) {
            return Response.json({
                error: 'Invalid violation_type_id',
                details: 'violation_type_id must be a positive integer'
            }, { status: 400 });
        }

        // 10. Verify violation type exists
        const violationType = await queryOne(
            'SELECT id, name FROM violation_types WHERE id = ?',
            [violationTypeId]
        );

        if (!violationType) {
            return Response.json({
                error: 'Invalid violation type',
                details: `Violation type with id ${violationTypeId} does not exist`
            }, { status: 400 });
        }

        // 11. Convert photo to buffer
        const photoBuffer = Buffer.from(await photo.arrayBuffer());

        // 12. Use authenticated user information (already validated)
        const reporterId = authenticatedUser.userId;
        const reporterUscId = authenticatedUser.uscId;

        // 13. Lookup vehicle by tag_uid
        let vehicle = null;
        let vehicle_id = null;
        
        try {
            vehicle = await queryOne(`
                SELECT 
                    v.vehicle_id,
                    v.plate_number,
                    v.make,
                    v.model,
                    v.usc_id as owner_usc_id
                FROM rfid_tags rt
                INNER JOIN vehicles v ON rt.vehicle_id = v.vehicle_id
                WHERE rt.tag_uid = ? AND rt.status = 'active'
            `, [sanitizedTagUid]);

            if (vehicle) {
                vehicle_id = vehicle.vehicle_id;
            }
        } catch (lookupError) {
            console.warn('Vehicle lookup by tag_uid failed:', lookupError);
            // Continue without vehicle_id (will be NULL)
        }

        // 14. Build violation description
        const description = vehicle
            ? `Reported via handheld - tag_uid: ${sanitizedTagUid}, vehicle: ${vehicle.plate_number}`
            : `Reported via handheld - tag_uid: ${sanitizedTagUid} (vehicle not found)`;

        // 15. Prepare violation record with all required fields
        const violationData = {
            vehicle_id: vehicle_id,
            violation_type_id: violationTypeId,
            description: description,
            location: location ? location.toString().trim() : null,
            reported_by: reporterId,  // Use authenticated user ID
            status: 'pending',
            contest_status: null,
            contest_explanation: null,
            image_data: photoBuffer,
            image_filename: photo.name,
            image_mime_type: photo.type
        };

        // 16. Insert violation record in a transaction
        const insertQuery = `
            INSERT INTO violations (
                vehicle_id,
                violation_type_id,
                description,
                location,
                reported_by,
                status,
                contest_status,
                contest_explanation,
                image_data,
                image_filename,
                image_mime_type,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const result = await executeQuery(insertQuery, [
            violationData.vehicle_id,
            violationData.violation_type_id,
            violationData.description,
            violationData.location,
            violationData.reported_by,
            violationData.status,
            violationData.contest_status,
            violationData.contest_explanation,
            violationData.image_data,
            violationData.image_filename,
            violationData.image_mime_type
        ]);

        const violationId = result.insertId;

        // 17. Fetch the created violation record (without BLOB data for response)
        const createdViolation = await queryOne(`
            SELECT 
                v.id,
                v.vehicle_id,
                v.violation_type_id,
                vt.name as violation_type_name,
                v.description,
                v.location,
                v.reported_by,
                v.status,
                v.contest_status,
                v.created_at,
                v.updated_at,
                v.image_filename,
                v.image_mime_type,
                u.usc_id as reporter_usc_id,
                up.full_name as reporter_name,
                vh.plate_number as vehicle_plate,
                vh.make as vehicle_make,
                vh.model as vehicle_model
            FROM violations v
            INNER JOIN violation_types vt ON v.violation_type_id = vt.id
            INNER JOIN users u ON v.reported_by = u.id
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            LEFT JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
            WHERE v.id = ?
        `, [violationId]);

        // 18. Emit real-time update for dashboard
        try {
            emit('violations', 'create', {
                violation: createdViolation,
                reportedBy: reporterUscId,  // Use authenticated user USC ID
                timestamp: new Date().toISOString()
            });
        } catch (emitError) {
            console.warn('Failed to emit real-time update:', emitError);
            // Don't fail the request if real-time update fails
        }

        // 19. Create notification for vehicle owner (if vehicle found)
        if (vehicle_id && vehicle?.owner_usc_id) {
            try {
                const ownerUser = await queryOne(
                    'SELECT id FROM users WHERE usc_id = ?',
                    [vehicle.owner_usc_id]
                );

                if (ownerUser) {
                    await executeQuery(`
                        INSERT INTO notifications (
                            user_id,
                            type,
                            title,
                            message,
                            related_id,
                            created_at
                        ) VALUES (?, ?, ?, ?, ?, NOW())
                    `, [
                        ownerUser.id,
                        'violation_issued',
                        'New Violation Issued',
                        `A ${violationType.name} violation has been issued for your vehicle ${vehicle.plate_number}`,
                        violationId
                    ]);
                }
            } catch (notificationError) {
                console.warn('Failed to create notification:', notificationError);
                // Don't fail the request if notification fails
            }
        }

        // 20. Return success response
        return Response.json({
            success: true,
            message: 'Violation reported successfully',
            violation: {
                id: createdViolation.id,
                vehicle_id: createdViolation.vehicle_id,
                vehicle_info: vehicle_id ? {
                    plate_number: createdViolation.vehicle_plate,
                    make: createdViolation.vehicle_make,
                    model: createdViolation.vehicle_model
                } : null,
                violation_type_id: createdViolation.violation_type_id,
                violation_type_name: createdViolation.violation_type_name,
                description: createdViolation.description,
                location: createdViolation.location,
                reported_by: createdViolation.reported_by,
                reporter_usc_id: createdViolation.reporter_usc_id,
                reporter_name: createdViolation.reporter_name,
                status: createdViolation.status,
                contest_status: createdViolation.contest_status,
                created_at: createdViolation.created_at,
                updated_at: createdViolation.updated_at,
                image_filename: createdViolation.image_filename,
                image_mime_type: createdViolation.image_mime_type,
                image_url: `/api/violations/${createdViolation.id}/image`
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Quick report violation error:', error);
        return Response.json({
            error: 'Failed to report violation',
            details: error.message
        }, { status: 500 });
    }
}
