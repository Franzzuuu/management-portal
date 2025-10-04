import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'csv';
        const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

        // Get comprehensive data for export
        const [users, vehicles, accessLogs, violations] = await Promise.all([
            // Users data
            queryMany(`
        SELECT 
          u.id,
          u.email,
          u.designation,
          u.status,
          up.full_name,
          up.phone_number,
          up.gender,
          u.created_at
        FROM users u
        JOIN user_profiles up ON u.usc_id = up.usc_id
        ORDER BY u.created_at DESC
      `),

            // Vehicles data
            queryMany(`
        SELECT 
          v.*,
          up.full_name as owner_name,
          u.email as owner_email
        FROM vehicles v
        JOIN users u ON v.usc_id = u.usc_id
        JOIN user_profiles up ON u.usc_id = up.usc_id
        ORDER BY v.created_at DESC
      `),

            // Access logs
            queryMany(`
        SELECT 
          al.timestamp,
          al.entry_type,
          al.location,
          v.plate_number,
          v.make,
          v.model,
          up.full_name as user_name,
          u.designation
        FROM access_logs al
        JOIN vehicles v ON al.vehicle_id = v.vehicle_id
        JOIN users u ON v.usc_id = u.usc_id
        JOIN user_profiles up ON u.usc_id = up.usc_id
        WHERE DATE(al.timestamp) BETWEEN ? AND ?
        ORDER BY al.timestamp DESC
      `, [startDate, endDate]),

            // Violations
            queryMany(`
        SELECT 
          vi.created_at,
          vi.description,
          vi.status,
          vt.name as violation_type,
          v.plate_number,
          up.full_name as violator_name,
          reporter.full_name as reported_by
        FROM violations vi
        JOIN violation_types vt ON vi.violation_type_id = vt.id
        JOIN vehicles v ON vi.vehicle_id = v.vehicle_id
        JOIN users u ON v.usc_id = u.usc_id
        JOIN user_profiles up ON u.usc_id = up.usc_id
        JOIN users ru ON vi.reported_by = ru.id
        JOIN user_profiles reporter ON ru.usc_id = ru.usc_id
        WHERE DATE(vi.created_at) BETWEEN ? AND ?
        ORDER BY vi.created_at DESC
      `, [startDate, endDate])
        ]);

        if (type === 'csv') {
            // Generate CSV report
            let csvContent = '';

            // Summary section
            csvContent += 'RFID Vehicle Management System Report\n';
            csvContent += `Report Date: ${new Date().toLocaleDateString()}\n`;
            csvContent += `Date Range: ${startDate} to ${endDate}\n\n`;

            // Users summary
            csvContent += 'USERS SUMMARY\n';
            csvContent += 'ID,Full Name,Email,Designation,Status,Phone,Gender,Created Date\n';
            users.forEach(user => {
                csvContent += `${user.id},"${user.full_name}","${user.email}","${user.designation}","${user.status}","${user.phone_number || ''}","${user.gender || ''}","${new Date(user.created_at).toLocaleDateString()}"\n`;
            });

            csvContent += '\n\nVEHICLES SUMMARY\n';
            csvContent += 'ID,Owner Name,Owner Email,Vehicle Type,Make,Model,Color,Plate Number,Status,Registration Date\n';
            vehicles.forEach(vehicle => {
                csvContent += `${vehicle.id},"${vehicle.owner_name}","${vehicle.owner_email}","${vehicle.vehicle_type}","${vehicle.make}","${vehicle.model}","${vehicle.color}","${vehicle.plate_number}","${vehicle.approval_status}","${new Date(vehicle.registration_date).toLocaleDateString()}"\n`;
            });

            csvContent += '\n\nACCESS LOGS\n';
            csvContent += 'Date,Time,Entry Type,Location,Plate Number,Vehicle,User Name,Designation\n';
            accessLogs.forEach(log => {
                const date = new Date(log.timestamp);
                csvContent += `"${date.toLocaleDateString()}","${date.toLocaleTimeString()}","${log.entry_type}","${log.location}","${log.plate_number}","${log.make} ${log.model}","${log.user_name}","${log.designation}"\n`;
            });

            csvContent += '\n\nVIOLATIONS\n';
            csvContent += 'Date,Violation Type,Description,Violator Name,Plate Number,Status,Reported By\n';
            violations.forEach(violation => {
                csvContent += `"${new Date(violation.created_at).toLocaleDateString()}","${violation.violation_type}","${violation.description || ''}","${violation.violator_name}","${violation.plate_number}","${violation.status}","${violation.reported_by}"\n`;
            });

            return new Response(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="rfid-system-report-${startDate}-to-${endDate}.csv"`
                }
            });
        }

        // For other types (PDF), return JSON for now
        return Response.json({
            success: true,
            message: 'PDF export feature coming soon',
            data: {
                users: users.length,
                vehicles: vehicles.length,
                accessLogs: accessLogs.length,
                violations: violations.length
            }
        });

    } catch (error) {
        console.error('Export reports error:', error);
        return Response.json(
            { error: 'Failed to export report' },
            { status: 500 }
        );
    }
}