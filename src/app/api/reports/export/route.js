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
        const reportType = searchParams.get('reportType') || 'overview';
        const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

        // Get data based on report type
        let data, columns, summaryData;

        switch (reportType) {
            case 'users':
                data = await queryMany(`
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
                `);
                columns = ['id', 'full_name', 'email', 'designation', 'status', 'phone_number', 'gender', 'created_at'];
                summaryData = {
                    total_users: data.length,
                    students: data.filter(u => u.designation === 'Student').length,
                    faculty: data.filter(u => u.designation === 'Faculty').length,
                    staff: data.filter(u => u.designation === 'Staff').length,
                    active_users: data.filter(u => u.status === 'Active').length
                };
                break;

            case 'vehicles':
                data = await queryMany(`
                    SELECT 
                        v.*,
                        up.full_name as owner_name,
                        u.email as owner_email
                    FROM vehicles v
                    JOIN users u ON v.usc_id = u.usc_id
                    JOIN user_profiles up ON u.usc_id = up.usc_id
                    ORDER BY v.created_at DESC
                `);
                columns = ['vehicle_id', 'owner_name', 'owner_email', 'vehicle_type', 'make', 'model', 'color', 'plate_number', 'approval_status', 'registration_date'];
                summaryData = {
                    total_vehicles: data.length,
                    approved: data.filter(v => v.approval_status === 'Approved').length,
                    pending: data.filter(v => v.approval_status === 'Pending').length,
                    two_wheel: data.filter(v => v.vehicle_type === '2-Wheel').length,
                    four_wheel: data.filter(v => v.vehicle_type === '4-Wheel').length
                };
                break;

            case 'access':
                data = await queryMany(`
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
                `, [startDate, endDate]);
                columns = ['timestamp', 'entry_type', 'location', 'plate_number', 'make', 'model', 'user_name', 'designation'];
                summaryData = {
                    total_logs: data.length,
                    entries: data.filter(l => l.entry_type === 'entry').length,
                    exits: data.filter(l => l.entry_type === 'exit').length,
                    date_range: `${startDate} to ${endDate}`
                };
                break;

            case 'violations':
                data = await queryMany(`
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
                `, [startDate, endDate]);
                columns = ['created_at', 'violation_type', 'description', 'violator_name', 'plate_number', 'status', 'reported_by'];
                summaryData = {
                    total_violations: data.length,
                    pending: data.filter(v => v.status === 'Pending').length,
                    resolved: data.filter(v => v.status === 'Resolved').length,
                    date_range: `${startDate} to ${endDate}`
                };
                break;

            default: // overview
                const [users, vehicles, accessLogs, violations] = await Promise.all([
                    queryMany(`SELECT COUNT(*) as count FROM users`),
                    queryMany(`SELECT COUNT(*) as count FROM vehicles`),
                    queryMany(`SELECT COUNT(*) as count FROM access_logs WHERE DATE(timestamp) BETWEEN ? AND ?`, [startDate, endDate]),
                    queryMany(`SELECT COUNT(*) as count FROM violations WHERE DATE(created_at) BETWEEN ? AND ?`, [startDate, endDate])
                ]);

                data = [
                    { metric: 'Total Users', value: users[0].count },
                    { metric: 'Total Vehicles', value: vehicles[0].count },
                    { metric: 'Access Logs (Period)', value: accessLogs[0].count },
                    { metric: 'Violations (Period)', value: violations[0].count }
                ];
                columns = ['metric', 'value'];
                summaryData = {
                    report_period: `${startDate} to ${endDate}`,
                    generated_at: new Date().toISOString(),
                    total_users: users[0].count,
                    total_vehicles: vehicles[0].count,
                    period_access_logs: accessLogs[0].count,
                    period_violations: violations[0].count
                };
                break;
        }

        // Generate export based on type
        if (type === 'csv') {
            // Generate CSV report
            let csvContent = '';

            // Summary section
            csvContent += 'RFID Vehicle Management System Report\n';
            csvContent += `Report Type: ${reportType.toUpperCase()}\n`;
            csvContent += `Report Date: ${new Date().toLocaleDateString()}\n`;
            csvContent += `Date Range: ${startDate} to ${endDate}\n\n`;

            // Summary data
            if (summaryData) {
                csvContent += 'SUMMARY\n';
                Object.entries(summaryData).forEach(([key, value]) => {
                    csvContent += `${key.replace(/_/g, ' ').toUpperCase()},${value}\n`;
                });
                csvContent += '\n';
            }

            // Data section
            csvContent += 'DATA\n';
            csvContent += columns.map(col => col.replace(/_/g, ' ').toUpperCase()).join(',') + '\n';
            data.forEach(row => {
                csvContent += columns.map(col => {
                    let value = row[col];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',') + '\n';
            });

            return new Response(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${reportType}-report-${startDate}-to-${endDate}.csv"`
                }
            });
        }

        if (type === 'pdf') {
            // Use puppeteer to generate PDF from HTML
            const puppeteer = await import('puppeteer');

            // Create HTML content for PDF
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Report</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px; 
                            color: #333;
                        }
                        .header { 
                            text-align: center; 
                            color: #355E3B; 
                            margin-bottom: 30px;
                        }
                        .summary { 
                            margin-bottom: 30px; 
                            background: #f9f9f9; 
                            padding: 15px; 
                            border-radius: 5px;
                        }
                        .summary h3 { 
                            color: #355E3B; 
                            margin-top: 0;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-top: 20px;
                        }
                        th { 
                            background-color: #355E3B; 
                            color: white; 
                            padding: 10px; 
                            text-align: left; 
                            font-size: 12px;
                        }
                        td { 
                            padding: 8px; 
                            border-bottom: 1px solid #ddd; 
                            font-size: 11px;
                        }
                        tr:nth-child(even) { 
                            background-color: #f9f9f9; 
                        }
                        .meta { 
                            font-size: 12px; 
                            color: #666; 
                            margin-bottom: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>RFID Vehicle Management System</h1>
                        <h2>${reportType.toUpperCase()} REPORT</h2>
                    </div>
                    
                    <div class="meta">
                        <strong>Generated:</strong> ${new Date().toLocaleDateString()}<br>
                        <strong>Date Range:</strong> ${startDate} to ${endDate}
                    </div>
            `;

            // Add summary section
            if (summaryData) {
                htmlContent += `
                    <div class="summary">
                        <h3>Summary</h3>
                `;
                Object.entries(summaryData).forEach(([key, value]) => {
                    htmlContent += `<div><strong>${key.replace(/_/g, ' ').toUpperCase()}:</strong> ${value}</div>`;
                });
                htmlContent += `</div>`;
            }

            // Add data table
            if (data.length > 0) {
                htmlContent += `
                    <table>
                        <thead>
                            <tr>
                `;
                columns.forEach(col => {
                    htmlContent += `<th>${col.replace(/_/g, ' ').toUpperCase()}</th>`;
                });
                htmlContent += `
                            </tr>
                        </thead>
                        <tbody>
                `;

                data.slice(0, 100).forEach(row => { // Limit to 100 rows
                    htmlContent += '<tr>';
                    columns.forEach(col => {
                        let value = row[col];
                        if (value === null || value === undefined) value = '';
                        htmlContent += `<td>${String(value).substring(0, 50)}</td>`;
                    });
                    htmlContent += '</tr>';
                });

                htmlContent += `
                        </tbody>
                    </table>
                `;
            }

            htmlContent += `
                </body>
                </html>
            `;

            // Generate PDF using puppeteer
            const browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(htmlContent);

            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: true,
                margin: {
                    top: '20mm',
                    right: '10mm',
                    bottom: '20mm',
                    left: '10mm'
                }
            });

            await browser.close();

            return new Response(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${reportType}-report-${startDate}-to-${endDate}.pdf"`
                }
            });
        }

        // For other types, return error since they're not supported
        return Response.json({
            error: 'Only CSV and PDF exports are currently supported.'
        }, { status: 400 });
    } catch (error) {
        console.error('Export reports error:', error);
        return Response.json(
            { error: 'Failed to export report' },
            { status: 500 }
        );
    }
}