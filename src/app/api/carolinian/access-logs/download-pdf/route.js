import { NextResponse } from 'next/server';
import { getSession } from '@/lib/utils';
import { queryOne, queryMany } from '@/lib/database';
import { PDFExporter } from '@/lib/pdf-exporter';

export async function POST(request) {
    try {
        const session = await getSession();
        
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user details from database
        const userQuery = `
            SELECT u.usc_id, u.designation, up.full_name
            FROM users u
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            WHERE u.usc_id = ?
        `;
        const user = await queryOne(userQuery, [session.uscId]);
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Only allow carolinian users to access their own logs
        if (user.designation !== 'Student' && user.designation !== 'Faculty' && user.designation !== 'Staff') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { startDate, endDate } = await request.json();

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
        }

        // Fetch access logs for the logged-in user within the date range
        const query = `
            SELECT 
                al.timestamp,
                al.entry_type,
                COALESCE(al.gate_location, 'Main Gate') as gate_location,
                v.plate_number,
                v.make as vehicle_make,
                v.model as vehicle_model,
                v.color,
                v.year,
                up.full_name,
                v.usc_id
            FROM access_logs al
            JOIN vehicles v ON al.vehicle_id = v.vehicle_id
            JOIN users u ON v.usc_id = u.usc_id
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            WHERE v.usc_id = ? 
                AND DATE(al.timestamp) >= DATE(?) 
                AND DATE(al.timestamp) <= DATE(?)
            ORDER BY al.timestamp DESC
        `;

        const rows = await queryMany(query, [session.uscId, startDate, endDate]);

        // Prepare data for PDF generation
        const reportData = {
            title: 'Access Logs — My Vehicle Activity',
            subtitle: `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
            user: user.full_name || user.usc_id,
            generatedAt: new Date().toLocaleString(),
            data: rows.map(row => ({
                timestamp: row.timestamp,
                access_type: row.entry_type,
                gate_location: row.gate_location,
                plate_number: row.plate_number,
                vehicle_info: `${row.vehicle_make || ''} ${row.vehicle_model || ''} (${row.year || ''})`.trim(),
                full_name: row.full_name,
                color: row.color,
                status: 'Successful'
            }))
        };

        // Generate PDF using the new jsPDF exporter
        const pdfBuffer = await PDFExporter.createAccessLogsReport(reportData.data, {
            user: reportData.user,
            dateRange: `${startDate} to ${endDate}`,
            summary: {
                total_records: reportData.data.length,
                date_range: `${startDate} to ${endDate}`,
                generated_by: reportData.user
            }
        });

        // Return PDF as response
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="vehicle-access-logs-${startDate}-to-${endDate}.pdf"`
            }
        });

    } catch (error) {
        console.error('Error generating access logs PDF:', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF. Please try again.' }, 
            { status: 500 }
        );
    }
}