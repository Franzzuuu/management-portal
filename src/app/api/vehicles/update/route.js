import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { emit } from '@/lib/realtime';

export async function PUT(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vehicleData = await request.json();

        // Log received data for debugging
        console.log('Received vehicle update data:', vehicleData);

        // Extract and validate required fields
        const { vehicleId, vehicleType, make, model, color, plateNumber, year, stickerStatus, stickerRejectionReason } = vehicleData;

        if (!vehicleId) {
            return Response.json(
                { error: 'Vehicle ID is required' },
                { status: 400 }
            );
        }

        // Check if vehicle exists
        const existingVehicle = await executeQuery(
            'SELECT * FROM vehicles WHERE vehicle_id = ?',
            [vehicleId]
        );

        if (existingVehicle.length === 0) {
            return Response.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            );
        }

        // Prepare update fields
        const updateFields = [];
        const updateValues = [];

        if (vehicleType !== undefined) {
            updateFields.push('vehicle_type = ?');
            updateValues.push(vehicleType);
        }

        if (make !== undefined) {
            updateFields.push('make = ?');
            updateValues.push(make);
        }

        if (model !== undefined) {
            updateFields.push('model = ?');
            updateValues.push(model);
        }

        if (color !== undefined) {
            updateFields.push('color = ?');
            updateValues.push(color);
        }

        if (plateNumber !== undefined) {
            // Check if the new plate number already exists (if it's changing)
            if (plateNumber !== existingVehicle[0].plate_number) {
                const duplicatePlate = await executeQuery(
                    'SELECT vehicle_id FROM vehicles WHERE plate_number = ? AND vehicle_id != ?',
                    [plateNumber, vehicleId]
                );

                if (duplicatePlate.length > 0) {
                    return Response.json(
                        { error: 'A vehicle with this plate number already exists' },
                        { status: 409 }
                    );
                }
            }

            updateFields.push('plate_number = ?');
            updateValues.push(plateNumber);
        }

        if (year !== undefined) {
            // Validate year if provided
            if (year !== null) {
                const yearValue = parseInt(year, 10);
                const currentYear = new Date().getFullYear();

                if (isNaN(yearValue) || yearValue < 1900 || yearValue > currentYear + 1) {
                    return Response.json(
                        { error: `Invalid year. Must be a 4-digit year between 1900 and ${currentYear + 1}` },
                        { status: 400 }
                    );
                }

                updateFields.push('year = ?');
                updateValues.push(yearValue);
            } else {
                // Handle explicit null case (shouldn't happen with new requirements but just in case)
                updateFields.push('year = NULL');
            }
        }

        if (stickerStatus !== undefined) {
            // Validate sticker status value
            const validStatuses = ['renewed', 'expired', 'pending', 'renewal_requested'];
            if (!validStatuses.includes(stickerStatus)) {
                return Response.json(
                    { error: 'Invalid sticker status. Must be renewed, expired, pending, or renewal_requested.' },
                    { status: 400 }
                );
            }
            updateFields.push('sticker_status = ?');
            updateValues.push(stickerStatus);
        }

        // Handle sticker rejection reason (used when rejecting renewal requests)
        if (stickerRejectionReason !== undefined) {
            updateFields.push('sticker_rejection_reason = ?');
            updateValues.push(stickerRejectionReason || null);
        }

        // If no fields to update
        if (updateFields.length === 0) {
            return Response.json({
                success: true,
                message: 'No changes to update'
            });
        }

        // Add updated_at timestamp and vehicle_id condition
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        const query = `UPDATE vehicles SET ${updateFields.join(', ')} WHERE vehicle_id = ?`;
        updateValues.push(vehicleId);

        console.log('Update query:', query);
        console.log('Update values:', updateValues);

        const result = await executeQuery(query, updateValues);

        // Emit real-time update and create notification if sticker status was changed
        if (stickerStatus !== undefined && stickerStatus !== existingVehicle[0].sticker_status) {
            emit('vehicles:sticker_update', {
                vehicleId,
                stickerStatus,
                ownerId: existingVehicle[0].usc_id
            });

            // Create notification for the vehicle owner
            try {
                const ownerUser = await executeQuery(
                    'SELECT id FROM users WHERE usc_id = ?',
                    [existingVehicle[0].usc_id]
                );

                if (ownerUser && ownerUser.length > 0) {
                    let notificationTitle, notificationMessage;
                    
                    // Determine notification content based on status change
                    if (stickerStatus === 'expired' && existingVehicle[0].sticker_status === 'renewal_requested') {
                        // Renewal request was rejected
                        notificationTitle = 'Sticker Renewal Rejected';
                        notificationMessage = stickerRejectionReason 
                            ? `Your renewal request for ${existingVehicle[0].plate_number} has been rejected. Reason: ${stickerRejectionReason}`
                            : `Your renewal request for ${existingVehicle[0].plate_number} has been rejected.`;
                    } else if (stickerStatus === 'renewed' && existingVehicle[0].sticker_status === 'renewal_requested') {
                        // Renewal request was approved
                        notificationTitle = 'Sticker Renewal Approved';
                        notificationMessage = `Your renewal request for ${existingVehicle[0].plate_number} has been approved. Your sticker is now renewed.`;
                    } else if (stickerStatus === 'expired') {
                        notificationTitle = 'Vehicle Sticker Expired';
                        notificationMessage = `Your vehicle sticker for ${existingVehicle[0].plate_number} has been marked as expired. Please renew your sticker.`;
                    } else if (stickerStatus === 'renewed') {
                        notificationTitle = 'Vehicle Sticker Renewed';
                        notificationMessage = `Your vehicle sticker for ${existingVehicle[0].plate_number} has been renewed successfully.`;
                    } else {
                        notificationTitle = 'Sticker Status Updated';
                        notificationMessage = `Your vehicle sticker status for ${existingVehicle[0].plate_number} has been updated to ${stickerStatus}.`;
                    }

                    await executeQuery(`
                        INSERT INTO notifications (
                            user_id,
                            type,
                            title,
                            message,
                            created_at
                        ) VALUES (?, ?, ?, ?, NOW())
                    `, [
                        ownerUser[0].id,
                        'sticker_status',
                        notificationTitle,
                        notificationMessage
                    ]);

                    // Emit notification event for real-time update
                    emit('notifications:new', {
                        userId: existingVehicle[0].usc_id,
                        title: notificationTitle,
                        message: notificationMessage,
                        type: 'sticker_status'
                    });
                }
            } catch (notificationError) {
                console.warn('Failed to create sticker status notification:', notificationError);
                // Don't fail the request if notification fails
            }
        }

        return Response.json({
            success: true,
            message: 'Vehicle updated successfully',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error('Update vehicle error:', error);
        return Response.json(
            { error: 'Failed to update vehicle. Please try again.' },
            { status: 500 }
        );
    }
}