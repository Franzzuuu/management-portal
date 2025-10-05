import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

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
        const { vehicleId, vehicleType, make, model, color, plateNumber, year } = vehicleData;

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