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

            // Format dates for human readability
            const formatDate = (dateStr) => {
                if (!dateStr) return new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            };

            const formatDateTime = () => {
                return new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                });
            };

            // Get enhanced data for PDF
            const [userDetails, vehicleDetails, accessDetails, violationDetails] = await Promise.all([
                queryMany(`
                    SELECT u.designation, COUNT(*) as count 
                    FROM users u 
                    WHERE u.status = 'active' 
                    GROUP BY u.designation 
                    ORDER BY count DESC
                `),
                queryMany(`
                    SELECT v.vehicle_type, COUNT(*) as count 
                    FROM vehicles v 
                    GROUP BY v.vehicle_type 
                    ORDER BY count DESC
                `),
                queryMany(`
                    SELECT 
                        al.timestamp,
                        al.entry_type,
                        v.plate_number,
                        up.full_name as user_name
                    FROM access_logs al
                    JOIN vehicles v ON al.vehicle_id = v.vehicle_id
                    JOIN users u ON v.usc_id = u.usc_id
                    JOIN user_profiles up ON u.usc_id = up.usc_id
                    WHERE DATE(al.timestamp) BETWEEN ? AND ?
                    ORDER BY al.timestamp DESC
                    LIMIT 20
                `, [startDate, endDate]),
                queryMany(`
                    SELECT 
                        vi.created_at,
                        vt.name as violation_type,
                        vi.status,
                        v.plate_number,
                        up.full_name as violator_name
                    FROM violations vi
                    JOIN violation_types vt ON vi.violation_type_id = vt.id
                    JOIN vehicles v ON vi.vehicle_id = v.vehicle_id
                    JOIN users u ON v.usc_id = u.usc_id
                    JOIN user_profiles up ON u.usc_id = up.usc_id
                    WHERE DATE(vi.created_at) BETWEEN ? AND ?
                    ORDER BY vi.created_at DESC
                    LIMIT 10
                `, [startDate, endDate])
            ]);

            // Calculate summary statistics
            const totalUsers = data.find(d => d.metric === 'Total Users')?.value || 0;
            const totalVehicles = data.find(d => d.metric === 'Total Vehicles')?.value || 0;
            const periodAccessLogs = data.find(d => d.metric === 'Access Logs (Period)')?.value || 0;
            const periodViolations = data.find(d => d.metric === 'Violations (Period)')?.value || 0;

            const entriesCount = accessDetails.filter(log => log.entry_type === 'entry').length;
            const exitsCount = accessDetails.filter(log => log.entry_type === 'exit').length;

            // Calculate peak hours
            const entryHours = accessDetails
                .filter(log => log.entry_type === 'entry')
                .map(log => new Date(log.timestamp).getHours());
            const exitHours = accessDetails
                .filter(log => log.entry_type === 'exit')
                .map(log => new Date(log.timestamp).getHours());

            const peakEntryHour = entryHours.length > 0 
                ? entryHours.reduce((a, b, i, arr) => 
                    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                ) : 'N/A';

            const peakExitHour = exitHours.length > 0 
                ? exitHours.reduce((a, b, i, arr) => 
                    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                ) : 'N/A';

            // Create comprehensive HTML content for PDF
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>RFID Vehicle Management System - Overview Report</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            color: #333;
                            line-height: 1.6;
                            font-size: 12px;
                        }
                        
                        .header { 
                            text-align: center; 
                            margin-bottom: 30px;
                            border-bottom: 3px solid #355E3B;
                            padding-bottom: 20px;
                        }
                        
                        .header h1 { 
                            color: #355E3B; 
                            margin: 0 0 10px 0;
                            font-size: 24px;
                            font-weight: bold;
                        }
                        
                        .header h2 { 
                            color: #355E3B; 
                            margin: 0 0 15px 0;
                            font-size: 18px;
                            font-weight: normal;
                        }
                        
                        .meta-info { 
                            background: #f8f9fa; 
                            padding: 15px; 
                            border-radius: 8px;
                            margin-bottom: 25px;
                            border-left: 4px solid #FFD700;
                        }
                        
                        .meta-info .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 5px;
                        }
                        
                        .meta-info .info-row:last-child {
                            margin-bottom: 0;
                        }
                        
                        .summary { 
                            margin-bottom: 30px; 
                            background: #f9f9f9; 
                            padding: 20px; 
                            border-radius: 8px;
                            border: 1px solid #ddd;
                        }
                        
                        .summary h3 { 
                            color: #355E3B; 
                            margin: 0 0 15px 0;
                            font-size: 16px;
                            border-bottom: 2px solid #355E3B;
                            padding-bottom: 5px;
                        }
                        
                        .summary-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 15px;
                        }
                        
                        .summary-item {
                            display: flex;
                            justify-content: space-between;
                            padding: 8px 0;
                            border-bottom: 1px dotted #ccc;
                        }
                        
                        .summary-item .label {
                            font-weight: 600;
                            color: #555;
                        }
                        
                        .summary-item .value {
                            font-weight: bold;
                            color: #355E3B;
                        }
                        
                        .section { 
                            margin-bottom: 25px; 
                            page-break-inside: avoid;
                        }
                        
                        .section h3 { 
                            color: #355E3B; 
                            font-size: 16px;
                            margin: 0 0 15px 0;
                            padding: 10px 15px;
                            background: linear-gradient(90deg, #355E3B, #2d4f32);
                            color: white;
                            border-radius: 5px;
                        }
                        
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-top: 10px;
                            background: white;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        }
                        
                        th { 
                            background-color: #355E3B; 
                            color: white; 
                            padding: 12px 8px; 
                            text-align: left; 
                            font-size: 11px;
                            font-weight: 600;
                        }
                        
                        td { 
                            padding: 10px 8px; 
                            border-bottom: 1px solid #eee; 
                            font-size: 10px;
                            vertical-align: top;
                        }
                        
                        tr:nth-child(even) { 
                            background-color: #f8f9fa; 
                        }
                        
                        tr:hover { 
                            background-color: #e8f5e8; 
                        }
                        
                        .no-data {
                            text-align: center;
                            padding: 20px;
                            color: #666;
                            font-style: italic;
                        }
                        
                        .stats-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr 1fr;
                            gap: 15px;
                            margin-bottom: 20px;
                        }
                        
                        .stat-card {
                            background: white;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            padding: 15px;
                            text-align: center;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        
                        .stat-card .number {
                            font-size: 24px;
                            font-weight: bold;
                            color: #355E3B;
                            margin-bottom: 5px;
                        }
                        
                        .stat-card .label {
                            font-size: 11px;
                            color: #666;
                        }
                        
                        .footer {
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            text-align: center;
                            color: #666;
                            font-size: 10px;
                        }
                        
                        @media print {
                            body { margin: 0; }
                            .section { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>RFID Vehicle Management System</h1>
                        <h2>Overview Report</h2>
                    </div>
                    
                    <div class="meta-info">
                        <div class="info-row">
                            <strong>Generated:</strong>
                            <span>${formatDateTime()}</span>
                        </div>
                        <div class="info-row">
                            <strong>Date Range:</strong>
                            <span>${formatDate(startDate)} to ${formatDate(endDate)}</span>
                        </div>
                        <div class="info-row">
                            <strong>Report Type:</strong>
                            <span>System Overview</span>
                        </div>
                    </div>
                    
                    <div class="summary">
                        <h3>Summary Statistics</h3>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <span class="label">Total Users</span>
                                <span class="value">${totalUsers}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Total Vehicles</span>
                                <span class="value">${totalVehicles}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Period Access Logs</span>
                                <span class="value">${periodAccessLogs}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Period Violations</span>
                                <span class="value">${periodViolations}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Period Entries</span>
                                <span class="value">${entriesCount}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Period Exits</span>
                                <span class="value">${exitsCount}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Peak Entry Hour</span>
                                <span class="value">${peakEntryHour !== 'N/A' ? `${String(peakEntryHour).padStart(2, '0')}:00` : peakEntryHour}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Peak Exit Hour</span>
                                <span class="value">${peakExitHour !== 'N/A' ? `${String(peakExitHour).padStart(2, '0')}:00` : peakExitHour}</span>
                            </div>
                        </div>
                    </div>
            `;

            // Add Users Section
            htmlContent += `
                <div class="section">
                    <h3>Users</h3>
                    <div class="stats-grid">
            `;
            
            userDetails.forEach(user => {
                htmlContent += `
                    <div class="stat-card">
                        <div class="number">${user.count}</div>
                        <div class="label">${user.designation}</div>
                    </div>
                `;
            });

            htmlContent += `
                    </div>
                </div>
            `;

            // Add Vehicles Section
            htmlContent += `
                <div class="section">
                    <h3>Vehicles</h3>
                    <div class="stats-grid">
            `;
            
            vehicleDetails.forEach(vehicle => {
                htmlContent += `
                    <div class="stat-card">
                        <div class="number">${vehicle.count}</div>
                        <div class="label">${vehicle.vehicle_type}</div>
                    </div>
                `;
            });

            htmlContent += `
                    </div>
                </div>
            `;

            // Add Access Logs Section
            htmlContent += `
                <div class="section">
                    <h3>Access Logs (Period)</h3>
            `;

            if (accessDetails.length > 0) {
                htmlContent += `
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Type</th>
                                <th>Vehicle</th>
                                <th>User</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                accessDetails.forEach(log => {
                    const logDate = new Date(log.timestamp);
                    htmlContent += `
                        <tr>
                            <td>${logDate.toLocaleDateString()} ${logDate.toLocaleTimeString()}</td>
                            <td style="color: ${log.entry_type === 'entry' ? '#22c55e' : '#ef4444'}; font-weight: bold;">${log.entry_type.toUpperCase()}</td>
                            <td>${log.plate_number}</td>
                            <td>${log.user_name}</td>
                        </tr>
                    `;
                });

                htmlContent += `
                        </tbody>
                    </table>
                `;
            } else {
                htmlContent += `<div class="no-data">No access logs found in this period</div>`;
            }

            htmlContent += `</div>`;

            // Add Violations Section
            htmlContent += `
                <div class="section">
                    <h3>Violations (Period)</h3>
            `;

            if (violationDetails.length > 0) {
                htmlContent += `
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Violation Type</th>
                                <th>Vehicle</th>
                                <th>Violator</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                violationDetails.forEach(violation => {
                    const violationDate = new Date(violation.created_at);
                    htmlContent += `
                        <tr>
                            <td>${violationDate.toLocaleDateString()} ${violationDate.toLocaleTimeString()}</td>
                            <td>${violation.violation_type}</td>
                            <td>${violation.plate_number}</td>
                            <td>${violation.violator_name}</td>
                            <td style="color: ${violation.status === 'resolved' ? '#22c55e' : '#f59e0b'}; font-weight: bold;">${violation.status.toUpperCase()}</td>
                        </tr>
                    `;
                });

                htmlContent += `
                        </tbody>
                    </table>
                `;
            } else {
                htmlContent += `<div class="no-data">No violations found in this period</div>`;
            }

            htmlContent += `
                </div>
                
                <div class="footer">
                    <p>This report was generated by the RFID Vehicle Management System</p>
                    <p>For questions or concerns, please contact the system administrator</p>
                </div>
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
                landscape: false,
                margin: {
                    top: '15mm',
                    right: '15mm',
                    bottom: '15mm',
                    left: '15mm'
                },
                printBackground: true
            });

            await browser.close();

            return new Response(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="overview-report-${formatDate(startDate).replace(/[\s,]/g, '-')}-to-${formatDate(endDate).replace(/[\s,]/g, '-')}.pdf"`
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