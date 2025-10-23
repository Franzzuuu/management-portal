// src/lib/pdf-exporter.js
import PDFDocument from 'pdfkit';
import { DateUtils, ColumnMappings } from './export-utils.js';

export class PDFExporter {
    constructor(reportType, options = {}) {
        this.reportType = reportType;
        this.options = options;
        this.doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `${reportType.toUpperCase()} Report`,
                Author: options.user || 'RFID Management System',
                Subject: `${reportType} Export`,
                Keywords: 'RFID, Vehicle, Management, Report'
            }
        });
        this.currentY = 50;
        this.pageHeight = 800;
        this.margin = 50;
    }

    // Add header with branding
    addHeader() {
        const doc = this.doc;

        // Background gradient for header
        const gradient = doc.linearGradient(50, 50, 550, 100);
        gradient.stop(0, '#355E3B');
        gradient.stop(1, '#2d4f32');

        doc.rect(50, 50, 500, 60)
            .fill(gradient);

        // Title
        doc.fill('#FFD700')
            .font('Helvetica-Bold')
            .fontSize(20)
            .text('RFID Vehicle Management System', 70, 70);

        // Subtitle
        doc.fontSize(14)
            .text(`${this.reportType.toUpperCase()} Report`, 70, 95);

        this.currentY = 130;
    }

    // Add report metadata
    addMetadata() {
        const doc = this.doc;
        const startY = this.currentY;

        doc.fill('#000000')
            .font('Helvetica-Bold')
            .fontSize(12)
            .text('Report Information', 50, this.currentY);

        this.currentY += 20;

        const metadata = [
            ['Generated:', DateUtils.toManilaTime(new Date())],
            ['Timezone:', 'Asia/Manila'],
            ['User:', this.options.anonymize ? 'Anonymous' : (this.options.user || 'Unknown')],
            ['Mode:', this.options.mode || 'view'],
            ['Anonymized:', this.options.anonymize ? 'Yes' : 'No']
        ];

        if (this.options.filters && Object.keys(this.options.filters).length > 0) {
            metadata.push(['Filters:', JSON.stringify(this.options.filters, null, 2)]);
        }

        doc.font('Helvetica')
            .fontSize(10);

        metadata.forEach(([key, value]) => {
            doc.text(`${key} ${value}`, 70, this.currentY);
            this.currentY += 15;
        });

        this.currentY += 10;
    }

    // Add summary statistics
    addSummary(summaryData) {
        if (!summaryData || Object.keys(summaryData).length === 0) return;

        const doc = this.doc;

        doc.fill('#355E3B')
            .font('Helvetica-Bold')
            .fontSize(14)
            .text('Summary Statistics', 50, this.currentY);

        this.currentY += 25;

        // Create a simple table for summary data
        const tableData = Object.entries(summaryData).map(([key, value]) => [
            key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            typeof value === 'number' ? value.toLocaleString() : String(value)
        ]);

        this.addTable(['Metric', 'Value'], tableData, { headerColor: '#FFD700' });
        this.currentY += 30;
    }

    // Add KPI cards for overview reports
    addKPICards(kpis) {
        if (!kpis || Object.keys(kpis).length === 0) return;

        const doc = this.doc;

        doc.fill('#355E3B')
            .font('Helvetica-Bold')
            .fontSize(14)
            .text('Key Performance Indicators', 50, this.currentY);

        this.currentY += 30;

        const cardWidth = 120;
        const cardHeight = 80;
        const cardsPerRow = 4;
        const spacing = 10;

        let cardIndex = 0;
        Object.entries(kpis).forEach(([key, value]) => {
            const col = cardIndex % cardsPerRow;
            const row = Math.floor(cardIndex / cardsPerRow);

            const x = 50 + col * (cardWidth + spacing);
            const y = this.currentY + row * (cardHeight + spacing);

            // Card background
            doc.rect(x, y, cardWidth, cardHeight)
                .stroke('#355E3B')
                .fillOpacity(0.1)
                .fill('#355E3B');

            // Card content
            doc.fillOpacity(1)
                .fill('#000000')
                .font('Helvetica-Bold')
                .fontSize(16)
                .text(typeof value === 'number' ? value.toLocaleString() : String(value),
                    x + 10, y + 15, { width: cardWidth - 20, align: 'center' });

            doc.font('Helvetica')
                .fontSize(9)
                .text(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    x + 5, y + 45, { width: cardWidth - 10, align: 'center' });

            cardIndex++;
        });

        const rows = Math.ceil(cardIndex / cardsPerRow);
        this.currentY += rows * (cardHeight + spacing) + 20;
    }

    // Add a data table (limited rows for PDF)
    addDataTable(data, columns, maxRows = 20) {
        if (!data || data.length === 0) {
            this.addText('No data available for the selected criteria.');
            return;
        }

        const doc = this.doc;
        const columnMappings = ColumnMappings[this.reportType] || {};

        // Prepare headers
        const headers = columns.map(col => {
            const mapping = columnMappings[col];
            return mapping?.label || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        });

        // Prepare data (limit rows for PDF)
        const tableData = data.slice(0, maxRows).map(row => {
            return columns.map(col => {
                let value = row[col];

                if (value === null || value === undefined) return '';

                // Format based on column type
                const mapping = columnMappings[col];
                if (mapping) {
                    switch (mapping.type) {
                        case 'datetime':
                            value = DateUtils.toManilaTime(new Date(value));
                            break;
                        case 'date':
                            value = new Date(value).toLocaleDateString();
                            break;
                        case 'boolean':
                            value = value ? 'Yes' : 'No';
                            break;
                        case 'number':
                            value = typeof value === 'number' ? value.toLocaleString() : value;
                            break;
                    }
                }

                // Truncate long strings
                const str = String(value);
                return str.length > 30 ? str.substring(0, 27) + '...' : str;
            });
        });

        // Add table
        this.addTable(headers, tableData, { fontSize: 8 });

        // Add note if data was truncated
        if (data.length > maxRows) {
            this.currentY += 10;
            doc.font('Helvetica')
                .fontSize(9)
                .fill('#666666')
                .text(`Note: Showing first ${maxRows} of ${data.length} records. Download full dataset for complete data.`,
                    50, this.currentY);
            this.currentY += 20;
        }
    }

    // Helper method to add a table
    addTable(headers, data, options = {}) {
        const doc = this.doc;
        const { fontSize = 10, headerColor = '#355E3B' } = options;

        const tableWidth = 500;
        const columnWidth = tableWidth / headers.length;
        const rowHeight = 20;

        // Check if we need a new page
        if (this.currentY + (data.length + 1) * rowHeight > this.pageHeight) {
            this.addPage();
        }

        const startY = this.currentY;
        let currentRowY = startY;

        // Draw headers
        headers.forEach((header, index) => {
            const x = 50 + index * columnWidth;

            // Header background
            doc.rect(x, currentRowY, columnWidth, rowHeight)
                .fill(headerColor);

            // Header text
            doc.fill('#FFFFFF')
                .font('Helvetica-Bold')
                .fontSize(fontSize)
                .text(header, x + 5, currentRowY + 6, {
                    width: columnWidth - 10,
                    ellipsis: true
                });
        });

        currentRowY += rowHeight;

        // Draw data rows
        data.forEach((row, rowIndex) => {
            const fillColor = rowIndex % 2 === 0 ? '#f9f9f9' : '#ffffff';

            row.forEach((cell, colIndex) => {
                const x = 50 + colIndex * columnWidth;

                // Cell background
                doc.rect(x, currentRowY, columnWidth, rowHeight)
                    .fill(fillColor)
                    .stroke('#dddddd');

                // Cell text
                doc.fill('#000000')
                    .font('Helvetica')
                    .fontSize(fontSize)
                    .text(String(cell), x + 5, currentRowY + 6, {
                        width: columnWidth - 10,
                        ellipsis: true
                    });
            });

            currentRowY += rowHeight;
        });

        this.currentY = currentRowY + 10;
    }

    // Add simple text
    addText(text, options = {}) {
        const { fontSize = 10, font = 'Helvetica', color = '#000000' } = options;

        this.doc.fill(color)
            .font(font)
            .fontSize(fontSize)
            .text(text, 50, this.currentY);

        this.currentY += fontSize + 5;
    }

    // Add a new page
    addPage() {
        this.doc.addPage();
        this.currentY = 50;
        this.addHeader();
    }

    // Add footer with metadata
    addFooter() {
        const doc = this.doc;
        const pageCount = doc.bufferedPageRange().count;

        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);

            // Footer background
            doc.rect(50, 750, 500, 30)
                .fill('#f5f5f5')
                .stroke('#dddddd');

            // Footer text
            doc.fill('#666666')
                .font('Helvetica')
                .fontSize(8)
                .text(`Generated on ${DateUtils.toManilaTime(new Date())} | RFID Management System | Page ${i + 1} of ${pageCount}`,
                    60, 760);
        }
    }

    // Generate the complete PDF
    async generatePDF(data, columns, summaryData = null, kpis = null) {
        return new Promise((resolve, reject) => {
            try {
                const chunks = [];

                this.doc.on('data', chunk => chunks.push(chunk));
                this.doc.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });

                // Build PDF content
                this.addHeader();
                this.addMetadata();

                if (kpis) {
                    this.addKPICards(kpis);
                }

                if (summaryData) {
                    this.addSummary(summaryData);
                }

                if (data && data.length > 0) {
                    this.addText('Data Sample:', { font: 'Helvetica-Bold', fontSize: 14, color: '#355E3B' });
                    this.currentY += 10;
                    this.addDataTable(data, columns);
                }

                this.addFooter();
                this.doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }
}

export default PDFExporter;